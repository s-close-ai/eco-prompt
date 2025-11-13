import { apiClient } from '@/services/axios';
import type {
  MessageInputRequest,
  MessageInputResponse,
  MessageUpdateRequest,
  MessageUpdateResponse,
  MessageSearchRequest,
  MessageSearchResponse,
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
  const baseURL = apiClient.defaults.baseURL || '';
  // baseURL이 상대 경로인 경우 절대 URL로 변환
  const absoluteURL = baseURL.startsWith('http') 
    ? baseURL 
    : `${window.location.origin}${baseURL}`;
  
  const sseURL = `${absoluteURL}/messages/subscribe/${messageUUID}`;
  console.log('SSE 연결 URL:', sseURL); // 디버깅용
  
  return new EventSource(sseURL, {
    withCredentials: true,
  });
};

/**
 * 메세지 검색
 * Endpoint: GET  /messages/search
 * @param request - string
 * @returns MessageSearchResponse
 */

export const searchMessages = async (request: MessageSearchRequest): Promise<MessageSearchResponse> => {
  const response = await apiClient.get<MessageSearchResponse>('/messages/search', {
    params: { keyword: request.string },
  });
  return response.data;
};