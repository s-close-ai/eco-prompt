import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  withCredentials: true,
  timeout: 600000, // 10분
  headers: {
    'Content-Type': 'application/json',
  },
});

// 응답 인터셉터: 401 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized 에러 발생 시 / 로 리다이렉트 (단, 이미 / 페이지에 있으면 리다이렉트하지 않음)
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      // 랜딩 페이지가 아닌 경우에만 리다이렉트 (무한 루프 방지)
      if (currentPath !== '/') {
        console.log('🔒 [401 Error] Redirecting to landing page from:', currentPath);
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
