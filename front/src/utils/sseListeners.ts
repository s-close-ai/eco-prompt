import type { ChatMessage, PromptScore as PromptScoreType } from '@/types/chat.types';
import type { SidebarChatItem, SidebarProjectItem } from '@/types/sidebar.types';
import { useProjectStore } from '@/store/projectStore';

interface SetupSSEListenersParams {
  eventSource: EventSource;
  aiMessageId: string;
  userMessageId: string;
  messageUUID: string;
  loadingMessageId?: string;
  returnedChattingId?: number;
  actualProjectId?: number;
  isResend?: boolean; // LLM 재전송 여부
  skipTitleUpdate?: boolean; // 제목 업데이트 스킵 여부 (재전송 시)
  // Refs
  eventSourcesRef: React.MutableRefObject<Map<string, EventSource>>;
  messageUUIDsRef: React.MutableRefObject<Map<string, string>>;
  autoScrollEnabledRef: React.MutableRefObject<boolean>;
  // State setters
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLoading: (loading: boolean) => void;
  // Store methods
  updateCurrentTitle: (title: string) => void;
  addChatToProject: (projectId: number, chat: SidebarChatItem) => void;
  updateChatTitle: (chattingId: number, title: string) => void;
  defaultProjectId: number | null;
}

/**
 * SSE 이벤트 리스너를 설정하는 유틸 함수
 *
 * 처리하는 이벤트:
 * - LLM_START: LLM 응답 시작
 * - LLM_TOKEN: LLM 토큰 스트리밍
 * - LLM_END: LLM 응답 완료
 * - LLM_ERROR: LLM 응답 에러
 * - JUDGE_PROMPT: 점수 평가 완료
 * - JUDGE_END: 점수 평가 완료
 * - JUDGE_ERROR: 점수 평가 에러
 * - CHATTING_TITLE: 채팅 제목 수신
 * - SSE_COMPLETE: SSE 연결 종료
 */
