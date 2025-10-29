# ===========================
# 1️⃣ Build Stage
# ===========================
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사 (빌드 캐시 최적화)
COPY package*.json ./

# lock 파일이 있다면 npm ci 사용
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# 소스 복사
COPY . .

# React / Vite 빌드 (빌드 산출물은 보통 dist/ 또는 build/)
RUN npm run build


# ===========================
# 2️⃣ Nginx Stage
# ===========================
FROM nginx:alpine

# Nginx 기본 html 경로로 빌드 결과 복사
COPY --from=builder /app/dist /usr/share/nginx/html
# CRA(Create React App) 프로젝트라면 아래로 변경:
# COPY --from=builder /app/build /usr/share/nginx/html

# Nginx 설정 교체 (PWA 및 SPA 지원)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx는 기본 80포트 사용
EXPOSE 80

# 포그라운드 실행
CMD ["nginx", "-g", "daemon off;"]