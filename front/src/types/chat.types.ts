// 채팅 관련 타입 정의

export type MessageType = 'user' | 'ai' | 'loading' | 'error';

export interface PromptScore {
  sc_ec_1: number; // 명확성 (최대 25점)
  sc_ec_2: number; // 구체성 (최대 25점)
  sc_ec_3: number; // 형식 준수 (최대 25점)
  sc_ec_4: number; // 안전성 (최대 25점)
  sc_ec_0: number; // 총점 (최대 100점)
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  message: string;
  timestamp: Date;
  score?: PromptScore;
  isStreaming?: boolean;
  messageUUID?: string; // 서버의 실제 messageUUID (수정 시 필요)
  errorType?: 'llm' | 'judge' | 'both'; // 에러 타입 구분
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