export function setupSSEListeners({
  eventSource,
  aiMessageId,
  userMessageId,
  messageUUID,
  loadingMessageId,
  returnedChattingId,
  actualProjectId,
  isResend = false,
  skipTitleUpdate = false,
  eventSourcesRef,
  messageUUIDsRef,
  autoScrollEnabledRef,
  setMessages,
  setIsLoading,
  updateCurrentTitle,
  addChatToProject,
  updateChatTitle,
  defaultProjectId,
}: SetupSSEListenersParams): void {
  // messageUUID 매핑 저장
  messageUUIDsRef.current.set(aiMessageId, messageUUID);

  let isFirstChunk = true;
  let llmEnded = false;
  let judgeEnded = false;
  let hasError = false; // 에러 메시지가 이미 추가되었는지 추적
  let errorMessageId: string | null = null; // 추가된 에러 메시지의 ID 추적

  // 두 이벤트가 모두 완료되면 SSE 연결 끊기
  const checkAndCloseSSE = () => {
    if (llmEnded && judgeEnded) {
      eventSource.close();
      eventSourcesRef.current.delete(aiMessageId);
      messageUUIDsRef.current.delete(aiMessageId);
      autoScrollEnabledRef.current = false;
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMessageId ? { ...m, isStreaming: false } : m)),
      );
      setIsLoading(false);
    }
  };

  // LLM_START 이벤트
  eventSource.addEventListener('LLM_START', () => {
    autoScrollEnabledRef.current = true;

    if (loadingMessageId) {
      // 로딩 메시지를 AI 메시지로 교체 (새 메시지 전송 시)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMessageId
            ? {
                id: aiMessageId,
                type: 'ai',
                message: '',
                timestamp: new Date(),
                isStreaming: true,
              }
            : m,
        ),
      );
    }
  });

  // LLM_TOKEN 이벤트
  eventSource.addEventListener('LLM_TOKEN', (event) => {
    try {
      const data = JSON.parse(event.data);
      const token = data.token || '';

      if (isFirstChunk && loadingMessageId) {
        // 첫 번째 토큰: 로딩 메시지를 AI 메시지로 교체 (LLM_START가 안 온 경우 대비)
        isFirstChunk = false;
        autoScrollEnabledRef.current = true;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMessageId
              ? {
                  id: aiMessageId,
                  type: 'ai',
                  message: token,
                  timestamp: new Date(),
                  isStreaming: true,
                }
              : m.id === aiMessageId
                ? { ...m, message: m.message + token }
                : m,
          ),
        );
      } else {
        // 이후 토큰: 메시지에 추가
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMessageId ? { ...m, message: m.message + token } : m)),
        );
      }
    } catch (error) {
      console.error('Failed to parse LLM_TOKEN:', error);
    }
  });

  // JUDGE_PROMPT 이벤트 - 점수 정보 수신 (정상)
  eventSource.addEventListener('JUDGE_PROMPT', (event) => {
    try {
      const scoreData = JSON.parse(event.data) as PromptScoreType;
      setMessages((prev) =>
        prev.map((m) => (m.id === userMessageId ? { ...m, score: scoreData } : m)),
      );
    } catch (error) {
      console.error('Failed to parse JUDGE_PROMPT:', error);
    }
  });

  // LLM_END 이벤트 - LLM 스트리밍 완료
  eventSource.addEventListener('LLM_END', () => {
    llmEnded = true;

    // LLM 재전송인 경우 LLM_END에서 SSE 종료
    if (isResend) {
      eventSource.close();
      eventSourcesRef.current.delete(aiMessageId);
      messageUUIDsRef.current.delete(aiMessageId);
      autoScrollEnabledRef.current = false;
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMessageId ? { ...m, isStreaming: false } : m)),
      );
      setIsLoading(false);
    } else {
      checkAndCloseSSE();
    }
  });

  // JUDGE_END 이벤트 - 점수 평가 완료
  eventSource.addEventListener('JUDGE_END', () => {
    judgeEnded = true;
    checkAndCloseSSE();
  });

  // LLM_ERROR 이벤트 - LLM 응답 생성 실패
  // 결과: LLM 응답 X, 점수는 JUDGE 이벤트 대기
  eventSource.addEventListener('LLM_ERROR', () => {
    llmEnded = true; // LLM이 에러로 종료됨
    autoScrollEnabledRef.current = false;

    // AI 메시지와 로딩 메시지 제거
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== loadingMessageId && m.id !== aiMessageId);

      // 이미 JUDGE_ERROR로 에러 메시지가 추가된 경우 - 둘 다 에러
      if (hasError && errorMessageId) {
        // 기존 에러 메시지를 통합 메시지로 업데이트
        return filtered.map((m) =>
          m.id === errorMessageId
            ? { ...m, message: '응답을 생성하는 중 오류가 발생했습니다.', errorType: 'both' as const }
            : m,
        );
      }

      // 아직 에러 메시지가 없는 경우 새로 추가 (LLM만 에러, JUDGE는 대기 중)
      hasError = true;
      const newErrorId = crypto.randomUUID();
      errorMessageId = newErrorId;

      return [
        ...filtered,
        {
          id: newErrorId,
          type: 'error',
          message: 'AI 응답을 생성하는 중 오류가 발생했습니다.',
          timestamp: new Date(),
          errorType: 'llm' as const,
        },
      ];
    });

    // SSE 연결은 유지 (JUDGE 이벤트 대기)
  });

  // JUDGE_ERROR 이벤트 - 점수 생성 실패
  eventSource.addEventListener('JUDGE_ERROR', () => {
    judgeEnded = true; // judge 종료

    // LLM도 에러가 났는지 확인
    if (llmEnded) {
      // 둘 다 에러 - 기존 에러 메시지를 통합 메시지로 업데이트
      if (hasError && errorMessageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === errorMessageId
              ? { ...m, message: '응답을 생성하는 중 오류가 발생했습니다.', errorType: 'both' as const }
              : m,
          ),
        );
      } else {
        // LLM_ERROR가 먼저 왔지만 에러 메시지가 없는 경우 (예외 상황)
        hasError = true;
        const newErrorId = crypto.randomUUID();
        errorMessageId = newErrorId;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== loadingMessageId && m.id !== aiMessageId),
          {
            id: newErrorId,
            type: 'error',
            message: '응답을 생성하는 중 오류가 발생했습니다.',
            timestamp: new Date(),
            errorType: 'both' as const,
          },
        ]);
      }

      // 둘 다 에러이므로 SSE 종료
      eventSource.close();
      eventSourcesRef.current.delete(aiMessageId);
      messageUUIDsRef.current.delete(aiMessageId);
      setIsLoading(false);
    } else if (!hasError) {
      // 점수만 에러 (LLM은 정상 - 아직 스트리밍 중)
      hasError = true;
      const scoreErrorMessageId = crypto.randomUUID();
      errorMessageId = scoreErrorMessageId;

      setMessages((prev) => {
        const newMessages: ChatMessage[] = [];
        for (const msg of prev) {
          // AI 메시지 바로 앞에 에러 메시지 삽입
          if (msg.id === aiMessageId) {
            newMessages.push({
              id: scoreErrorMessageId,
              type: 'error' as const,
              message: '점수 정보를 생성하는 중 오류가 발생했습니다.',
              timestamp: new Date(),
              errorType: 'judge' as const,
            });
          }
          newMessages.push(msg);
        }
        return newMessages;
      });

      // LLM 응답은 계속 받으므로 SSE 연결 유지
    }

    // 새 채팅인 경우 "NEW CHAT" 제목으로 사이드바 업데이트
    if (returnedChattingId && actualProjectId) {
      const newTitle = 'NEW CHAT';
      updateCurrentTitle(newTitle);

      if (actualProjectId !== defaultProjectId) {
        // 프로젝트 채팅인 경우
        const existingChat = useProjectStore
          .getState()
          .projects.find((p: SidebarProjectItem) => p.projectId === actualProjectId)
          ?.chats.find((c: SidebarChatItem) => c.chattingId === returnedChattingId);

        if (!existingChat) {
          addChatToProject(actualProjectId, {
            chattingId: returnedChattingId,
            title: newTitle,
            projectId: actualProjectId,
          });
        } else {
          updateChatTitle(returnedChattingId, newTitle);
        }
      } else {
        // 일반 채팅인 경우
        const existingChat = useProjectStore
          .getState()
          .generalChats.find((c: SidebarChatItem) => c.chattingId === returnedChattingId);

        if (!existingChat) {
          const { generalChats } = useProjectStore.getState();
          const newChats = [
            { chattingId: returnedChattingId, title: newTitle, projectId: defaultProjectId! },
            ...generalChats,
          ];
          useProjectStore
            .getState()
            .setGeneralChats(newChats);
        } else {
          updateChatTitle(returnedChattingId, newTitle);
        }
      }
    }
    // LLM 응답은 계속 받으므로 SSE 연결 유지
    judgeEnded = true; // 점수 평가 실패로 judge 종료
  });

  // SSE_COMPLETE 이벤트
  eventSource.addEventListener('SSE_COMPLETE', () => {
    eventSource.close();
    eventSourcesRef.current.delete(aiMessageId);
    messageUUIDsRef.current.delete(aiMessageId);
    autoScrollEnabledRef.current = false;
    setMessages((prev) =>
      prev.map((m) => (m.id === aiMessageId ? { ...m, isStreaming: false } : m)),
    );
    setIsLoading(false);
  });

  // 에러 처리
  eventSource.onerror = () => {
    eventSource.close();
    eventSourcesRef.current.delete(aiMessageId);
    messageUUIDsRef.current.delete(aiMessageId);
    setMessages((prev) => {
      const filtered = prev
        .filter((m) => m.id !== loadingMessageId && m.id !== aiMessageId)
        .map((m) => (m.id === userMessageId ? { ...m, score: undefined } : m));
      return [
        ...filtered,
        {
          id: crypto.randomUUID(),
          type: 'error',
          message: '스트리밍 중 오류가 발생했습니다.',
          timestamp: new Date(),
        },
      ];
    });
    setIsLoading(false);
  };
}
