import { apiClient } from '@/services/axios';

/**
 * 채팅방 메시지 조회
 * Endpoint: GET /api/v1/chattings/{chattingId}/messages
 * @param chattingId - 채팅방 ID
 * @param page - 페이지 번호 (기본값: 0)
 * @returns 메시지 목록
 */
export const getChattingMessages = async (chattingId: number, page: number = 0): Promise<any> => {
  const response = await apiClient.get(`/api/v1/chattings/${chattingId}/messages`, {
    params: { page },
  });
  return response.data;
};

/**
 * 채팅방 이름 변경
 * Endpoint: PATCH /api/v1/chattings/{chattingId}/title
 * @param chattingId - 채팅방 ID
 * @param title - 변경할 제목
 */
export const updateChattingTitle = async (chattingId: number, title: string): Promise<void> => {
  await apiClient.patch(`/api/v1/chattings/${chattingId}/title`, { title });
};

/**
 * 채팅방 프로젝트 변경
 * Endpoint: PATCH /api/v1/chattings/{chattingId}/project
 * @param chattingId - 채팅방 ID
 * @param projectId - 변경할 프로젝트 ID
 */
export const updateChattingProject = async (
  chattingId: number,
  projectId: number,
): Promise<void> => {
  await apiClient.patch(`/api/v1/chattings/${chattingId}/project`, { projectId });
};

/**
 * 채팅방 삭제
 * Endpoint: PATCH /api/v1/chattings/delete
 * @param chattingId - 삭제할 채팅방 ID
 */
export const deleteChatting = async (chattingId: number): Promise<void> => {
  await apiClient.patch(
    `/api/v1/chattings/delete`,
    {},
    {
      params: { chattingId },
    },
  );
};
