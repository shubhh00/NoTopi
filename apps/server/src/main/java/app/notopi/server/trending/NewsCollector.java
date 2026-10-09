package app.notopi.server.trending;

import app.notopi.server.serp.SerpQuery;
import app.notopi.server.serp.SerpService;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Runs the trending searches on Google News and keeps this week's Indian stories.
 * Google News ignores the country setting for many results, so stories are filtered to
 * Indian publishers here.
 */
@Component
public class NewsCollector {

	/** Most Indian outlets publish on .in domains; these well-known ones don't. */
	static final Set<String> INDIAN_PUBLISHERS = Set.of(
			"the times of india", "the hindu", "hindustan times", "the indian express", "indianexpress.com",
			"ndtv", "india today", "moneycontrol", "moneycontrol.com", "the420.in", "rediff", "the tribune",
			"newsmeter", "deccan herald", "deccan chronicle", "news18", "mint", "livemint", "the economic times",
			"business standard", "bhaskar english", "dainik bhaskar", "dainik jagran", "amar ujala", "ani news",
			"press trust of india", "the news minute", "scroll.in", "theprint", "udayavani", "etv bharat",
			"free press journal", "mid-day", "telangana today", "the new indian express", "zee news",
			"financial express", "the statesman", "outlook india", "the quint", "firstpost", "the news now");

	static final int MAX_ARTICLES = 40;

	private final SerpService serp;
	private final JsonMapper json = JsonMapper.builder().build();

	public NewsCollector(SerpService serp) {
		this.serp = serp;
	}

	public List<NewsArticle> collect(List<String> queries) {
		Map<String, NewsArticle> byTitle = new LinkedHashMap<>();
		for (String q : queries) {
			String body = serp.search(SerpQuery.from("google_news", Map.of("q", q, "gl", "in", "hl", "en")));
			for (NewsArticle a : parse(body)) {
				if (isIndian(a)) {
					byTitle.putIfAbsent(normalise(a.title()), a);
				}
			}
		}
		return byTitle.values().stream().limit(MAX_ARTICLES).toList();
	}

	/** Google News nests related coverage under "stories"; this flattens it. */
	List<NewsArticle> parse(String body) {
		List<NewsArticle> out = new ArrayList<>();
		for (JsonNode r : json.readTree(body).path("news_results")) {
			if (r.path("stories").isArray()) {
				for (JsonNode s : r.path("stories")) out.add(article(s));
			} else {
				out.add(article(r));
			}
		}
		return out.stream().filter(a -> !a.title().isBlank() && !a.link().isBlank()).toList();
	}

	private static NewsArticle article(JsonNode r) {
		return new NewsArticle(
				r.path("title").asString(""),
				r.path("source").path("name").asString(""),
				r.path("link").asString(""),
				r.path("date").asString(""));
	}

	static boolean isIndian(NewsArticle a) {
		if (INDIAN_PUBLISHERS.contains(a.source().toLowerCase(Locale.ROOT))) return true;
		try {
			String host = URI.create(a.link()).getHost();
			return host != null && host.toLowerCase(Locale.ROOT).endsWith(".in");
		} catch (IllegalArgumentException e) {
			return false;
		}
	}

	/** The same story syndicated by several outlets usually keeps its headline. */
	private static String normalise(String title) {
		return title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
	}
}
