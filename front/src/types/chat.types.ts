// 채팅 관련 타입 정의

export type MessageType = 'user' | 'ai' | 'loading' | 'error';

export interface PromptScore {
  clarityScore: number; // 명확성 (최대 25점)
  specificityScore: number; // 구체성 (최대 25점)
  formatScore: number; // 형식 준수 (최대 25점)
  safetyScore: number; // 안정성 (최대 25점)
  totalScore: number; // 총점 (최대 100점)
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  message: string;
  timestamp: Date;
  score?: PromptScore;
  isStreaming?: boolean;
}

export interface ChatMessageRequest {
  projectId: number;
  chattingId: number | null;
  content: string;
}

export interface ChatMessageResponse {
  status: string;
  data: {
    chattingId: number;
    messageUUID: string;
  };
}

export interface ChatMessageSSERequest {
  messageUUID: string;
}

export interface ChatMessageSSEResponse {
  timeout: number;
}
