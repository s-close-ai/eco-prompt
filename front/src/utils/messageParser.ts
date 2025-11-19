import type { ChatMessage } from '@/types/chat.types';

interface FileInfo {
  fileId: number;
  originalFileName: string;
  fileUrl: string;
}

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
  userFileList?: FileInfo[];
  aiFile?: FileInfo;
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
      const scoreInfo = msg.scoreMessage?.scoreInfo
        ? {
            sc_ec_1: msg.scoreMessage.scoreInfo.sc_ec_1,
            sc_ec_2: msg.scoreMessage.scoreInfo.sc_ec_2,
            sc_ec_3: msg.scoreMessage.scoreInfo.sc_ec_3,
            sc_ec_4: msg.scoreMessage.scoreInfo.sc_ec_4,
            sc_ec_0: msg.scoreMessage.scoreInfo.sc_ec_0,
          }
        : undefined;

      // 파일 정보 변환 (userFileList 사용)
      const attachments = msg.userFileList?.map(file => ({
        fileId: file.fileId,
        fileUrl: file.fileUrl,
        originalFileName: file.originalFileName,
      }));

      loadedMessages.push({
        id: msg.userMessage.messageUUID,
        type: 'user',
        message: msg.userMessage.content,
        timestamp: new Date(),
        messageUUID: msg.userMessage.messageUUID, // 서버의 messageUUID 저장
        score: scoreInfo,
        // scoreState 설정: 점수가 있으면 success, 점수 에러면 error
        scoreState: hasScoreError
          ? { status: 'error', error: '점수 평가에 실패했습니다.' }
          : scoreInfo
            ? { status: 'success', score: scoreInfo }
            : undefined,
        attachments, // 첨부 파일 추가
      });
    }

    // AI 메시지 처리 (점수 에러는 이미 user 메시지의 scoreState로 처리됨)
    if (hasAIError && hasScoreError) {
      // 둘 다 에러 → 하나의 통합 에러 메시지
      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: '응답을 생성하는 중 오류가 발생했습니다.',
        timestamp: new Date(),
        errorType: 'both' as const,
      });
    } else if (hasAIError) {
      // LLM만 에러 (점수는 정상 또는 에러) → AI 응답 에러
      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: 'AI 응답을 생성하는 중 오류가 발생했습니다.',
        timestamp: new Date(),
        errorType: 'llm' as const,
      });
    } else if (hasAIContent && msg.aiMessage) {
      // 정상 AI 메시지 (점수가 에러여도 AI는 정상이면 표시)
      // AI 파일 정보 변환
      const aiAttachment = msg.aiFile ? {
        fileId: msg.aiFile.fileId,
        fileUrl: msg.aiFile.fileUrl,
        originalFileName: msg.aiFile.originalFileName,
      } : undefined;

      loadedMessages.push({
        id: crypto.randomUUID(),
        type: 'ai',
        message: msg.aiMessage.content!,
        timestamp: new Date(),
        attachments: aiAttachment ? [aiAttachment] : undefined,
      });
    }
  });

  return loadedMessages;
}
