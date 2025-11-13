import type { ChatMessage } from '@/types/chat.types';

interface APIMessage {
  userMessage?: {
    content: string;
    messageUUID: string;
  };
  aiMessage?: {
    content?: string;
    messageStatus?: string;
  };
  scoreMessage?: {
    messageStatus?: string;
    scoreInfo: {
      sc_ec_0: number;
      sc_ec_1: number;
      sc_ec_2: number;
      sc_ec_3: number;
      sc_ec_4: number;
    };
  };
}

/**
 * API 응답을 ChatMessage 배열로 파싱
 * @param apiMessages API에서 받은 메시지 배열
 * @returns 파싱된 ChatMessage 배열
 */
export function parseMessages(apiMessages: APIMessage[]): ChatMessage[] {
  const loadedMessages: ChatMessage[] = [];

  // API 응답은 최신 메시지가 먼저 오므로 reverse하여 오래된 메시지부터 처리
  apiMessages.reverse().forEach((msg) => {
    const hasAIError = msg.aiMessage?.messageStatus === 'ERROR';
    const hasScoreError = msg.scoreMessage?.messageStatus === 'ERROR';
    const hasAIContent = msg.aiMessage?.content;

    // User Message
    if (msg.userMessage && msg.userMessage.content) {
      loadedMessages.push({
        id: msg.userMessage.messageUUID,
        type: 'user',
        message: msg.userMessage.content,
        timestamp: new Date(),
        messageUUID: msg.userMessage.messageUUID, // 서버의 messageUUID 저장
        score: msg.scoreMessage?.scoreInfo
          ? {
              sc_ec_1: msg.scoreMessage.scoreInfo.sc_ec_1,
              sc_ec_2: msg.scoreMessage.scoreInfo.sc_ec_2,
              sc_ec_3: msg.scoreMessage.scoreInfo.sc_ec_3,
              sc_ec_4: msg.scoreMessage.scoreInfo.sc_ec_4,
              sc_ec_0: msg.scoreMessage.scoreInfo.sc_ec_0,
            }
          : undefined,
      });
    }

    // 에러 처리: 점수만 에러면 AI 응답 위에, LLM만 에러면 점수 아래에, 둘 다 에러면 하나의 통합 메시지
    if (hasScoreError && hasAIContent && msg.aiMessage) {
      // 점수만 에러 (AI는 정상) → 점수 위치에 에러 (AI 메시지 위에)
      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: '점수 정보를 생성하는 중 오류가 발생했습니다.',
        timestamp: new Date(),
      });
      // 정상 AI 메시지 추가
      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'ai',
        message: msg.aiMessage.content!,
        timestamp: new Date(),
      });
    } else if (hasAIError && hasScoreError) {
      // 둘 다 에러 → 하나의 통합 에러 메시지
      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: '응답을 생성하는 중 오류가 발생했습니다.',
        timestamp: new Date(),
      });
    } else if (hasAIError) {
      // LLM만 에러 (점수는 정상) → 점수 아래에 에러
      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: 'AI 응답을 생성하는 중 오류가 발생했습니다.',
        timestamp: new Date(),
      });
    } else if (hasAIContent && msg.aiMessage) {
      // 정상 AI 메시지 (점수도 정상)
      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'ai',
        message: msg.aiMessage.content!,
        timestamp: new Date(),
      });
    }
  });

  return loadedMessages;
}
