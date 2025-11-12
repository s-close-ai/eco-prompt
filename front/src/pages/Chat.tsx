import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserMessage from '@/components/chat/UserMessage';
import AIMessage from '@/components/chat/AIMessage';
import PromptScore from '@/components/chat/PromptScore';
import ErrorMessage from '@/components/chat/ErrorMessage';
import ChatLoading from '@/components/chat/ChatLoading';
import MainChat from '@/components/home/MainChat';
import { getChattingMessages } from '@/services/api/chatting';
import { submitMessage, subscribeMessage, stopMessage } from '@/services/api/message';
import type { ChatMessage, PromptScore as PromptScoreType } from '@/types/chat.types';
import type { ChatLocationState } from '@/types/navigation.types';
import { useAppShell } from '@/context/AppShellContext';
import { useChatStore } from '@/store/chatStore';
import { useProjectStore } from '@/store/projectStore';
import '@/styles/pages/chat.css';

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOnStopGeneration, setIsLoading } = useAppShell();

  const locationState = location.state as ChatLocationState | undefined;
  const chattingId = locationState?.chatId;
  const projectId = locationState?.projectId;

  const { setCurrentChatting, updateCurrentTitle } = useChatStore();
  const { addChatToProject, updateChatTitle, moveChatToTop, defaultProjectId } = useProjectStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const messageUUIDsRef = useRef<Map<string, string>>(new Map()); // aiMessageId -> messageUUID 매핑
  const initialMessageSent = useRef(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const previousScrollTopRef = useRef<number>(0);
  const previousMessagesLengthRef = useRef<number>(0);
  const isCreatingNewChatRef = useRef<boolean>(false);
  const isUserAtBottomRef = useRef<boolean>(true); // 사용자가 맨 아래에 있는지 추적
  const isInitialPositionedRef = useRef<boolean>(false); // 초기 하단 위치 지정 완료 여부
  const autoScrollEnabledRef = useRef<boolean>(false); // 자동 스크롤 활성화 여부

  const handleStopGeneration = useCallback(async () => {
    const lastStreamingMessageId = [...messages].reverse().find((m) => m.isStreaming)?.id;
    if (lastStreamingMessageId) {
      const messageUUID = messageUUIDsRef.current.get(lastStreamingMessageId);
      
      // API 호출로 서버에 중지 요청 (SSE 연결은 유지 - SSE_COMPLETE를 기다림)
      if (messageUUID) {
        try {
          await stopMessage(messageUUID);
          // SSE 연결은 백엔드가 SSE_COMPLETE를 보낼 때까지 유지
          // SSE_COMPLETE 이벤트에서 정리됨
        } catch (error) {
          console.error('메시지 중지 API 실패:', error);
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    setOnStopGeneration(() => handleStopGeneration);
  }, [handleStopGeneration, setOnStopGeneration]);

  // 브라우저 기본 스크롤 복원 방지 (내부 스크롤 컨테이너를 직접 제어)
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = 'manual';
    } catch {}
    return () => {
      try {
        window.history.scrollRestoration = prev as typeof window.history.scrollRestoration;
      } catch {}
    };
  }, []);

  // 맨 아래로 스크롤
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        container.scrollTo({
          top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
        });
      }
    });
  }, []);


  // 스크롤 위치 감지
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    const threshold = 200; // 200px 이상 올라가면 버튼 표시
    const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;

    isUserAtBottomRef.current = isAtBottom;
    setShowScrollToBottom(!isAtBottom && messages.length > 0);
  }, [messages.length]);

  // SSE 이벤트 리스너 설정 공통 함수
  const setupSSEListeners = useCallback(
    (
      eventSource: EventSource,
      aiMessageId: string,
      userMessageId: string,
      messageUUID: string,
      loadingMessageId?: string,
      returnedChattingId?: number,
      actualProjectId?: number,
    ) => {
      // messageUUID 매핑 저장
      messageUUIDsRef.current.set(aiMessageId, messageUUID);

      let isFirstChunk = true;
      let llmEnded = false;
      let judgeEnded = false;

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
        checkAndCloseSSE();
      });

      // JUDGE_END 이벤트 - 점수 평가 완료
      eventSource.addEventListener('JUDGE_END', () => {
        judgeEnded = true;
        checkAndCloseSSE();
      });

      // LLM_ERROR 이벤트 - LLM 응답 생성 실패
      // 결과: LLM 응답 X, 점수 X, 에러 메시지 O
      eventSource.addEventListener('LLM_ERROR', () => {
        llmEnded = true; // LLM이 에러로 종료됨
        judgeEnded = true; // LLM 에러 시 점수도 없으므로 judge도 종료로 간주
        
        eventSource.close();
        eventSourcesRef.current.delete(aiMessageId);
        messageUUIDsRef.current.delete(aiMessageId);
        autoScrollEnabledRef.current = false;
        
        // LLM 응답이 없으므로 AI 메시지와 로딩 메시지 제거
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== loadingMessageId && m.id !== aiMessageId);
          // 에러 메시지 추가
          return [
            ...filtered,
            {
              id: crypto.randomUUID(),
              type: 'error',
              message: 'AI 응답을 생성하는 중 오류가 발생했습니다.',
              timestamp: new Date(),
            },
          ];
        });
        setIsLoading(false);
      });

      // JUDGE_ERROR 이벤트 - 점수 생성 실패
      // 결과: LLM 응답 O (계속 받음), 점수 X, 에러 메시지 X
      eventSource.addEventListener('JUDGE_ERROR', () => {
        // 점수만 생성 실패, LLM 응답은 계속 받음
        // 새 채팅인 경우 "NEW CHAT" 제목으로 사이드바 업데이트
        if (returnedChattingId && actualProjectId) {
          const newTitle = 'NEW CHAT';
          updateCurrentTitle(newTitle);

          if (actualProjectId !== defaultProjectId) {
            // 프로젝트 채팅인 경우
            const existingChat = useProjectStore
              .getState()
              .projects.find((p) => p.projectId === actualProjectId)
              ?.chats.find((c) => c.chattingId === returnedChattingId);

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
              .generalChats.find((c) => c.chattingId === returnedChattingId);

            if (!existingChat) {
              const { generalChats } = useProjectStore.getState();
              const newChats = [
                { chattingId: returnedChattingId, title: newTitle, projectId: defaultProjectId! },
                ...generalChats,
              ];
              useProjectStore
                .getState()
                .setGeneralChats(newChats.length > 5 ? newChats.slice(0, 5) : newChats);
            } else {
              updateChatTitle(returnedChattingId, newTitle);
            }
          }
        }
        // LLM 응답은 계속 받으므로 SSE 연결 유지
        // 에러 메시지 표시하지 않음
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
    },
    [setIsLoading, updateCurrentTitle, addChatToProject, updateChatTitle, defaultProjectId],
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      // 스트리밍 중이면 새로운 메시지 전송 방지
      const isCurrentlyStreaming = messages.some((m) => m.isStreaming);
      if (isCurrentlyStreaming) {
        return;
      }

      const userMessageId = crypto.randomUUID();
      const loadingMessageId = crypto.randomUUID();
      const aiMessageId = crypto.randomUUID();
      const currentChatId = chattingId;
      const currentProjectId = projectId;
      // API에 실제로 전달될 projectId
      // currentProjectId가 있으면 그것을 사용 (프로젝트 내부에서 채팅)
      // 없으면 기본 프로젝트 사용 (새 채팅)
      const actualProjectId = currentProjectId ?? defaultProjectId;

      if (!actualProjectId) {
        console.error('기본 프로젝트 ID가 설정되지 않았습니다.');
        return;
      }

      // 로딩 상태 시작
      setIsLoading(true);

      const newUserMessage: ChatMessage = {
        id: userMessageId,
        type: 'user',
        message,
        timestamp: new Date(),
      };

      const loadingMessage: ChatMessage = {
        id: loadingMessageId,
        type: 'loading',
        message: '',
        timestamp: new Date(),
      };

      setMessages((prev) => {
        return [...prev, newUserMessage, loadingMessage];
      });

      // 전송 직후: 사용자 메시지가 화면 최상단에 오도록 스크롤
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = scrollContainerRef.current;
          if (!container) return;
          const userEl = container.querySelector(`[data-message-id="${userMessageId}"]`) as HTMLElement | null;
          if (userEl) {
            // 사용자 메시지를 화면 최상단에 배치 (padding 24px 고려)
            container.scrollTo({ top: userEl.offsetTop - 24, behavior: 'auto' });
          }
        });
      });

      // 스트리밍 동안은 자동 스크롤 비활성화 (공간이 자연스럽게 생기도록)
      autoScrollEnabledRef.current = false;
      isUserAtBottomRef.current = false;

      try {
        // submitMessage API 사용 (chattingId는 optional)
        const response = await submitMessage({
          projectId: actualProjectId,
          chattingId: currentChatId ? Number(currentChatId) : undefined,
          content: message,
        });

        const { chattingId: returnedChattingId, messageUUID } = response.data;

        // 사용자 메시지에 서버의 messageUUID 저장
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessageId ? { ...m, messageUUID } : m,
          ),
        );

        // 새 채팅인 경우 URL 변경 (메시지 로드를 방지하기 위해 ref 사용)
        if (!currentChatId && returnedChattingId) {
          setCurrentChatting(returnedChattingId);
          // 메시지가 이미 추가되었으므로 로드하지 않도록 플래그 설정
          initialMessageSent.current = true;
          isCreatingNewChatRef.current = true; // 새 채팅 생성 중 플래그
          // 실제 사용된 projectId를 state에 저장
          navigate('/chat', {
            replace: true,
            state: { chatId: returnedChattingId, projectId: actualProjectId },
          });
        } else if (currentChatId && typeof currentChatId === 'number') {
          // 기존 채팅인 경우 맨 위로 이동
          moveChatToTop(currentChatId);
        }

        // subscribeMessage API 사용
        const eventSource = subscribeMessage(messageUUID);
        eventSourcesRef.current.set(aiMessageId, eventSource);

        // SSE 이벤트 리스너 설정
        setupSSEListeners(
          eventSource,
          aiMessageId,
          userMessageId,
          messageUUID,
          loadingMessageId,
          returnedChattingId,
          actualProjectId,
        );

        // CHATTING_TITLE 이벤트 - 채팅 제목
        eventSource.addEventListener('CHATTING_TITLE', (event) => {
          const newTitle = event.data; // 텍스트로 옴
          if (!newTitle || !returnedChattingId) return;

          // 현재 채팅 스토어 업데이트
          updateCurrentTitle(newTitle);

          // 사이드바 즉시 업데이트 - API에 실제로 전달된 projectId 사용
          const targetProjectId = actualProjectId;

          if (targetProjectId !== defaultProjectId) {
            // 프로젝트 채팅인 경우 (기본 프로젝트가 아닌 경우)
            const existingChat = useProjectStore
              .getState()
              .projects.find((p) => p.projectId === targetProjectId)
              ?.chats.find((c) => c.chattingId === returnedChattingId);

            if (!existingChat) {
              // 새로운 채팅이면 맨 위에 추가
              addChatToProject(targetProjectId, {
                chattingId: returnedChattingId,
                title: newTitle,
                projectId: targetProjectId,
              });
            } else {
              // 기존 채팅이면 제목 업데이트 및 맨 위로 이동
              updateChatTitle(returnedChattingId, newTitle);
            }
          } else {
            // 일반 채팅인 경우 (기본 프로젝트)
            const existingChat = useProjectStore
              .getState()
              .generalChats.find((c) => c.chattingId === returnedChattingId);

            if (!existingChat) {
              // 새로운 채팅이면 맨 위에 추가 (5개 제한)
              const { generalChats } = useProjectStore.getState();
              const newChats = [
                { chattingId: returnedChattingId, title: newTitle, projectId: defaultProjectId! },
                ...generalChats,
              ];
              useProjectStore
                .getState()
                .setGeneralChats(newChats.length > 5 ? newChats.slice(0, 5) : newChats);
            } else {
              // 기존 채팅이면 제목 업데이트 및 맨 위로 이동
              updateChatTitle(returnedChattingId, newTitle);
            }
          }
        });
      } catch (error) {
        // API 호출 실패 시 로딩/AI 메시지와 점수 제거하고 에러 표시
        setMessages((prev) => {
          const filtered = prev
            .filter((m) => m.id !== loadingMessageId && m.id !== aiMessageId) // 로딩/AI 메시지 제거
            .map((m) =>
              m.id === userMessageId
                ? { ...m, score: undefined } // 점수 제거
                : m,
            );
          // 에러 메시지 추가
          return [
            ...filtered,
            {
              id: crypto.randomUUID(),
              type: 'error',
              message: '메시지 전송에 실패했습니다.',
              timestamp: new Date(),
            },
          ];
        });
        setIsLoading(false);
      }
    },
    [
      chattingId,
      projectId,
      defaultProjectId,
      navigate,
      setCurrentChatting,
      updateCurrentTitle,
      addChatToProject,
      updateChatTitle,
      moveChatToTop,
      setIsLoading,
      messages,
      setupSSEListeners,
    ],
  );

  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach((eventSource) => eventSource.close());
    };
  }, []);

  // 메시지를 파싱하는 함수
  const parseMessages = useCallback((apiMessages: any[]) => {
    const loadedMessages: ChatMessage[] = [];

    // API 응답은 최신 메시지가 먼저 오므로 reverse하여 오래된 메시지부터 처리
    apiMessages.reverse().forEach((msg) => {
      // User Message
      if (msg.userMessage && msg.userMessage.content) {
        loadedMessages.push({
          id: msg.userMessage.messageUUID,
          type: 'user',
          message: msg.userMessage.content,
          timestamp: new Date(),
          messageUUID: msg.userMessage.messageUUID, // 서버의 messageUUID 저장
          score: msg.scoreMessage?.scoreInfo ? {
            clarityScore: msg.scoreMessage.scoreInfo.clarityScore,
            specificityScore: msg.scoreMessage.scoreInfo.specificityScore,
            formatScore: msg.scoreMessage.scoreInfo.formatScore,
            safetyScore: msg.scoreMessage.scoreInfo.safetyScore,
            totalScore: msg.scoreMessage.scoreInfo.totalScore,
          } : undefined,
        });
      }

      // AI Message 또는 Error
      if (msg.aiMessage) {
        if (msg.aiMessage.messageStatus === 'ERROR') {
          // AI 응답 에러
          loadedMessages.push({
            id: crypto.randomUUID(),
            type: 'error',
            message: 'AI 응답을 생성하는 중 오류가 발생했습니다.',
            timestamp: new Date(),
          });
        } else if (msg.aiMessage.content) {
          // 정상 AI 메시지
          loadedMessages.push({
            id: crypto.randomUUID(),
            type: 'ai',
            message: msg.aiMessage.content,
            timestamp: new Date(),
          });
        }
      }

      // Score Error 체크 (AI 메시지가 없거나 정상일 때만)
      if (msg.scoreMessage?.messageStatus === 'ERROR' && msg.aiMessage?.messageStatus !== 'ERROR') {
        loadedMessages.push({
          id: crypto.randomUUID(),
          type: 'error',
          message: '점수 정보를 생성하는 중 오류가 발생했습니다.',
          timestamp: new Date(),
        });
      }
    });

    return loadedMessages;
  }, []);

  // 추가 메시지 로드 (무한 스크롤)
  const loadMoreMessages = useCallback(async () => {
    if (!chattingId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const response = await getChattingMessages(Number(chattingId), nextPage);
      const apiMessages = response.data.content;
      const newMessages = parseMessages(apiMessages);

      if (newMessages.length > 0) {
        // 이전 스크롤 높이와 스크롤 위치 저장
        if (scrollContainerRef.current) {
          previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
          previousScrollTopRef.current = scrollContainerRef.current.scrollTop;
        }

        setMessages((prev) => [...newMessages, ...prev]);
        setCurrentPage(nextPage);
        setHasMoreMessages(!response.data.last);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chattingId, currentPage, hasMoreMessages, isLoadingMore, parseMessages]);

  // 스크롤 위치 관리
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const currentMessagesLength = messages.length;
    const previousMessagesLength = previousMessagesLengthRef.current;

    // 이전 메시지 로드 완료 후 새로 불러온 메시지의 맨 아래로 스크롤
    if (!isLoadingMore && previousScrollHeightRef.current > 0) {
      const currentScrollHeight = container.scrollHeight;
      const previousScrollHeight = previousScrollHeightRef.current;

      if (currentScrollHeight > previousScrollHeight) {
        // 새 메시지가 위에 추가되었으므로, 새로 불러온 메시지의 맨 아래로 스크롤
        const scrollDifference = currentScrollHeight - previousScrollHeight;
        container.scrollTop = scrollDifference;
        previousScrollHeightRef.current = 0;
        previousScrollTopRef.current = 0;
      }
    }
    // 새 메시지가 맨 아래에 추가된 경우 (메시지 수가 증가하고, 로딩 중이 아닐 때)
    else if (!isLoadingMore && currentMessagesLength > previousMessagesLength) {
      const isStreaming = messages.some((m) => m.isStreaming);
      
      // 자동 스크롤이 활성화되고 스트리밍 중이며 사용자가 맨 아래에 있을 때만 자동 스크롤
      if (autoScrollEnabledRef.current && isStreaming && isUserAtBottomRef.current) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth',
            });
          }
        });
      }
    }

    previousMessagesLengthRef.current = currentMessagesLength;
  }, [messages, isLoadingMore]);

  // 스크롤 이벤트 감지 (상단 도달 시 추가 로드 + 사용자가 맨 아래에 있는지 체크)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 초기 하단 위치 지정 전에는 무한 스크롤 로딩 금지 (초기 로드시 위 페이지로 당겨오는 현상 방지)
      if (!isInitialPositionedRef.current) return;
      const { scrollTop } = container;

      // 스크롤 위치 감지
      checkScrollPosition();

      // 맨 위에서 100px 이내일 때 추가 로드
      if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
        loadMoreMessages();
      }
    };

    // 스크롤 이벤트에 쓰로틀링 적용 (성능 최적화)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const throttledHandleScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 50);
    };

    container.addEventListener('scroll', throttledHandleScroll);
    return () => {
      container.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages, checkScrollPosition]);

  // 채팅방 메시지 로드
  useEffect(() => {
    const loadMessages = async () => {
      // chatId가 없으면 새 채팅
      if (!chattingId) {
        setMessages([]);
        setCurrentChatting(null);
        initialMessageSent.current = false;
        isCreatingNewChatRef.current = false;
        setCurrentPage(0);
        setHasMoreMessages(false);
        previousMessagesLengthRef.current = 0;
        return;
      }

      // 새 채팅 생성 중이면 메시지를 로드하지 않음 (SSE로 받고 있는 중)
      if (isCreatingNewChatRef.current) {
        // chattingId가 설정된 후 플래그 리셋
        isCreatingNewChatRef.current = false;
        return;
      }

      const currentChattingId = Number(chattingId);
      setCurrentChatting(currentChattingId);

      try {
        // 실제 API로 메시지 로드 (첫 페이지)
        const response = await getChattingMessages(currentChattingId, 0);
        const apiMessages = response.data.content;
        const loadedMessages = parseMessages(apiMessages);

        setMessages(loadedMessages);
        setCurrentPage(0);
        setHasMoreMessages(!response.data.last);
        initialMessageSent.current = true;
        previousMessagesLengthRef.current = loadedMessages.length;

        // 메시지 로드 후 즉시 맨 아래로 이동
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const container = scrollContainerRef.current;
              container.scrollTop = container.scrollHeight;
              isInitialPositionedRef.current = true;
            } else if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
              isInitialPositionedRef.current = true;
            }
          });
        });

        console.log('Initial load:', {
          messagesCount: loadedMessages.length,
          hasMore: !response.data.last,
          currentPage: 0,
        });
      } catch (error) {
        console.error('Failed to load messages:', error);
        setError(error as Error);
        setMessages([]);
        setCurrentPage(0);
        setHasMoreMessages(false);
        initialMessageSent.current = false;
        previousMessagesLengthRef.current = 0;
      }
    };

    loadMessages();
  }, [chattingId, setCurrentChatting, parseMessages]);

  // 초기 메시지 전송 (프로젝트에서 새 채팅 시작 시)
  useEffect(() => {
    const initialMessage = locationState?.message;
    if (initialMessage && !initialMessageSent.current && !chattingId) {
      initialMessageSent.current = true;
      handleSendMessage(initialMessage);
    }
  }, [locationState?.message, chattingId, handleSendMessage]);

  // 초기 메시지 로드 시 맨 아래로 스크롤 (백업 로직)
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMore) {
      // 채팅방이 변경되었을 때
      const isNewChat = previousMessagesLengthRef.current === 0;
      if (isNewChat) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const container = scrollContainerRef.current;
              container.scrollTop = container.scrollHeight;
              isInitialPositionedRef.current = true;
            } else if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
              isInitialPositionedRef.current = true;
            }
          });
        });
      }
    }
  }, [messages.length, chattingId, isLoadingMore]);

  // Bottombar의 ChatInput에서 오는 메시지 처리
  useEffect(() => {
    const onChatInputSend = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) handleSendMessage(detail.message);
    };
    window.addEventListener('chat-input-send', onChatInputSend as EventListener);
    return () => window.removeEventListener('chat-input-send', onChatInputSend as EventListener);
  }, [handleSendMessage]);

  const handleRetry = async (errorMessageId: string) => {
    // 스트리밍 중이면 재시도 방지
    const isCurrentlyStreaming = messages.some((m) => m.isStreaming);
    if (isCurrentlyStreaming) {
      return;
    }

    const errorIndex = messages.findIndex((m) => m.id === errorMessageId);
    if (errorIndex === -1) return;

    let userMessageIndex = -1;
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        userMessageIndex = i;
        break;
      }
    }
    if (userMessageIndex === -1) return;

    const userMessageToRetry = messages[userMessageIndex];
    const aiMessageId = crypto.randomUUID();

    // 로딩 상태 시작
    setIsLoading(true);

    // 에러 메시지를 제거하고 새 AI 응답을 추가
    setMessages((prev) => [
      ...prev.slice(0, errorIndex),
      {
        id: aiMessageId,
        type: 'ai',
        message: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      // updateMessage API 사용 (PATCH)
      const { updateMessage } = await import('@/services/api/message');
      const actualMessageUUID = userMessageToRetry.messageUUID || userMessageToRetry.id;
      const response = await updateMessage({
        projectId: projectId ?? defaultProjectId!,
        chattingId: Number(chattingId),
        content: userMessageToRetry.message,
        messageUUID: actualMessageUUID,
      });

      const { messageUUID } = response.data;

      // subscribeMessage API 사용 및 SSE 이벤트 리스너 설정
      const eventSource = subscribeMessage(messageUUID);
      eventSourcesRef.current.set(aiMessageId, eventSource);
      setupSSEListeners(
        eventSource,
        aiMessageId,
        userMessageToRetry.id,
        messageUUID,
        undefined,
        chattingId ? Number(chattingId) : undefined,
        (projectId ?? defaultProjectId) || undefined,
      );
    } catch (error) {
      console.error('Failed to retry message:', error);
      setMessages((prev) => {
        const filtered = prev
          .filter((m) => m.id !== aiMessageId)
          .map((m) => (m.id === userMessageToRetry.id ? { ...m, score: undefined } : m));
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            type: 'error',
            message: '메시지 재전송에 실패했습니다.',
            timestamp: new Date(),
          },
        ];
      });
      setIsLoading(false);
    }
  };

  const handleEditAndResendMessage = async (messageId: string, newMessage: string) => {
    // 스트리밍 중이면 수정 및 재전송 방지
    const isCurrentlyStreaming = messages.some((m) => m.isStreaming);
    if (isCurrentlyStreaming) {
      return;
    }

    const userMessageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (userMessageIndex === -1) return;

    const userMessage = messages[userMessageIndex];
    // 서버의 실제 messageUUID 사용 (없으면 id 사용 - 로드된 메시지의 경우 id가 messageUUID임)
    const actualMessageUUID = userMessage.messageUUID || userMessage.id;
    const aiMessageId = crypto.randomUUID();

    // 로딩 상태 시작
    setIsLoading(true);

    // 기존 메시지들을 제거하고 수정된 메시지와 새 AI 응답을 추가
    setMessages((prev) => [
      ...prev.slice(0, userMessageIndex),
      { ...userMessage, message: newMessage, score: undefined },
      {
        id: aiMessageId,
        type: 'ai',
        message: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      // updateMessage API 사용
      const { updateMessage } = await import('@/services/api/message');
      const response = await updateMessage({
        projectId: projectId ?? defaultProjectId!,
        chattingId: Number(chattingId),
        content: newMessage,
        messageUUID: actualMessageUUID,
      });

      const { messageUUID } = response.data;

      // subscribeMessage API 사용 및 SSE 이벤트 리스너 설정
      const eventSource = subscribeMessage(messageUUID);
      eventSourcesRef.current.set(aiMessageId, eventSource);
      setupSSEListeners(
        eventSource,
        aiMessageId,
        messageId,
        messageUUID,
        undefined,
        chattingId ? Number(chattingId) : undefined,
        (projectId ?? defaultProjectId) || undefined,
      );
    } catch (error) {
      console.error('Failed to update message:', error);
      setMessages((prev) => {
        const filtered = prev
          .filter((m) => m.id !== aiMessageId)
          .map((m) => (m.id === messageId ? { ...m, score: undefined } : m));
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            type: 'error',
            message: '메시지 수정에 실패했습니다.',
            timestamp: new Date(),
          },
        ];
      });
      setIsLoading(false);
    }
  };

  const lastUserMessageId = messages.reduce((lastId, msg) => {
    if (msg.type === 'user') {
      return msg.id;
    }
    return lastId;
  }, '');

  // 마지막 메시지 ID 찾기
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : '';

  // chattingId가 없고 메시지도 없을 때 MainChat 표시
  const showMainChat = !chattingId && messages.length === 0;

  // 에러 발생 시 에러 페이지 표시
  if (error) {
    return (
      <div className="chat-page-container">
        <div className="chat-error-page">
          <div className="chat-error-content">
            <h2>채팅을 불러올 수 없습니다</h2>
            <p>{error.message || '채팅방을 찾을 수 없거나 접근 권한이 없습니다.'}</p>
            <button className="chat-error-back-btn" onClick={() => navigate('/chat')}>
              새 채팅 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page-container">
      {showMainChat ? (
        <MainChat />
      ) : (
        <>
          <div className="chat-messages" ref={scrollContainerRef}>
            <div ref={messagesStartRef} />
            {isLoadingMore && (
              <div style={{ textAlign: 'center', padding: '10px', color: '#999' }}>
                이전 메시지 불러오는 중...
              </div>
            )}
            {(() => {
              const grouped: React.JSX.Element[] = [];
              let currentGroup: React.JSX.Element[] = [];
              let currentUserMsgId = '';
              let isCurrentGroupStreaming = false;

              messages.forEach((msg) => {
                if (msg.type === 'user') {
                  // 이전 그룹이 있으면 저장
                  if (currentGroup.length > 0) {
                    grouped.push(
                      <div
                        key={currentUserMsgId}
                        className={`chat-message-group ${isCurrentGroupStreaming ? 'streaming' : 'completed'}`}
                        data-message-id={currentUserMsgId}
                      >
                        {currentGroup}
                      </div>
                    );
                  }
                  // 새 그룹 시작
                  currentUserMsgId = msg.id;
                  isCurrentGroupStreaming = false;
                  currentGroup = [
                    <UserMessage
                      key={`user-${msg.id}`}
                      message={msg.message}
                      onUpdate={(newMessage) => handleEditAndResendMessage(msg.id, newMessage)}
                      isLastUserMessage={msg.id === lastUserMessageId}
                    />
                  ];
                  if (msg.score) {
                    currentGroup.push(
                      <PromptScore key={`score-${msg.id}`} scores={msg.score} totalScore={msg.score?.totalScore} />
                    );
                  }
                } else if (msg.type === 'ai') {
                  if (msg.isStreaming) {
                    isCurrentGroupStreaming = true;
                  }
                  currentGroup.push(
                    <AIMessage
                      key={`ai-${msg.id}`}
                      message={msg.message}
                      timestamp={msg.timestamp}
                      isStreaming={msg.isStreaming}
                    />
                  );
                } else if (msg.type === 'loading') {
                  isCurrentGroupStreaming = true;
                  currentGroup.push(<ChatLoading key={`loading-${msg.id}`} />);
                } else if (msg.type === 'error') {
                  currentGroup.push(
                    <ErrorMessage
                      key={`error-${msg.id}`}
                      message={msg.message}
                      onRetry={() => handleRetry(msg.id)}
                      isLastError={msg.id === lastMessageId}
                    />
                  );
                }
              });

              // 마지막 그룹 추가
              if (currentGroup.length > 0) {
                grouped.push(
                  <div
                    key={currentUserMsgId}
                    className={`chat-message-group ${isCurrentGroupStreaming ? 'streaming' : 'completed'}`}
                    data-message-id={currentUserMsgId}
                  >
                    {currentGroup}
                  </div>
                );
              }

              return grouped;
            })()}
            <div ref={messagesEndRef} />
          </div>
          
          {showScrollToBottom && (
            <button
              className="scroll-to-bottom-btn"
              onClick={() => scrollToBottom(true)}
              aria-label="맨 아래로 가기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M19 12l-7 7-7-7" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
