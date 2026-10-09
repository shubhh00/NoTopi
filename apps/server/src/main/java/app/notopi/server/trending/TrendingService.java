package app.notopi.server.trending;

import app.notopi.server.NotopiProperties;
import app.notopi.server.trending.TrendingReport.TrendingScam;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Builds the weekly "scams in the news" report: collect Indian scam news, then have a language model keep
 * only scams aimed at ordinary people and group them, citing the articles each one came from.
 */
@Service
public class TrendingService {

	private static final Logger log = LoggerFactory.getLogger(TrendingService.class);
	static final int MAX_SCAMS = 6;
	static final Duration STALE_AFTER = Duration.ofHours(20);

	private final NewsCollector news;
	private final SummaryModels models;
	private final NotopiProperties.Trending config;
	private final Clock clock;
	private final JsonMapper json = JsonMapper.builder().build();
	private final AtomicReference<TrendingReport> latest = new AtomicReference<>();

	@Autowired
	public TrendingService(NewsCollector news, SummaryModels models, NotopiProperties properties) {
		this(news, models, properties, Clock.systemUTC());
	}

	TrendingService(NewsCollector news, SummaryModels models, NotopiProperties properties, Clock clock) {
		this.news = news;
		this.models = models;
		this.config = properties.trending();
		this.clock = clock;
	}

	public Optional<TrendingReport> latest() {
		return Optional.ofNullable(latest.get());
	}

	/** On start, reuse the saved report; only refresh (and spend credits) if it's missing or stale. */
	@EventListener(ApplicationReadyEvent.class)
	public void loadSaved() {
		Path file = Path.of(config.file());
		if (Files.exists(file)) {
			try {
				latest.set(json.readValue(Files.readString(file), TrendingReport.class));
			} catch (IOException | RuntimeException e) {
				log.warn("Couldn't read saved trending report: {}", e.getMessage());
			}
		}
		log.info("Trending summary models: {}", models.isConfigured() ? models.describe() : "NONE (set GROQ_API_KEY or GEMINI_API_KEY)");
		if (config.refreshOnStart() && isStale()) CompletableFuture.runAsync(this::refreshQuietly);
	}

	/**
	 * Free model tiers are sometimes overloaded for a few minutes. If the last refresh found news but couldn't
	 * summarise it, try again from the saved headlines, which costs no SerpApi credits.
	 */
	@Scheduled(initialDelay = 5, fixedDelay = 30, timeUnit = TimeUnit.MINUTES)
	public void retryMissingSummary() {
		TrendingReport r = latest.get();
		if (r == null || !r.scams().isEmpty() || r.headlines().isEmpty() || !models.isConfigured()) return;
		List<TrendingScam> scams = summarise(r.headlines());
		if (scams.isEmpty()) return;
		TrendingReport updated = new TrendingReport(r.updatedAt(), scams, r.headlines());
		latest.set(updated);
		save(updated);
		log.info("Trending summary retried: {} scams", scams.size());
	}

	/** Every day at 7:00 India time. */
	@Scheduled(cron = "0 0 7 * * *", zone = "Asia/Kolkata")
	public void scheduledRefresh() {
		refreshQuietly();
	}

	boolean isStale() {
		TrendingReport r = latest.get();
		return r == null || r.updatedAt().isBefore(clock.instant().minus(STALE_AFTER));
	}

	private void refreshQuietly() {
		try {
			refresh();
		} catch (RuntimeException e) {
			log.warn("Trending refresh failed: {}", e.getMessage());
		}
	}

	public synchronized TrendingReport refresh() {
		List<NewsArticle> articles = news.collect(config.queries());
		List<TrendingScam> scams = articles.isEmpty() || !models.isConfigured()
				? List.of()
				: summarise(articles);
		TrendingReport report = new TrendingReport(clock.instant(), scams, articles);
		latest.set(report);
		save(report);
		log.info("Trending refreshed: {} articles, {} scams", articles.size(), scams.size());
		return report;
	}

	List<TrendingScam> summarise(List<NewsArticle> articles) {
		try {
			return parse(models.generateJson(prompt(articles)), articles);
		} catch (RuntimeException e) {
			// Without a summary the app still shows the raw headlines.
			log.warn("Couldn't summarise trending news: {}", e.getMessage());
			return List.of();
		}
	}

