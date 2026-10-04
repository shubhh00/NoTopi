package app.notopi.server.serp;

import app.notopi.server.NotopiProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/** Calls SerpApi with the server's key. Returns the raw JSON; the app's engine does the parsing. */
@Component
public class SerpApiClient {

	private final RestClient http;
	private final NotopiProperties.SerpApi config;

	public SerpApiClient(RestClient.Builder builder, NotopiProperties properties) {
		this.config = properties.serpapi();
		this.http = builder.baseUrl(config.baseUrl()).build();
	}

	public String search(SerpQuery query) {
		if (!config.hasKey()) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Server has no SerpApi key (set SERPAPI_KEY)");
		}
		try {
			return http.get()
					.uri(uri -> {
						var b = uri.path("/search.json").queryParam("engine", query.engine());
						query.params().forEach(b::queryParam);
						return b.queryParam("api_key", config.key()).build();
					})
					.retrieve()
					.body(String.class);
		} catch (RestClientResponseException e) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "SerpApi returned " + e.getStatusCode().value());
		}
	}
}
