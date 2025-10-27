import { create } from 'zustand';
import { getAccessToken, setAccessToken, clearAccessToken, isTokenValid } from '@/utils/tokenManager';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string) => void;
  clearAuth: () => void;
  checkAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: getAccessToken(),
  isAuthenticated: isTokenValid(getAccessToken()),
  isLoading: false,

  // Access Token 설정 및 인증 상태 업데이트
  setAuth: (token: string) => {
    setAccessToken(token);
    set({
      accessToken: token,
      isAuthenticated: true,
    });
  },

  // 인증 정보 초기화
  clearAuth: () => {
    clearAccessToken();
    set({
      accessToken: null,
      isAuthenticated: false,
    });
  },

  // 인증 상태 확인 (토큰 유효성 검증)
  checkAuth: () => {
    const token = getAccessToken();
    const isValid = isTokenValid(token);

    set({
      accessToken: token,
      isAuthenticated: isValid,
    });

    if (!isValid) {
      clearAccessToken();
    }
  },

  // 로딩 상태 설정
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
