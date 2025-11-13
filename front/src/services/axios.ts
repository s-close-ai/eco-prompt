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
    // 401 Unauthorized 에러 발생 시
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      console.log('🔐 [Axios Interceptor] 401 Unauthorized detected at:', currentPath);
      
      // 현재 페이지가 루트(/) 또는 /consent가 아닌 경우에만 리다이렉트
      // 랜딩 페이지와 동의 페이지에서는 리다이렉트하지 않음
      if (currentPath !== '/' && currentPath !== '/consent') {
        console.log('🚀 [Axios Interceptor] Redirecting to landing page');
        window.location.href = '/';
      } else {
        console.log('⚠️ [Axios Interceptor] Already at landing/consent page, not redirecting');
      }
    }
    return Promise.reject(error);
  }
);
