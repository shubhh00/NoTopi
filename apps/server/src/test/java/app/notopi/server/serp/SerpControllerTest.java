package app.notopi.server.serp;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "notopi.rate-limit.per-minute=5")
@AutoConfigureMockMvc
class SerpControllerTest {

	@Autowired
	MockMvc mvc;

	@MockitoBean
	SerpApiClient client;

	private static final String BODY = """
			{"engine": "google", "params": {"q": "\\"98765 43210\\"", "gl": "in"}}
			""";

	@Test
	void returnsSerpApiJsonAndCachesRepeats() throws Exception {
		when(client.search(any())).thenReturn("{\"organic_results\":[]}");

		for (int i = 0; i < 2; i++) {
			mvc.perform(post("/v1/serp").header("X-Device-Id", "cache-test").contentType(MediaType.APPLICATION_JSON).content(BODY))
					.andExpect(status().isOk())
					.andExpect(content().json("{\"organic_results\":[]}"));
		}
		verify(client, times(1)).search(any());
	}

	@Test
	void rejectsEnginesTheAppNeverUses() throws Exception {
		mvc.perform(post("/v1/serp").header("X-Device-Id", "engine-test").contentType(MediaType.APPLICATION_JSON)
						.content("{\"engine\": \"bing\", \"params\": {\"q\": \"x\"}}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error").value("Engine not allowed: bing"));
	}

	@Test
	void rateLimitsEachDevice() throws Exception {
		when(client.search(any())).thenReturn("{}");
		for (int i = 0; i < 5; i++) {
			mvc.perform(post("/v1/serp").header("X-Device-Id", "busy").contentType(MediaType.APPLICATION_JSON).content(BODY))
					.andExpect(status().isOk());
		}
		mvc.perform(post("/v1/serp").header("X-Device-Id", "busy").contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isTooManyRequests());
	}
}
