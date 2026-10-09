package app.notopi.server.trending;

import java.time.Instant;
import java.util.List;

/**
 * What the app shows under "This week".
 *
 * @param scams     named scams, each backed by at least one news article
 * @param headlines the raw Indian scam headlines, shown when no summary could be made
 */
public record TrendingReport(Instant updatedAt, List<TrendingScam> scams, List<NewsArticle> headlines) {

	public record TrendingScam(String name, String howItWorks, String whatToDo, List<NewsArticle> sources) {
	}
}