	static String prompt(List<NewsArticle> articles) {
		StringBuilder sb = new StringBuilder("""
				Below are numbered Indian news headlines from the last 7 days.

				Find scams that target ordinary people in India: fraud through messages, calls, apps, websites,
				social media or people pretending to be officials or companies.

				Leave out: politics and political allegations (for example claims that a government process
				is "a scam"), stories that only report arrests or busts without saying how the scam works,
				scams outside India, and general advice pieces that don't describe a specific scam.

				Group headlines about the same scam. Use only what the headlines say; don't add facts.
				For "what_to_do", give one specific action a person can take (for example: check fines only on
				the official e-challan site, don't install apps sent in messages, call 1930 if money was taken),
				not vague advice like "be careful".

				Reply with JSON only, in this shape:
				{"scams": [{"name": "2 to 5 word name", "how_it_works": "one plain sentence",
				            "what_to_do": "one plain sentence", "articles": [headline numbers]}]}

				At most 6 scams, the most widely reported first. If there are none, reply {"scams": []}.

				Headlines:
				""");
		for (int i = 0; i < articles.size(); i++) {
			NewsArticle a = articles.get(i);
			sb.append(i + 1).append(". ").append(a.title()).append(" (").append(a.source()).append(")\n");
		}
		return sb.toString();
	}

	/** Keeps only well-formed scams that cite real headline numbers, and attaches those articles as sources. */
	List<TrendingScam> parse(String reply, List<NewsArticle> articles) {
		List<TrendingScam> out = new ArrayList<>();
		for (JsonNode s : json.readTree(reply).path("scams")) {
			String name = s.path("name").asString("").trim();
			String how = s.path("how_it_works").asString("").trim();
			String what = s.path("what_to_do").asString("").trim();
			Set<Integer> numbers = new LinkedHashSet<>();
			for (JsonNode n : s.path("articles")) {
				int i = n.asInt(0);
				if (i >= 1 && i <= articles.size()) numbers.add(i);
			}
			if (name.isEmpty() || how.isEmpty() || what.isEmpty() || numbers.isEmpty()) continue;
			List<NewsArticle> sources = numbers.stream().map(i -> articles.get(i - 1)).limit(4).toList();
			out.add(new TrendingScam(name, how, what, sources));
			if (out.size() == MAX_SCAMS) break;
		}
		out.sort(BY_REPORTS_THEN_DATE);
		return out;
	}

	/** Most widely reported first; among equals, the most recent report first. */
	static final Comparator<TrendingScam> BY_REPORTS_THEN_DATE = Comparator
			.comparingInt((TrendingScam s) -> s.sources().size()).reversed()
			.thenComparing(TrendingService::newest, Comparator.reverseOrder());

	private static final Pattern NEWS_DATE = Pattern.compile("^(\\d{2})/(\\d{2})/(\\d{4})(?:, (\\d{1,2}):(\\d{2}) (AM|PM))?");

	/** "10/09/2026, 05:42 AM" → "2026-10-09 05:42", so dates compare as text. */
	static String sortableDate(String date) {
		Matcher m = NEWS_DATE.matcher(date == null ? "" : date);
		if (!m.find()) return "";
		int hour = m.group(4) == null ? 0 : Integer.parseInt(m.group(4)) % 12;
		if ("PM".equals(m.group(6))) hour += 12;
		return "%s-%s-%s %02d:%s".formatted(m.group(3), m.group(1), m.group(2), hour, m.group(5) == null ? "00" : m.group(5));
	}

	private static String newest(TrendingScam s) {
		return s.sources().stream().map(a -> sortableDate(a.date())).max(String::compareTo).orElse("");
	}

	private void save(TrendingReport report) {
		try {
			Path file = Path.of(config.file());
			if (file.getParent() != null) Files.createDirectories(file.getParent());
			Files.writeString(file, json.writeValueAsString(report));
		} catch (IOException | RuntimeException e) {
			log.warn("Couldn't save trending report: {}", e.getMessage());
		}
	}
}
