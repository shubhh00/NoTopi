package app.notopi.server;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "notopi.trending.refresh-on-start=false")
class ServerApplicationTests {

	@Test
	void contextLoads() {
	}

}
