package app.notopi.server.serp;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SerpController {

	/** What the app sends: the engine and parameters from the engine's planQueries(). */
	public record SerpRequest(@NotBlank String engine, @NotNull Map<String, String> params) {
	}

	private final SerpService service;

	public SerpController(SerpService service) {
		this.service = service;
	}

	@PostMapping(path = "/v1/serp", produces = MediaType.APPLICATION_JSON_VALUE)
	public String serp(@Valid @RequestBody SerpRequest request) {
		return service.search(SerpQuery.from(request.engine(), request.params()));
	}
}
