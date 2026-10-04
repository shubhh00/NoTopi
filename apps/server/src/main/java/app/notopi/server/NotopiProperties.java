package app.notopi.server;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code notopi.*} entries in application.properties. */
@ConfigurationProperties("notopi")
public record NotopiProperties(SerpApi serpapi, RateLimit rateLimit) {

	public record SerpApi(String key, String baseUrl) {
		public boolean hasKey() {
			return key != null && !key.isBlank();
		}
	}

	public record RateLimit(int perMinute) {
	}
}
