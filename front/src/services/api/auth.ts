import { apiClient } from '@/services/axios';
import type { UserInfoResponse } from '@/types/auth.types';

/**
 * SSAFY OAuth 로그인 페이지로 리다이렉트
 * Endpoint: GET /api/v1/auth/sign-in
 */
export const signIn = () => {
  const loginUrl = `${apiClient.defaults.baseURL}/api/v1/auth/sign-in`;
  window.location.href = loginUrl;
};

/**
 * 정보 공유 동의 상태 조회
 * Endpoint: GET /api/v1/user-infos/sharing-information
 */
export const getSharingInformation = async (): Promise<UserInfoResponse> => {
  const response = await apiClient.get<UserInfoResponse>('/api/v1/user-infos/sharing-information');
  return response.data;
};

/**
 * 정보 공유 동의 상태 토글
 * Endpoint: PATCH /api/v1/user-infos/sharing-information
 */
export const toggleSharingInformation = async (): Promise<UserInfoResponse> => {
  const response = await apiClient.patch<UserInfoResponse>(
    '/api/v1/user-infos/sharing-information',
  );
  return response.data;
};

/**
 * 로그아웃 (쿠키 삭제)
 * 클라이언트에서 쿠키를 삭제하여 로그아웃 처리
 */
export const logout = () => {
  const logoutUrl = `${apiClient.defaults.baseURL}/api/v1/auth/sign-out`;
  window.location.href = logoutUrl;
};
