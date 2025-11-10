import { apiClient } from '@/services/axios';
import type {
  MessageInputRequest,
  MessageInputResponse,
  MessageUpdateRequest,
  MessageUpdateResponse,
} from '@/types/api/message.types';

/**
 * 사용자 메시지 전송
 * Endpoint: POST  /messages/input
 * @param request - 프로젝트 ID, 채팅방 ID, 메시지 내용
 * @returns 채팅방 ID와 메시지 UUID
 */
export const submitMessage = async (
  request: MessageInputRequest,
): Promise<MessageInputResponse> => {
  const response = await apiClient.post<MessageInputResponse>('/messages/input', request);
  return response.data;
};

/**
 * 메시지 수정
 * Endpoint: PATCH  /messages
 * @param request - 프로젝트 ID, 채팅방 ID, 메시지 내용, 메시지 UUID
 * @returns 채팅방 ID와 메시지 UUID
 */
export const updateMessage = async (
  request: MessageUpdateRequest,
): Promise<MessageUpdateResponse> => {
  const response = await apiClient.patch<MessageUpdateResponse>('/messages', request);
  return response.data;
};

/**
 * 메시지 응답 중지
 * Endpoint: POST  /messages/stop/{messageUUID}
 * @param messageUUID - 중지할 메시지의 UUID
 */
export const stopMessage = async (messageUUID: string): Promise<void> => {
  await apiClient.post(`/messages/stop/${messageUUID}`);
};

/**
 * SSE 연결을 통한 AI 응답 구독
 * Endpoint: GET  /messages/subscribe/{messageUUID}
 * @param messageUUID - 구독할 메시지의 UUID
 * @returns EventSource 객체
 */
export const subscribeMessage = (messageUUID: string): EventSource => {
  return new EventSource(`${apiClient.defaults.baseURL}/messages/subscribe/${messageUUID}`, {
    withCredentials: true,
  });
};
