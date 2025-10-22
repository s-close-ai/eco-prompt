# AppLogger 사용 가이드

## 개요
`AppLogger`는 프로젝트 전체에서 일관된 로깅을 위해 사용하는 공용 로거 클래스입니다.

## 기본 사용법

### 1. 기본 로그
```java
AppLogger.info("기본 정보 로그");
AppLogger.warn("경고 로그");
AppLogger.error("에러 로그");
AppLogger.debug("디버그 로그");
```

### 2. 클래스명과 함께 로그
```java
AppLogger.info(ChatAgentServiceImpl.class, "클래스 정보 로그");
AppLogger.warn(ChatAgentServiceImpl.class, "클래스 경고 로그");
AppLogger.error(ChatAgentServiceImpl.class, "클래스 에러 로그");
```

### 3. 사용자 ID와 함께 로그
```java
AppLogger.info("사용자 작업 완료", 12345L);
AppLogger.warn("사용자 경고", 12345L);
```

### 4. 작업명과 함께 로그
```java
AppLogger.info("USER_LOGIN", "사용자 로그인 시도");
AppLogger.info("DATA_SAVE", "데이터 저장 완료");
```

### 5. 상세 정보가 포함된 로그
```java
AppLogger.info("USER_UPDATE", "사용자 정보 수정", 
    "userId", 12345L, 
    "field", "email", 
    "oldValue", "old@email.com", 
    "newValue", "new@email.com");
```

## 특화된 로그 메서드

### API 로그
```java
// API 호출 로그
AppLogger.apiCall("POST", "/api/users", requestBody);

// API 응답 로그
AppLogger.apiResponse("POST", "/api/users", 201, responseBody);
```

### 데이터베이스 로그
```java
AppLogger.dbOperation("INSERT", "users", entity);
AppLogger.dbOperation("UPDATE", "users", entity);
```

### 비즈니스 로직 로그
```java
AppLogger.business("USER_REGISTRATION", "새 사용자 등록 처리");
AppLogger.business("PAYMENT_PROCESSING", "결제 처리 시작");
```

### 성능 로그
```java
AppLogger.performance("DATABASE_QUERY", 150); // 빠른 작업
AppLogger.performance("EXTERNAL_API_CALL", 2500); // 느린 작업 (경고)
```

### 보안 로그
```java
AppLogger.security("잘못된 로그인 시도 - IP: 192.168.1.100");
AppLogger.security("권한 없는 접근 시도 - User: 12345");
```

### 감사 로그
```java
AppLogger.audit("USER_DELETE", "사용자 삭제", 12345L);
AppLogger.audit("DATA_EXPORT", "데이터 내보내기", 67890L);
```

### 작업 흐름 로그
```java
AppLogger.start("USER_REGISTRATION");
// ... 작업 수행 ...
AppLogger.complete("USER_REGISTRATION");

// 또는 실패 시
AppLogger.fail("USER_REGISTRATION", "이메일 중복");
```

### 에러 로그
```java
try {
    // 작업 수행
} catch (Exception e) {
    AppLogger.error("작업 중 예외 발생", e);
    AppLogger.error(ChatAgentServiceImpl.class, "클래스에서 예외 발생", e);
}
```

## 로그 출력 예시

```
2024-01-15 14:30:25.123 [main] INFO  [com.aid.common.logging.AppLogger] - [INFO] [SEND_MESSAGE] 메시지 전송 요청 serviceId=1 userId=123 type=chat
2024-01-15 14:30:25.124 [main] INFO  [com.aid.common.logging.AppLogger] - [API] [POST] http://localhost:8080/lc/v1/question - Request: ExternalApiRequestDto{...}
2024-01-15 14:30:25.456 [main] INFO  [com.aid.common.logging.AppLogger] - [API] [POST] http://localhost:8080/lc/v1/question - Response: 200 - ExternalApiResponseDto{...}
2024-01-15 14:30:25.457 [main] INFO  [com.aid.common.logging.AppLogger] - [PERFORMANCE] [EXTERNAL_API_CALL] 333ms
2024-01-15 14:30:25.458 [main] INFO  [com.aid.common.logging.AppLogger] - [COMPLETE] [SEND_MESSAGE] 작업 완료
```

## 장점

1. **일관성**: 프로젝트 전체에서 동일한 로그 형식 사용
2. **간편성**: static 메서드로 어디서든 쉽게 사용
3. **가독성**: 로그 타입별로 명확한 구분
4. **성능**: 성능 로그에서 자동으로 느린 작업 감지
5. **디버깅**: 상세 정보를 쉽게 추가 가능
6. **감사**: 보안 및 감사 로그를 별도로 관리

## 주의사항

- `AppLogger`는 static 메서드이므로 `@Component` 어노테이션이 필요 없습니다
- 로그 레벨은 `logback-spring.xml`에서 설정할 수 있습니다
- 성능 로그는 1초(1000ms) 이상일 때 경고로 표시됩니다
