package app.notopi.server.serp;

import java.util.Map;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * One SerpApi search, reduced to the engines and parameters NoTopi actually uses.
 * Parameters are kept sorted so two identical searches are equal and share a cache entry.
 */
public record SerpQuery(String engine, SortedMap<String, String> params) {

	/** Only the engines the app plans. Anything else is rejected so the server key can't be used for arbitrary searches. */
	static final Set<String> ENGINES = Set.of("google", "google_play_product");

	static final Set<String> PARAMS = Set.of(
			"q", "gl", "hl", "num", "product_id", "store", "all_reviews", "sort_by");

	static final int MAX_VALUE_LENGTH = 300;

	public SerpQuery {
		params = new TreeMap<>(params);
	}

	/** Validates what the app sent. Throws {@link IllegalArgumentException} with a message the app can show. */
	public static SerpQuery from(String engine, Map<String, String> params) {
		if (!ENGINES.contains(engine)) {
			throw new IllegalArgumentException("Engine not allowed: " + engine);
		}
		for (var entry : params.entrySet()) {
			if (!PARAMS.contains(entry.getKey())) {
				throw new IllegalArgumentException("Parameter not allowed: " + entry.getKey());
			}
			if (entry.getValue() == null || entry.getValue().length() > MAX_VALUE_LENGTH) {
				throw new IllegalArgumentException("Bad value for " + entry.getKey());
			}
		}
		return new SerpQuery(engine, new TreeMap<>(params));
	}
}
