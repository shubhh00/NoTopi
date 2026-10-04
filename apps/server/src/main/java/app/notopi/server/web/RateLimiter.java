package app.notopi.server.web;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window limiter: each client gets {@code perMinute} requests per clock minute.
 * Counters live in a Caffeine cache that forgets idle clients, so memory doesn't grow forever.
 */
public class RateLimiter {

	private record Window(long minute, AtomicInteger count) {
	}

	private final int perMinute;
	private final Clock clock;
	private final Cache<String, Window> windows = Caffeine.newBuilder()
			.expireAfterAccess(Duration.ofMinutes(2))
			.maximumSize(100_000)
			.build();

	public RateLimiter(int perMinute, Clock clock) {
		this.perMinute = perMinute;
		this.clock = clock;
	}

	/** True if this request is allowed. */
	public boolean tryAcquire(String clientId) {
		long minute = clock.millis() / 60_000;
		Window window = windows.asMap().compute(clientId, (id, w) ->
				w == null || w.minute() != minute ? new Window(minute, new AtomicInteger()) : w);
		return window.count().incrementAndGet() <= perMinute;
	}
}
