package app.notopi.server.trending;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import app.notopi.server.serp.SerpService;
import java.util.List;
import org.junit.jupiter.api.Test;

class NewsCollectorTest {

	// Shaped like a SerpApi google_news response: a top-level story and a group of related "stories".
	static final String NEWS = """
			{"news_results": [
			  {"title": "Fake e-challan messages can empty bank accounts", "source": {"name": "The Tribune"},
			   "link": "https://www.tribuneindia.com/news/x", "date": "10/01/2026"},
			  {"title": "Kingston Police warn residents of ongoing bank scams", "source": {"name": "Kingston Whig"},
			   "link": "https://www.thewhig.com/x", "date": "10/01/2026"},
			  {"stories": [
			    {"title": "Rajasthan Police warns public against India Post address-update scam", "source": {"name": "thehawk.in"},
			     "link": "https://www.thehawk.in/x", "date": "10/01/2026"},
			    {"title": "Fake e-challan messages can empty bank accounts!", "source": {"name": "NewsMeter"},
			     "link": "https://newsmeter.in/x", "date": "10/02/2026"}
			  ]}
			]}
			""";

	@Test
	void keepsIndianStoriesAndDropsRepeats() {
		SerpService serp = mock(SerpService.class);
		when(serp.search(any())).thenReturn(NEWS);

		List<NewsArticle> articles = new NewsCollector(serp).collect(List.of("q1", "q2"));

		assertThat(articles).extracting(NewsArticle::title).containsExactly(
				"Fake e-challan messages can empty bank accounts",
				"Rajasthan Police warns public against India Post address-update scam");
	}

	@Test
	void recognisesIndianPublishersWithoutInDomains() {
		assertThat(NewsCollector.isIndian(new NewsArticle("t", "The Times of India", "https://timesofindia.indiatimes.com/x", "")))
				.isTrue();
		assertThat(NewsCollector.isIndian(new NewsArticle("t", "Rediff", "https://www.rediff.com/x", ""))).isTrue();
		assertThat(NewsCollector.isIndian(new NewsArticle("t", "KATV", "https://katv.com/x", ""))).isFalse();
	}
}
