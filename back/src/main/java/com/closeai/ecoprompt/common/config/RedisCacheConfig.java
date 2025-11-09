package com.closeai.ecoprompt.common.config;


import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisCacheConfig {

    public static final String TODAY_TOP10_CACHE = "ranking:today";
    public static final String SNAPSHOT_CACHE    = "ranking:snapshot";

    @Bean
    public RedisCacheManager redisCacheManager(
            RedisConnectionFactory connectionFactory,
            ObjectMapper objectMapper
    ) {
        var valueSer = new GenericJackson2JsonRedisSerializer(/*objectMapper*/);

        RedisCacheConfiguration defaultConf = RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues()
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(valueSer)
                );

        Map<String, RedisCacheConfiguration> confMap = new HashMap<>();
        confMap.put(TODAY_TOP10_CACHE, defaultConf.entryTtl(Duration.ofMinutes(5)));                 // 오늘: 5분
        confMap.put(SNAPSHOT_CACHE,    defaultConf.entryTtl(Duration.ofDays(1).plusMinutes(5)));     // 스냅샷: 1일 5분

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConf)
                .withInitialCacheConfigurations(confMap)
                .build();
    }
}