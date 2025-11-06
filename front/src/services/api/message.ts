import { apiClient } from '@/services/axios';
import type { ChatMessageRequest, ChatMessageResponse } from '@/types/chat.types';

/**
 * 사용자 메시지 전송
 * Endpoint: POST /api/v1/messages/input
 * @param request - 프로젝트 ID, 채팅방 ID, 메시지 내용
 * @returns 채팅방 ID와 메시지 UUID
 */
export const submitMessage = async (request: ChatMessageRequest): Promise<ChatMessageResponse> => {
  const response = await apiClient.post<ChatMessageResponse>('/api/v1/messages/input', request);
  return response.data;
};

/**
 * 메시지 수정
 * Endpoint: PATCH /api/v1/messages
 * @param request - 프로젝트 ID, 채팅방 ID, 메시지 내용, 메시지 UUID
 * @returns 채팅방 ID와 메시지 UUID
 */
export const updateMessage = async (request: {
  projectId: number;
  chattingId: number;
  content: string;
  messageUUID: string;
}): Promise<ChatMessageResponse> => {
  const response = await apiClient.patch<ChatMessageResponse>('/api/v1/messages', request);
  return response.data;
};

/**
 * 메시지 응답 중지
 * Endpoint: POST /api/v1/messages/stop/{messageUUID}
 * @param messageUUID - 중지할 메시지의 UUID
 */
export const stopMessage = async (messageUUID: string): Promise<void> => {
  await apiClient.post(`/api/v1/messages/stop/${messageUUID}`);
};

/**
 * SSE 연결을 통한 AI 응답 구독
 * Endpoint: GET /api/v1/messages/subscribe/{messageUUID}
 * @param messageUUID - 구독할 메시지의 UUID
 * @returns EventSource 객체
 */
export const subscribeMessage = (messageUUID: string): EventSource => {
  const baseURL = apiClient.defaults.baseURL || '';
  return new EventSource(`${baseURL}/api/v1/messages/subscribe/${messageUUID}`);
};
