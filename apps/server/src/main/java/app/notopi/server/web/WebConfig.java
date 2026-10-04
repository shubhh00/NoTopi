package app.notopi.server.web;

import app.notopi.server.NotopiProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	/** Anonymous id the app generates once per install. Falls back to the caller's IP. */
	static final String DEVICE_HEADER = "X-Device-Id";

	private final RateLimiter limiter;

	public WebConfig(NotopiProperties properties) {
		this.limiter = new RateLimiter(properties.rateLimit().perMinute(), Clock.systemUTC());
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(new HandlerInterceptor() {
			@Override
			public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
				String device = request.getHeader(DEVICE_HEADER);
				String clientId = device != null && !device.isBlank() ? device : request.getRemoteAddr();
				if (limiter.tryAcquire(clientId)) {
					return true;
				}
				response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
				return false;
			}
		}).addPathPatterns("/v1/**");
	}
}
