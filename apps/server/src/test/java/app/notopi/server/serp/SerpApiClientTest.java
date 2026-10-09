package app.notopi.server.serp;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import app.notopi.server.NotopiProperties;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SerpApiClientTest {

	private final NotopiProperties properties =
			new NotopiProperties(new NotopiProperties.SerpApi("test-key", "https://serpapi.com"), null, null, null, null);

	@Test
	void encodesPlusSignsSoPhoneNumbersReachGoogleIntact() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		// A bare "+" in a query string means a space, so "+91..." must arrive as "%2B91...".
		server.expect(requestTo(allOf(
						containsString("q=%22%2B919395197425%22%20OR%20%229395197425%22"),
						containsString("engine=google"),
						containsString("api_key=test-key"))))
				.andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

		new SerpApiClient(builder, properties)
				.search(SerpQuery.from("google", Map.of("q", "\"+919395197425\" OR \"9395197425\"", "gl", "in")));

		server.verify();
	}
}
