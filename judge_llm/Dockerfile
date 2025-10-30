FROM python:3.12.3-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/judge_llm

# 의존성 설치 (빌드 캐시 최적화)
COPY api/requirements.txt /app/judge_llm/api/requirements.txt
RUN pip install --no-cache-dir -r /app/judge_llm/api/requirements.txt

# 앱 소스 복사 (루트 컨텍스트 전체 포함 -> main.py 포함)
COPY . /app/judge_llm

EXPOSE 8081

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]


