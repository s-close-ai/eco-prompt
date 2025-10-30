# Python 3.12.3 베이스 이미지 사용
FROM python:3.12.3-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    make \
    git \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# requirements 파일 복사
COPY requirements_JP.txt .

# Python 패키지 설치 (numpy 먼저 설치 후 나머지 패키지 설치)
RUN pip install --no-cache-dir numpy==2.3.4 && \
    CMAKE_ARGS="-DGGML_NATIVE=OFF" CMAKE_BUILD_PARALLEL_LEVEL=4 pip install --no-cache-dir -r requirements_JP.txt


ENV NLTK_DATA=/usr/local/nltk_data
RUN mkdir -p /usr/local/nltk_data && \
    python -m nltk.downloader -d /usr/local/nltk_data stopwords punkt


# 애플리케이션 코드 복사
COPY app/ ./app/

# 환경 변수 설정 (기본값)
ENV PYTHONPATH=/app

# 포트 노출
EXPOSE 8000

# 애플리케이션 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


