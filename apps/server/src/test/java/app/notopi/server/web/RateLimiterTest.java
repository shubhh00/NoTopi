package app.notopi.server.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

	@Test
	void allowsUpToTheLimitThenBlocks() {
		var limiter = new RateLimiter(3, Clock.fixed(Instant.parse("2026-10-04T10:00:10Z"), ZoneOffset.UTC));
		assertThat(limiter.tryAcquire("a")).isTrue();
		assertThat(limiter.tryAcquire("a")).isTrue();
		assertThat(limiter.tryAcquire("a")).isTrue();
		assertThat(limiter.tryAcquire("a")).isFalse();
		assertThat(limiter.tryAcquire("b")).as("other clients have their own budget").isTrue();
	}

	@Test
	void resetsInTheNextMinute() {
		var t = Instant.parse("2026-10-04T10:00:59Z");
		var limiter = new RateLimiter(1, Clock.fixed(t, ZoneOffset.UTC));
		assertThat(limiter.tryAcquire("a")).isTrue();
		assertThat(limiter.tryAcquire("a")).isFalse();

		var nextMinute = new RateLimiter(1, Clock.fixed(t.plusSeconds(2), ZoneOffset.UTC));
		assertThat(nextMinute.tryAcquire("a")).isTrue();
	}
}
