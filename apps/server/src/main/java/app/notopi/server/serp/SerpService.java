package app.notopi.server.serp;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * The shared cache. When many people check the same scam number, SerpApi is called once
 * and everyone else gets the stored result.
 */
@Service
public class SerpService {

	private final SerpApiClient client;

	public SerpService(SerpApiClient client) {
		this.client = client;
	}

	@Cacheable(cacheNames = "serp", key = "#query")
	public String search(SerpQuery query) {
		return client.search(query);
	}
}
