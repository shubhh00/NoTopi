package app.notopi.server.trending;

import app.notopi.server.NotopiProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class TrendingController {

	private final TrendingService service;
	private final String refreshToken;

	public TrendingController(TrendingService service, NotopiProperties properties) {
		this.service = service;
		this.refreshToken = properties.trending().refreshToken();
	}

	/** The latest report, or 204 before the first one is ready. */
	@GetMapping("/v1/trending")
	public ResponseEntity<TrendingReport> trending() {
		return service.latest().map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
	}

	/** Refresh now instead of waiting for 7:00. Spends SerpApi credits, so it needs the operator's token. */
	@PostMapping("/v1/trending/refresh")
	public TrendingReport refresh(@RequestHeader(name = "X-Refresh-Token", required = false) String token) {
		if (refreshToken == null || refreshToken.isBlank() || !refreshToken.equals(token)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Refreshing needs the operator token");
		}
		return service.refresh();
	}
}
