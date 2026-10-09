package app.notopi.server.trending;

/** One news story about a scam, as shown in the app's sources list. */
public record NewsArticle(String title, String source, String link, String date) {
}
