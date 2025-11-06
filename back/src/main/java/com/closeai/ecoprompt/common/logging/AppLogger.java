package com.closeai.ecoprompt.common.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class AppLogger {

	private static final Logger logger = LoggerFactory.getLogger(AppLogger.class);
	// private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

	/**
	 * 기본 정보 로그
	 */
	public static void info(String message) {
		logger.info("[INFO] {}", message);
	}

	/**
	 * 클래스명과 함께 정보 로그
	 */
	public static void info(Class<?> clazz, String message) {
		logger.info("[INFO] [{}] {}", clazz.getSimpleName(), message);
	}

	/**
	 * 클래스명과 상세 정보가 포함된 정보 로그
	 */
	public static void info(Class<?> clazz, String message, Object... details) {
		StringBuilder detailStr = new StringBuilder();
		for (int i = 0; i < details.length; i += 2) {
			if (i + 1 < details.length) {
				detailStr.append(String.format(" %s=%s", details[i], details[i + 1]));
			}
		}
		logger.info("[INFO] [{}] {} {}", clazz.getSimpleName(), message, detailStr.toString());
	}

	/**
	 * 사용자 ID와 함께 정보 로그
	 */
	public static void info(String message, Integer userId) {
		logger.info("[INFO] [USER:{}] {}", userId, message);
	}

	/**
	 * 작업명과 함께 정보 로그
	 */
	public static void info(String operation, String message) {
		logger.info("[INFO] [{}] {}", operation, message);
	}

	/**
	 * 상세 정보가 포함된 로그
	 */
	public static void info(String operation, String message, Object... details) {
		StringBuilder detailStr = new StringBuilder();
		for (int i = 0; i < details.length; i += 2) {
			if (i + 1 < details.length) {
				detailStr.append(String.format(" %s=%s", details[i], details[i + 1]));
			}
		}
		logger.info("[INFO] [{}] {} {}", operation, message, detailStr.toString());
	}

	/**
	 * 경고 로그
	 */
	public static void warn(String message) {
		logger.warn("[WARN] {}", message);
	}

	public static void warn(String operation, String message) {
		logger.warn("[WARN] [{}] {}", operation, message);
	}

	public static void warn(String operation, Long userId) {
		logger.warn("[WARN] [{}] [USER:{}] {}", operation, userId);
	}

	/**
	 * 클래스명과 함께 경고 로그
	 */
	public static void warn(Class<?> clazz, String message) {
		logger.warn("[WARN] [{}] {}", clazz.getSimpleName(), message);
	}

	/**
	 * 클래스명과 상세 정보가 포함된 경고 로그
	 */
	public static void warn(Class<?> clazz, String message, Object... details) {
		StringBuilder detailStr = new StringBuilder();
		for (int i = 0; i < details.length; i += 2) {
			if (i + 1 < details.length) {
				detailStr.append(String.format(" %s=%s", details[i], details[i + 1]));
			}
		}
		logger.warn("[WARN] [{}] {} {}", clazz.getSimpleName(), message, detailStr.toString());
	}

	/**
	 * 에러 로그
	 */
	public static void error(String message) {
		logger.error("[ERROR] {}", message);
	}

	/**
	 * 예외와 함께 에러 로그
	 */
	public static void error(String message, Exception e) {
		logger.error("[ERROR] {} - {}", message, e.getMessage(), e);
	}

	/**
	 * 클래스명과 함께 에러 로그
	 */
	public static void error(Class<?> clazz, String message) {
		logger.error("[ERROR] [{}] {}", clazz.getSimpleName(), message);
	}

	/**
	 * 클래스명과 상세 정보가 포함된 에러 로그
	 */
	public static void error(Class<?> clazz, String message, Object... details) {
		StringBuilder detailStr = new StringBuilder();
		for (int i = 0; i < details.length; i += 2) {
			if (i + 1 < details.length) {
				detailStr.append(String.format(" %s=%s", details[i], details[i + 1]));
			}
		}
		logger.error("[ERROR] [{}] {} {}", clazz.getSimpleName(), message, detailStr.toString());
	}

	/**
	 * 예외와 클래스명이 포함된 에러 로그
	 */
	public static void error(Class<?> clazz, String message, Exception e) {
		logger.error("[ERROR] [{}] {} - {}", clazz.getSimpleName(), message, e.getMessage(), e);
	}

	/**
	 * 디버그 로그
	 */
	public static void debug(String message) {
		logger.debug("[DEBUG] {}", message);
	}

	/**
	 * 클래스명과 함께 디버그 로그
	 */
	public static void debug(Class<?> clazz, String message) {
		logger.debug("[DEBUG] [{}] {}", clazz.getSimpleName(), message);
	}

	/**
	 * API 호출 로그
	 */
	public static void apiCall(String method, String url, Object requestBody) {
		logger.info("[API] [{}] {} - Request: {}", method, url, requestBody);
	}

	/**
	 * API 응답 로그
	 */
	public static void apiResponse(String method, String url, int statusCode, Object responseBody) {
		logger.info("[API] [{}] {} - Response: {} - {}", method, url, statusCode, responseBody);
	}

	/**
	 * 데이터베이스 작업 로그
	 */
	public static void dbOperation(String operation, String tableName, Object entity) {
		logger.info("[DB] [{}] {} - Entity: {}", operation, tableName, entity);
	}

	/**
	 * 비즈니스 로직 로그
	 */
	public static void business(String operation, String message) {
		logger.info("[BUSINESS] [{}] {}", operation, message);
	}

	/**
	 * 성능 로그
	 */
	public static void performance(String operation, long durationMs) {
		if (durationMs > 1000) {
			logger.warn("[PERFORMANCE] [{}] {}ms - 느린 작업 감지!", operation, durationMs);
		} else {
			logger.info("[PERFORMANCE] [{}] {}ms", operation, durationMs);
		}
	}

	/**
	 * 보안 관련 로그
	 */
	public static void security(String message) {
		logger.warn("[SECURITY] {}", message);
	}

	/**
	 * 감사 로그
	 */
	public static void audit(String operation, String message, Long userId) {
		logger.info("[AUDIT] [{}] [USER:{}] {}", operation, userId, message);
	}

	/**
	 * 시작 로그
	 */
	public static void start(String operation) {
		logger.info("[START] [{}] 작업 시작", operation);
	}

	/**
	 * 완료 로그
	 */
	public static void complete(String operation) {
		logger.info("[COMPLETE] [{}] 작업 완료", operation);
	}

	/**
	 * 실패 로그
	 */
	public static void fail(String operation, String reason) {
		logger.error("[FAIL] [{}] 작업 실패 - {}", operation, reason);
	}
	
}
