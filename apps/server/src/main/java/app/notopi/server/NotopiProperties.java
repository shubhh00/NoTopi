package app.notopi.server;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code notopi.*} entries in application.properties. */
@ConfigurationProperties("notopi")
public record NotopiProperties(SerpApi serpapi, RateLimit rateLimit, Llm llm, Gemini gemini, Trending trending) {

	public record SerpApi(String key, String baseUrl) {
		public boolean hasKey() {
			return key != null && !key.isBlank();
		}
	}

	public record RateLimit(int perMinute) {
	}

	/** OpenAI-compatible providers for the news summary, tried in order before Gemini. */
	public record Llm(List<LlmProvider> providers) {
	}

	public record LlmProvider(String name, String baseUrl, String key, List<String> models) {
		public boolean hasKey() {
			return key != null && !key.isBlank();
		}
	}

	/** Gemini is only used to filter and summarise news for the trending feed, never for verdicts. */
	public record Gemini(String key, String baseUrl, List<String> models) {
		public boolean hasKey() {
			return key != null && !key.isBlank();
		}
	}

	/**
	 * @param queries      Google News searches run on each refresh (each costs one SerpApi credit)
	 * @param file         where the last report is saved, so a restart doesn't spend credits again
	 * @param refreshToken lets an operator trigger a refresh by hand; blank disables that endpoint
	 * @param refreshOnStart refresh at startup when the saved report is missing or stale
	 */
	public record Trending(List<String> queries, String file, String refreshToken, boolean refreshOnStart) {
	}
}
