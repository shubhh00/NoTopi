package app.notopi.server.trending;

import app.notopi.server.NotopiProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Any provider that speaks the OpenAI chat-completions API (Groq, OpenRouter, OpenAI itself):
 * POST {baseUrl}/chat/completions with a Bearer key. Each configured model is tried in turn.
 */
public class OpenAiCompatibleClient {

	private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleClient.class);

	private final NotopiProperties.LlmProvider config;
	private final RestClient http;
	private final JsonMapper json = JsonMapper.builder().build();

	public OpenAiCompatibleClient(RestClient.Builder builder, NotopiProperties.LlmProvider config) {
		this.config = config;
		this.http = builder.clone().baseUrl(config.baseUrl()).build();
	}

	public String name() {
		return config.name();
	}

	public boolean isConfigured() {
		return config.hasKey() && config.models() != null && !config.models().isEmpty();
	}

	/** The model's JSON reply as a string. Throws if none of this provider's models answered. */
	public String generateJson(String prompt) {
		RuntimeException last = null;
		for (String model : config.models()) {
			var body = Map.of(
					"model", model,
					"messages", List.of(Map.of("role", "user", "content", prompt)),
					"temperature", 0.2,
					"response_format", Map.of("type", "json_object"));
			try {
				String reply = http.post()
						.uri("/chat/completions")
						.header("Authorization", "Bearer " + config.key())
						.contentType(MediaType.APPLICATION_JSON)
						.body(body)
						.retrieve()
						.body(String.class);
				String text = json.readTree(reply).path("choices").path(0).path("message").path("content").asString("");
				if (!text.isBlank()) return text;
				last = new IllegalStateException(config.name() + " " + model + " returned no text");
			} catch (HttpStatusCodeException e) {
				log.warn("{} model {} failed: {}", config.name(), model, e.getStatusCode());
				last = e;
			} catch (RestClientException e) {
				log.warn("{} model {} failed: {}", config.name(), model, e.getMessage());
				last = e;
			}
		}
		throw new IllegalStateException(config.name() + ": no model answered", last);
	}
}
