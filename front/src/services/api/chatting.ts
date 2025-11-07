import { apiClient } from '@/services/axios';
import type {
  ChattingMessagesResponse,
  ChattingProjectResponse,
  ChattingProjectRequest,
  ChattingTitleRequest,
  ChattingTitleResponse,
} from '@/types/api/chatting.types';

/**
 * 채팅방 메시지 조회
 * Endpoint: GET  /chattings/{chattingId}/messages
 * @param chattingId - 채팅방 ID
 * @param page - 페이지 번호 (기본값: 0)
 * @returns 메시지 목록
 */
export const getChattingMessages = async (
  chattingId: number,
  page: number = 0,
): Promise<ChattingMessagesResponse> => {
  const response = await apiClient.get(`/chattings/${chattingId}/messages`, {
    params: { page },
  });
  return response.data;
};

/**
 * 채팅방 이름 변경
 * Endpoint: PATCH  /chattings/{chattingId}/title
 * @param chattingId - 채팅방 ID
 * @param title - 변경할 제목
 */
export const updateChattingTitle = async (
  chattingId: number,
  request: ChattingTitleRequest,
): Promise<ChattingTitleResponse> => {
  const response = await apiClient.patch<ChattingTitleResponse>(
    `/chattings/${chattingId}/title`,
    request,
  );
  return response.data;
};

/**
 * 채팅방 프로젝트 변경
 * Endpoint: PATCH  /chattings/{chattingId}/project
 * @param chattingId - 채팅방 ID
 * @param projectId - 변경할 프로젝트 ID
 */
export const updateChattingProject = async (
  chattingId: number,
  request: ChattingProjectRequest,
): Promise<ChattingProjectResponse> => {
  const response = await apiClient.patch<ChattingProjectResponse>(
    `/chattings/${chattingId}/project`,
    request,
  );
  return response.data;
};

/**
 * 채팅방 삭제
 * Endpoint: PATCH  /chattings/delete
 * @param chattingId - 삭제할 채팅방 ID
 */
export const deleteChatting = async (chattingId: number): Promise<void> => {
  await apiClient.patch(
    `/chattings/delete`,
    {},
    {
      params: { chattingId },
    },
  );
};
