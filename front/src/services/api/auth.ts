import { apiClient } from '@/services/axios';
import type { UserInfoResponse } from '@/types/api/auth.types';

/**
 * SSAFY OAuth 로그인 페이지로 리다이렉트
 * Endpoint: GET  /auth/sign-in
 */
export const signIn = () => {
  const loginUrl = `${apiClient.defaults.baseURL}/auth/sign-in`;
  window.location.href = loginUrl;
};

/**
 * 정보 공유 동의 상태 조회
 * Endpoint: GET  /user-infos/sharing-information
 */
export const getSharingInformation = async (): Promise<UserInfoResponse> => {
  const response = await apiClient.get<UserInfoResponse>('/user-infos/sharing-information');
  return response.data;
};

/**
 * 정보 공유 동의 상태 토글
 * Endpoint: PATCH  /user-infos/sharing-information
 */
export const toggleSharingInformation = async (): Promise<UserInfoResponse> => {
  const response = await apiClient.patch<UserInfoResponse>('/user-infos/sharing-information');
  return response.data;
};

/**
 * 로그아웃 (쿠키 삭제)
 * 클라이언트에서 쿠키를 삭제하여 로그아웃 처리
 */
export const logout = () => {
  const logoutUrl = `${apiClient.defaults.baseURL}/auth/sign-out`;
  window.location.href = logoutUrl;
};
