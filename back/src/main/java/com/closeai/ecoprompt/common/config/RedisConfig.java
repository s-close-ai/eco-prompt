package com.closeai.ecoprompt.common.config;

import com.closeai.ecoprompt.common.logging.AppLogger;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.repository.configuration.EnableRedisRepositories;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@EnableRedisRepositories(basePackages = "com.closeai.ecoprompt.**.repository.redis")
public class RedisConfig {

	private final RedisProperties redisProperties;

	public RedisConfig(RedisProperties redisProperties) {
		this.redisProperties = redisProperties;
	}

	@Bean
	public ObjectMapper objectMapper() {
		return new ObjectMapper()
				.findAndRegisterModules(); // JavaTime 등
	}

	@Bean
	public RedisConnectionFactory redisConnectionFactory() {
		RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
		config.setHostName(redisProperties.getHost());
		config.setPort(redisProperties.getPort());

		AppLogger.info(config.toString());

		if (redisProperties.getPassword() != null) {
			config.setPassword(redisProperties.getPassword());
		}

		return new LettuceConnectionFactory(config);
	}

	/** String 기반 간단 키-값 */
	@Bean
	public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory cf) {
		return new StringRedisTemplate(cf);
	}

	/** JSON <-> 객체 직렬화를 돕는 범용 템플릿 (선택) */
	@Bean
	public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory cf, ObjectMapper om) {
		RedisTemplate<String, Object> tpl = new RedisTemplate<>();
		tpl.setConnectionFactory(cf);

		// 키 직렬화기 (문자열 그대로)
		StringRedisSerializer keySer = new StringRedisSerializer();

        // 값 직렬화(Jackson)
		Jackson2JsonRedisSerializer<Object> valSer =
				new Jackson2JsonRedisSerializer<>(om, Object.class);

		tpl.setKeySerializer(keySer);
		tpl.setValueSerializer(valSer);
		tpl.setHashKeySerializer(keySer);
		tpl.setHashValueSerializer(valSer);

		tpl.afterPropertiesSet();
		return tpl;
	}
}
