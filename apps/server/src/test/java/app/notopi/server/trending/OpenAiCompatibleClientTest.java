package app.notopi.server.trending;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import app.notopi.server.NotopiProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class OpenAiCompatibleClientTest {

	private static final String REPLY = """
			{"choices": [{"message": {"role": "assistant", "content": "{\\"scams\\": []}"}}]}
			""";

	private final NotopiProperties.LlmProvider groq = new NotopiProperties.LlmProvider(
			"groq", "https://api.groq.com/openai/v1", "test-key", List.of("model-a", "model-b"));

	@Test
	void fallsThroughToTheNextModelWhenOneIsOverloaded() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
				.andExpect(header("Authorization", "Bearer test-key"))
				.andExpect(content().string(org.hamcrest.Matchers.containsString("\"model\":\"model-a\"")))
				.andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
		server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
				.andExpect(content().string(org.hamcrest.Matchers.containsString("\"model\":\"model-b\"")))
				.andRespond(withSuccess(REPLY, MediaType.APPLICATION_JSON));

		String json = new OpenAiCompatibleClient(builder, groq).generateJson("prompt");

		assertThat(json).isEqualTo("{\"scams\": []}");
		server.verify();
	}

	@Test
	void throwsWhenEveryModelFails() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions")).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
		server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions")).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

		assertThatThrownBy(() -> new OpenAiCompatibleClient(builder, groq).generateJson("prompt"))
				.hasMessageContaining("groq: no model answered");
	}

	@Test
	void aProviderWithoutAKeyIsSkipped() {
		var noKey = new NotopiProperties.LlmProvider("second", "https://openrouter.ai/api/v1", "", List.of("x"));
		assertThat(new OpenAiCompatibleClient(RestClient.builder(), noKey).isConfigured()).isFalse();
	}
}
