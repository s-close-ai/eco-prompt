// 채팅 관련 타입 정의

export type MessageType = 'user' | 'ai' | 'loading' | 'error';

export interface PromptScore {
  clarity: number; // 명확성 (최대 25점)
  specificity: number; // 구체성 (최대 25점)
  format: number; // 형식 준수 (최대 25점)
  completeness: number; // 완전성 (최대 25점)
  totalScore: number; // 총점 (최대 100점)
}

export interface ChatMessage {
  id: number;
  type: MessageType;
  message: string;
  timestamp: Date;
  score?: PromptScore;
}
