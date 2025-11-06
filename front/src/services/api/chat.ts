import { apiClient } from "@/services/axios";
import type { ChatMessageRequest, ChatMessageResponse, ChatMessageSSERequest, ChatMessageSSEResponse } from "@/types/chat.types";

// 사용자 입력 후 메시지 UUID 값
export const sendChatMessage = async (request: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const response = await apiClient.post<ChatMessageResponse>("/api/v1/messages/input", request);
    return response.data;
};

export const AIresponse = async (request: ChatMessageSSERequest): Promise<ChatMessageSSEResponse> => {
    const response = await apiClient.get<ChatMessageSSEResponse>(`/api/v1/messages/input/${request.messageUUID}/ai-response`);
    return response.data;
};

