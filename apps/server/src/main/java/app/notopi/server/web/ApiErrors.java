package app.notopi.server.web;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** Turns exceptions into small JSON errors, e.g. {"error": "Engine not allowed: bing"}. */
@RestControllerAdvice
public class ApiErrors {

	@ExceptionHandler(IllegalArgumentException.class)
	ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
		return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
		return ResponseEntity.badRequest().body(Map.of("error", "engine and params are required"));
	}

	@ExceptionHandler(ResponseStatusException.class)
	ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
		String reason = e.getReason() != null ? e.getReason() : HttpStatus.valueOf(e.getStatusCode().value()).getReasonPhrase();
		return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", reason));
	}
}
