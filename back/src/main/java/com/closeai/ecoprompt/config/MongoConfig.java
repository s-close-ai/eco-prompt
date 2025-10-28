package com.closeai.ecoprompt.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.closeai.ecoprompt.**.repository.mongo")
public class MongoConfig {
}
