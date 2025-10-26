/**
 * 토큰 관리 유틸리티 함수
 * Refresh Token은 백엔드에서 httpOnly 쿠키로 관리
 */

const ACCESS_TOKEN_KEY = 'accessToken';

/**
 * Access Token 저장
 */
export const setAccessToken = (token: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

/**
 * Access Token 가져오기
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Access Token 제거
 */
export const clearAccessToken = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

/**
 * Access Token 유효성 검사 (JWT 디코딩)
 */
export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;

  try {
    // JWT 토큰 파싱 (header.payload.signature)
    const payload = token.split('.')[1];
    if (!payload) return false;

    // Base64 디코딩
    const decoded = JSON.parse(atob(payload));

    // 만료 시간 확인
    if (decoded.exp) {
      const expirationTime = decoded.exp * 1000; // 초 단위를 밀리초로 변환
      return Date.now() < expirationTime;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

/**
 * 토큰 갱신 요청
 * Refresh Token은 httpOnly 쿠키로 자동 전송됨
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // 쿠키 포함
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newAccessToken = data.access_token;

    if (newAccessToken) {
      setAccessToken(newAccessToken);
      return newAccessToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    clearAccessToken();
    return null;
  }
};

/**
 * 인증 여부 확인
 */
export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  return isTokenValid(token);
};
