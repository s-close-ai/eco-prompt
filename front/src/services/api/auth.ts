import { apiClient } from "@/services/axios";
import type { ConsentUpdateResponse, UserInfoResponse } from "@/types/auth.types";

// SSAFY OAuth 로그인 시작
export const startSsafyLogin = () => {
  const loginUrl = `${apiClient.defaults.baseURL}/api/v1/auth/sign-in`;
  window.location.href = loginUrl;
};

// 동의 상태 업데이트
export const updateConsent = async (): Promise<ConsentUpdateResponse> => {
  const response = await apiClient.patch<ConsentUpdateResponse>("/api/v1/user-infos/sharing-information");
  return response.data;
};

export const getUserInfo = async (): Promise<UserInfoResponse> => {
  const response = await apiClient.get<UserInfoResponse>("/api/v1/user-infos/sharing-information");
  return response.data;
};

// 로그아웃 (쿠키 삭제)
export const logout = async (): Promise<void> => {
//   await apiClient.post("/api/v1/auth/sign-out");
//   // 쿠키는 백엔드에서 삭제되지만, 클라이언트에서도 명시적으로 삭제
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};
