package app.notopi.server.trending;

import app.notopi.server.NotopiProperties;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * The language models used to summarise the news, in order of preference: the OpenAI-compatible
 * providers as configured (Groq first), then Gemini. Free tiers are often busy, so having several
 * independent providers means one being overloaded doesn't stop the feed.
 */
@Component
public class SummaryModels {

	private static final Logger log = LoggerFactory.getLogger(SummaryModels.class);

	private final List<OpenAiCompatibleClient> providers = new ArrayList<>();
	private final GeminiClient gemini;

	public SummaryModels(RestClient.Builder builder, NotopiProperties properties, GeminiClient gemini) {
		this.gemini = gemini;
		if (properties.llm() != null && properties.llm().providers() != null) {
			for (var p : properties.llm().providers()) {
				var client = new OpenAiCompatibleClient(builder, p);
				if (client.isConfigured()) providers.add(client);
			}
		}
	}

	public boolean isConfigured() {
		return !providers.isEmpty() || gemini.isConfigured();
	}

	/** Names of the providers that will be tried, for the startup log. */
	public List<String> describe() {
		List<String> names = new ArrayList<>(providers.stream().map(OpenAiCompatibleClient::name).toList());
		if (gemini.isConfigured()) names.add("gemini");
		return names;
	}

	public String generateJson(String prompt) {
		RuntimeException last = null;
		for (var p : providers) {
			try {
				return p.generateJson(prompt);
			} catch (RuntimeException e) {
				log.warn("Summary provider {} failed, trying the next", p.name());
				last = e;
			}
		}
		if (gemini.isConfigured()) return gemini.generateJson(prompt);
		throw new IllegalStateException("No summary model answered", last);
	}
}
