# -------------------------------------------------------
# 1) Build Stage: Liberica OpenJDK 17 (Full JDK)
# -------------------------------------------------------
FROM bellsoft/liberica-openjdk-debian:17 AS builder

WORKDIR /app
ENV TZ=Asia/Seoul LANG=C.UTF-8

# Gradle 캐시를 최대한 활용하기 위해 build 전에 의존성만 먼저 복사
COPY gradlew .
COPY gradle gradle
RUN chmod +x gradlew

# Gradle 설정 및 종속성 미리 다운로드
COPY build.gradle settings.gradle ./
RUN ./gradlew dependencies --no-daemon || true

# 소스 복사 후 빌드
COPY src ./src
RUN ./gradlew clean bootJar -x test --no-daemon

# jar 파일을 별도 폴더로 이동
RUN mkdir -p /out && cp build/libs/*.jar /out/app.jar


# -------------------------------------------------------
# 2) Runtime Stage: Liberica Runtime 17 (경량 JRE)
# -------------------------------------------------------
FROM bellsoft/liberica-openjre-alpine:17

WORKDIR /app
COPY --from=builder /out/app.jar /app/app.jar

ENV SERVER_PORT=8080
EXPOSE 8080


ENTRYPOINT ["java", "-jar", "/app/app.jar", "--server.port=${SERVER_PORT}"]