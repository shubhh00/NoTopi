package app.notopi.server.trending;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import app.notopi.server.NotopiProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class TrendingServiceTest {

	static final List<NewsArticle> ARTICLES = List.of(
			new NewsArticle("Fake e-challan messages can empty bank accounts", "The Tribune", "https://a.in/1", "10/01/2026"),
			new NewsArticle("Opposition calls SIR a scam", "India Today", "https://b.in/2", "10/02/2026"),
			new NewsArticle("Police warn of e-challan APK links on WhatsApp", "The Times of India", "https://c.in/3", "10/03/2026"));

	@TempDir
	Path dir;

	private TrendingService service(NewsCollector news, SummaryModels models) {
		var trending = new NotopiProperties.Trending(List.of("q"), dir.resolve("trending.json").toString(), "", false);
		var props = new NotopiProperties(null, null, null, null, trending);
		return new TrendingService(news, models, props, Clock.fixed(Instant.parse("2026-10-06T07:00:00Z"), ZoneOffset.UTC));
	}

	@Test
	void attachesCitedArticlesAndDropsBadEntries() {
		String reply = """
				{"scams": [
				  {"name": "Fake e-challan", "how_it_works": "A message about a traffic fine links to a fake payment page or app.",
				   "what_to_do": "Check fines only on echallan.parivahan.gov.in.", "articles": [1, 3, 3, 99]},
				  {"name": "No sources", "how_it_works": "x", "what_to_do": "y", "articles": []},
				  {"name": "", "how_it_works": "x", "what_to_do": "y", "articles": [2]}
				]}
				""";
		var scams = service(mock(NewsCollector.class), mock(SummaryModels.class)).parse(reply, ARTICLES);

		assertThat(scams).hasSize(1);
		assertThat(scams.get(0).name()).isEqualTo("Fake e-challan");
		assertThat(scams.get(0).sources()).extracting(NewsArticle::link).containsExactly("https://a.in/1", "https://c.in/3");
	}

	@Test
	void promptNumbersHeadlinesAndExcludesPolitics() {
		String prompt = TrendingService.prompt(ARTICLES);
		assertThat(prompt).contains("1. Fake e-challan messages", "3. Police warn of e-challan APK");
		assertThat(prompt).contains("Leave out: politics");
	}

	@Test
	void refreshSavesTheReportAndFallsBackToHeadlinesWithoutModels() throws Exception {
		NewsCollector news = mock(NewsCollector.class);
		when(news.collect(anyList())).thenReturn(ARTICLES);
		SummaryModels models = mock(SummaryModels.class);
		when(models.isConfigured()).thenReturn(false);

		TrendingService service = service(news, models);
		TrendingReport report = service.refresh();

		assertThat(report.scams()).isEmpty();
		assertThat(report.headlines()).hasSize(3);
		assertThat(Files.readString(dir.resolve("trending.json"))).contains("Fake e-challan messages");
		assertThat(service.isStale()).isFalse();
	}

	@Test
	void aFailingModelStillLeavesHeadlines() {
		NewsCollector news = mock(NewsCollector.class);
		when(news.collect(anyList())).thenReturn(ARTICLES);
		SummaryModels models = mock(SummaryModels.class);
		when(models.isConfigured()).thenReturn(true);
		when(models.generateJson(anyString())).thenThrow(new IllegalStateException("No summary model answered"));

		TrendingReport report = service(news, models).refresh();

		assertThat(report.scams()).isEmpty();
		assertThat(report.headlines()).isNotEmpty();
	}

	@Test
	void ordersByReportsThenNewestReport() {
		var older = new NewsArticle("a", "s", "https://x.in/1", "10/03/2026, 09:00 AM");
		var newer = new NewsArticle("b", "s", "https://x.in/2", "10/08/2026, 01:00 PM");
		var newest = new NewsArticle("c", "s", "https://x.in/3", "10/09/2026, 05:42 AM");
		var oneOld = new TrendingReport.TrendingScam("one, older", "h", "w", List.of(older));
		var oneNew = new TrendingReport.TrendingScam("one, newer", "h", "w", List.of(newer));
		var two = new TrendingReport.TrendingScam("two", "h", "w", List.of(older, newest));

		var sorted = new java.util.ArrayList<>(List.of(oneOld, oneNew, two));
		sorted.sort(TrendingService.BY_REPORTS_THEN_DATE);

		assertThat(sorted).extracting(TrendingReport.TrendingScam::name).containsExactly("two", "one, newer", "one, older");
		assertThat(TrendingService.sortableDate("10/09/2026, 05:42 PM")).isEqualTo("2026-10-09 17:42");
	}
}
