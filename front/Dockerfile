# ===========================
# 1️⃣ Build Stage
# ===========================
FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

# ===========================
# 2️⃣ Nginx Stage
# ===========================
FROM nginx:alpine

# 기본 conf 제거(볼륨 마운트로 우리의 conf를 사용할 것)
RUN rm -f /etc/nginx/conf.d/default.conf

# 빌드 결과 복사 (정적 서빙 루트)
COPY --from=builder /app/dist /usr/share/nginx/html

# 포그라운드 실행
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]