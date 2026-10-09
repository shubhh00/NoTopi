package app.notopi.server.trending;

import app.notopi.server.NotopiProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.json.JsonMapper;

/** Asks Gemini for a JSON answer, trying each configured model in turn when one is unavailable. */
@Component
public class GeminiClient {

	private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
	static final long RETRY_PAUSE_MS = 4_000;

	private final RestClient http;
	private final NotopiProperties.Gemini config;
	private final JsonMapper json = JsonMapper.builder().build();

	public GeminiClient(RestClient.Builder builder, NotopiProperties properties) {
		this.config = properties.gemini();
		this.http = builder.baseUrl(config.baseUrl()).build();
	}

	public boolean isConfigured() {
		return config.hasKey() && config.models() != null && !config.models().isEmpty();
	}

	/** The model's JSON reply as a string. Throws if no model answered. */
	public String generateJson(String prompt) {
		var body = Map.of(
				"contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
				"generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.2));
		RuntimeException last = null;
		for (String model : config.models()) {
			for (int attempt = 1; attempt <= 2; attempt++) {
				try {
					String reply = http.post()
							.uri(uri -> uri.path("/v1beta/" + model + ":generateContent").queryParam("key", config.key()).build())
							.contentType(MediaType.APPLICATION_JSON)
							.body(body)
							.retrieve()
							.body(String.class);
					String text = json.readTree(reply).path("candidates").path(0).path("content").path("parts").path(0)
							.path("text").asString("");
					if (!text.isBlank()) return text;
					last = new IllegalStateException(model + " returned no text");
					break;
				} catch (HttpStatusCodeException e) {
					log.warn("Gemini model {} attempt {} failed: {}", model, attempt, e.getStatusCode());
					last = e;
					// Overloaded (503) or rate-limited (429) is usually brief: wait and retry once.
					int code = e.getStatusCode().value();
					if ((code != 503 && code != 429) || attempt == 2) break;
					sleep(RETRY_PAUSE_MS);
				} catch (RestClientException e) {
					log.warn("Gemini model {} failed: {}", model, e.getMessage());
					last = e;
					break;
				}
			}
		}
		throw new IllegalStateException("No Gemini model answered", last);
	}

	private static void sleep(long ms) {
		try {
			Thread.sleep(ms);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}
}
