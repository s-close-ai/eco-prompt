import { apiClient } from '@/services/axios';
import type { UserPromptSettingRequest, UserPromptSettingResponse, SettingsResponse } from '@/types/api/user-info.types';

/**
 * 사용자 프롬프트 공유 여부 변경
 * Endpoint: PATCH  /user-infos/sharing-prompt
 * @returns 사용자 프롬프트 공유 여부 변경 응답 데이터
 * Y: 공유 중, N: 공유 안 함
 */
export const toggleSharingPrompt = async (): Promise<UserPromptSettingResponse> => {
  const response = await apiClient.patch<UserPromptSettingResponse>('/user-infos/sharing-prompt');
  return response.data;
};

/**
 * 사용자 지침 프롬프트 설정
 * Endpoint: PATCH  /user-infos/personal-prompt
 * @param request - 사용자 지침 프롬프트 설정 요청 데이터
 * @returns 사용자 지침 프롬프트 설정 응답 데이터
 * personalPrompt: 사용자 지침 프롬프트
 */
export const setPersonalPrompt = async (request: UserPromptSettingRequest): Promise<UserPromptSettingResponse> => {
    const response = await apiClient.patch<UserPromptSettingResponse>('/user-infos/personal-prompt', request);
    return response.data;
};

/**
 * 사용자 정보 조회
 * Endpoint: GET  /user-infos
 * @returns 사용자 정보 조회 응답 데이터
 * sharingPrompt: 사용자 프롬프트 공유 여부
 * personalPrompt: 사용자 지침 프롬프트
 */
export const getSettings = async (): Promise<SettingsResponse> => {
    const response = await apiClient.get<SettingsResponse>('/user-infos');
    return response.data;
};