# ---------- Stage 1: llama.cpp 빌드 ----------
  FROM python:3.11-slim AS llama-builder
  ENV DEBIAN_FRONTEND=noninteractive
  WORKDIR /tmp
  
  RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake git curl ca-certificates \
      libcurl4-openssl-dev \
   && rm -rf /var/lib/apt/lists/*
  
  RUN git clone --depth=1 https://github.com/ggerganov/llama.cpp.git
  WORKDIR /tmp/llama.cpp
  
  # ARM 최적화를 쓰려면 진짜 ARM64로 빌드돼야 합니다(아래 buildx 참고).
  RUN cmake -S . -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DGGML_NATIVE=ON \
        -DGGML_ARM_NEON=ON \
    && cmake --build build -j --target llama-server
  
  # ---------- Stage 2: Python 런타임 ----------
  FROM python:3.11-slim
  ENV DEBIAN_FRONTEND=noninteractive
  WORKDIR /app
  
  # 런타임 의존성 + 빌드 도구 + git (requirements에 git+… 있을 때 필요)
  RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake git curl ca-certificates \
      libstdc++6 libgomp1 libatomic1 libcurl4 procps \
      libcurl4-openssl-dev \
   && rm -rf /var/lib/apt/lists/*
  
  COPY requirements.txt .
  ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_ROOT_USER_ACTION=ignore
  RUN pip install --no-cache-dir -r requirements.txt
  
  # HOME 환경변수 설정 (start_server.sh에서 사용)
  ENV HOME=/root
  
  # llama-server를 스크립트가 기대하는 경로에 복사
  RUN mkdir -p /root/llama.cpp/build/bin
  COPY --from=llama-builder /tmp/llama.cpp/build/bin/llama-server /root/llama.cpp/build/bin/llama-server
  RUN chmod +x /root/llama.cpp/build/bin/llama-server
  
  # 앱 파일들
  COPY . .
  
  RUN chmod +x start_server.sh healthcheck.sh watchdog.sh
  RUN mkdir -p logs
  
  EXPOSE 8080
  HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ./healthcheck.sh || exit 1
  
  CMD ["./start_server.sh"]
  