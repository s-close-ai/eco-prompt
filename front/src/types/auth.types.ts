// SSAFY OAuth 로그인 후 사용자 정보 응답 타입
export interface UserInfoResponse {
  status: string;
  data: {
    sharingInformation: "Y" | "N";
    sharingInformationUpdatedAt: string;
  };
}

// 동의 상태 업데이트 응답 타입
export interface ConsentUpdateResponse {
  status: string;
  data: {
    sharingInformation: "Y" | "N";
    sharingInformationUpdatedAt: string;
  };
}
