package com.closeai.ecoprompt.common.config;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import com.closeai.ecoprompt.common.CustomUtil;

@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.closeai.ecoprompt.**.repository.mongo")
public class MongoConfig {

	@Bean
	public MongoCustomConversions mongoCustomConversions() {
		return new MongoCustomConversions(List.of(
				new LocalDateTimeToStringConverter(),
				new StringToLocalDateTimeConverter()
		));
	}

	private static class LocalDateTimeToStringConverter implements Converter<LocalDateTime, String> {
		@Override
		public String convert(LocalDateTime localDateTime) {
			if (localDateTime == null) return null;
			return CustomUtil.dateConverter(localDateTime);
		}
	}

	private static class StringToLocalDateTimeConverter implements Converter<String, LocalDateTime> {
		@Override
		public LocalDateTime convert(String source) {
			if (source == null) return null;
			DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss");
			return LocalDateTime.parse(source, formatter);
		}
	}
}
