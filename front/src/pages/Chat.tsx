import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageList } from '@/components/chat/MessageList';
import MainChat from '@/components/home/MainChat';
import { getChattingMessages } from '@/services/api/chatting';
import { submitMessage, subscribeMessage, stopMessage } from '@/services/api/message';
import type { ChatMessage } from '@/types/chat.types';
import type { ChatLocationState } from '@/types/navigation.types';
import { useAppShell } from '@/context/AppShellContext';
import { useChatStore } from '@/store/chatStore';
import { useProjectStore } from '@/store/projectStore';
import { parseMessages } from '@/utils/messageParser';
import { useChatScroll } from '@/hooks/useChatScroll';
import { setupSSEListeners } from '@/utils/sseListeners';
import type { SidebarProjectItem, SidebarChatItem } from '@/types/sidebar.types';
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
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const messageUUIDsRef = useRef<Map<string, string>>(new Map()); // aiMessageId -> messageUUID 매핑
  const initialMessageSent = useRef(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isCreatingNewChatRef = useRef<boolean>(false);
  const firstNewMessageIdRef = useRef<string | null>(null); // 현재 세션에서 생성된 첫 메시지 ID

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
  }, [chattingId, currentPage, hasMoreMessages, isLoadingMore]);

  // 스크롤 관리 훅
  const {
    scrollContainerRef,
    messagesEndRef,
    messagesStartRef,
    showScrollToBottom,
    scrollToBottom,
    autoScrollEnabledRef,
    isUserAtBottomRef,
    previousScrollHeightRef,
    previousScrollTopRef,
    previousMessagesLengthRef,
    isInitialPositionedRef,
  } = useChatScroll({
    messages,
    isLoadingMore,
    hasMoreMessages,
    onLoadMore: loadMoreMessages,
    chattingId,
  });

  const handleStopGeneration = useCallback(async () => {
    // 스트리밍 중이거나 로딩 중인 마지막 메시지 찾기
    const lastStreamingOrLoadingMessage = [...messages]
      .reverse()
      .find((m) => m.isStreaming || m.type === 'loading');

    if (lastStreamingOrLoadingMessage) {
      // 스트리밍 중인 경우
      if (lastStreamingOrLoadingMessage.isStreaming) {
        const messageUUID = messageUUIDsRef.current.get(lastStreamingOrLoadingMessage.id);
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
      // 로딩 중인 경우 - 아직 messageUUID가 없을 수 있음
      else if (lastStreamingOrLoadingMessage.type === 'loading') {
        // 로딩 메시지 바로 앞의 유저 메시지 찾기
        const loadingIndex = messages.findIndex((m) => m.id === lastStreamingOrLoadingMessage.id);
        if (loadingIndex > 0) {
          // 로딩 메시지 앞에서 유저 메시지 찾기
          for (let i = loadingIndex - 1; i >= 0; i--) {
            if (messages[i].type === 'user' && messages[i].messageUUID) {
              try {
                await stopMessage(messages[i].messageUUID!);
              } catch (error) {
                console.error('로딩 중 메시지 중지 API 실패:', error);
              }
              break;
            }
          }
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
    } catch {
      // 일부 브라우저에서 지원하지 않을 수 있음
    }
    return () => {
      try {
        window.history.scrollRestoration = prev as typeof window.history.scrollRestoration;
      } catch {
        // 일부 브라우저에서 지원하지 않을 수 있음
      }
    };
  }, []);

  // 로그인 후 첫 접속 시 뒤로가기 방지
  useEffect(() => {
    const isFirstVisit = sessionStorage.getItem('first_visit_after_login');
    if (isFirstVisit === 'true') {
      // 뒤로가기 방지를 위한 이벤트 핸들러
      const preventBackNavigation = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      };

      // history state 설정
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', preventBackNavigation);

      // 플래그 제거 (한 번만 실행)
      sessionStorage.removeItem('first_visit_after_login');

      return () => {
        window.removeEventListener('popstate', preventBackNavigation);
      };
    }
  }, []);

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

      // 현재 세션에서 첫 새 메시지 추적
      if (firstNewMessageIdRef.current === null) {
        firstNewMessageIdRef.current = userMessageId;
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
          const userEl = container.querySelector(
            `[data-message-id="${userMessageId}"]`,
          ) as HTMLElement | null;
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
          prev.map((m) => (m.id === userMessageId ? { ...m, messageUUID } : m)),
        );

        // 새 채팅인 경우 URL 변경 (메시지 로드를 방지하기 위해 ref 사용)
        if (!currentChatId && returnedChattingId) {
          setCurrentChatting(returnedChattingId);
          // 메시지가 이미 추가되었으므로 로드하지 않도록 플래그 설정
          initialMessageSent.current = true;
          isCreatingNewChatRef.current = true; // 새 채팅 생성 중 플래그
          
          // 즉시 사이드바에 임시 제목으로 추가 (타이틀 이벤트를 받기 전에 나가도 표시되도록)
          const tempTitle = 'New Chat';
          updateCurrentTitle(tempTitle);
          
          if (actualProjectId !== defaultProjectId) {
            // 프로젝트 채팅인 경우
            addChatToProject(actualProjectId, {
              chattingId: returnedChattingId,
              title: tempTitle,
              projectId: actualProjectId,
            });
          } else {
            // 일반 채팅인 경우
            const { generalChats } = useProjectStore.getState();
            const newChats = [
              { chattingId: returnedChattingId, title: tempTitle, projectId: defaultProjectId! },
              ...generalChats,
            ];
            useProjectStore
              .getState()
              .setGeneralChats(newChats);
          }
          
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
        setupSSEListeners({
          eventSource,
          aiMessageId,
          userMessageId,
          messageUUID,
          loadingMessageId,
          returnedChattingId,
          actualProjectId,
          eventSourcesRef,
          messageUUIDsRef,
          autoScrollEnabledRef,
          setMessages,
          setIsLoading,
          updateCurrentTitle,
          addChatToProject,
          updateChatTitle,
          defaultProjectId,
        });

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
              .projects.find((p: SidebarProjectItem) => p.projectId === targetProjectId)
              ?.chats.find((c: SidebarChatItem) => c.chattingId === returnedChattingId);

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
              .generalChats.find((c: SidebarChatItem) => c.chattingId === returnedChattingId);

            if (!existingChat) {
              // 새로운 채팅이면 맨 위에 추가
              const { generalChats } = useProjectStore.getState();
              const newChats = [
                { chattingId: returnedChattingId, title: newTitle, projectId: defaultProjectId! },
                ...generalChats,
              ];
              useProjectStore
                .getState()
                .setGeneralChats(newChats);
            } else {
              // 기존 채팅이면 제목 업데이트 및 맨 위로 이동
              updateChatTitle(returnedChattingId, newTitle);
            }
          }
        });
      } catch {
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
      defaultProjectId,
    ],
  );

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 모든 SSE 연결 종료 및 로딩 상태 초기화
      eventSourcesRef.current.forEach((eventSource) => eventSource.close());
      setIsLoading(false);
    };
  }, [setIsLoading]);

  // 이전 스크롤 높이 저장 (무한 스크롤 로드 시)
  useEffect(() => {
    if (isLoadingMore && scrollContainerRef.current) {
      previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
      previousScrollTopRef.current = scrollContainerRef.current.scrollTop;
    }
  }, [isLoadingMore, previousScrollHeightRef, previousScrollTopRef, scrollContainerRef]);

  // 채팅방 메시지 로드
  useEffect(() => {
    const loadMessages = async () => {
      // 새 채팅 생성 중이면 메시지를 로드하지 않음 (SSE로 받고 있는 중)
      // 중요: SSE 연결을 끊지 않기 위해 가장 먼저 체크
      if (isCreatingNewChatRef.current) {
        // chattingId가 설정된 후 플래그 리셋
        isCreatingNewChatRef.current = false;
        return;
      }

      // 채팅방 전환 시 로딩 상태 초기화 및 기존 SSE 연결 종료
      setIsLoading(false);
      eventSourcesRef.current.forEach((eventSource) => eventSource.close());
      eventSourcesRef.current.clear();
      messageUUIDsRef.current.clear();

      // chatId가 없으면 새 채팅
      if (!chattingId) {
        setMessages([]);
        setCurrentChatting(null);
        initialMessageSent.current = false;
        isCreatingNewChatRef.current = false;
        setCurrentPage(0);
        setHasMoreMessages(false);
        previousMessagesLengthRef.current = 0;
        firstNewMessageIdRef.current = null; // 새 채팅 시작 시 리셋
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
        firstNewMessageIdRef.current = null; // 기존 채팅 로드 시 리셋

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
  }, [chattingId, setCurrentChatting]);

  // 초기 메시지 전송 (프로젝트에서 새 채팅 시작 시)
  useEffect(() => {
    const initialMessage = locationState?.message;
    if (initialMessage && !initialMessageSent.current && !chattingId) {
      initialMessageSent.current = true;
      handleSendMessage(initialMessage);
    }
  }, [locationState?.message, chattingId, handleSendMessage]);

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

    const errorMessage = messages[errorIndex];
    const errorType = errorMessage.errorType;

    let userMessageIndex = -1;
    let aiMessageIndex = -1;

    // 에러 타입에 따라 관련 메시지 찾기
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].type === 'user' && userMessageIndex === -1) {
        userMessageIndex = i;
      }
      if (messages[i].type === 'ai' && aiMessageIndex === -1) {
        aiMessageIndex = i;
      }
      if (userMessageIndex !== -1 && (errorType === 'judge' ? aiMessageIndex !== -1 : true)) {
        break;
      }
    }
    if (userMessageIndex === -1) return;

    const userMessageToRetry = messages[userMessageIndex];
    const actualMessageUUID = userMessageToRetry.messageUUID || userMessageToRetry.id;

    // 점수만 에러인 경우 - judgeMessage API 호출
    if (errorType === 'judge') {
      try {
        const { judgeMessage } = await import('@/services/api/message');
        const response = await judgeMessage({
          projectId: projectId ?? defaultProjectId!,
          chattingId: Number(chattingId),
          content: userMessageToRetry.message,
          messageUUID: actualMessageUUID,
        });

        // 에러 메시지 제거하고 점수 업데이트
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== errorMessageId)
            .map((m) =>
              m.id === userMessageToRetry.id
                ? { ...m, score: response.data.scoreInfo }
                : m
            ),
        );
      } catch (error) {
        console.error('Failed to retry judge:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === errorMessageId
              ? { ...m, message: '점수 재요청에 실패했습니다.' }
              : m,
          ),
        );
      }
      return;
    }

    // LLM만 에러인 경우 - resendAIMessage API 호출 및 SSE 연결
    if (errorType === 'llm') {
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
        const { resendAIMessage } = await import('@/services/api/message');
        await resendAIMessage({
          projectId: projectId ?? defaultProjectId!,
          chattingId: Number(chattingId),
          content: userMessageToRetry.message,
          messageUUID: actualMessageUUID,
        });

        // LLM 재요청은 messageUUID를 반환하지 않으므로 기존 messageUUID 사용
        // subscribeMessage API 사용 및 SSE 이벤트 리스너 설정 (isResend = true)
        const eventSource = subscribeMessage(actualMessageUUID);
        eventSourcesRef.current.set(aiMessageId, eventSource);
        setupSSEListeners({
          eventSource,
          aiMessageId,
          userMessageId: userMessageToRetry.id,
          messageUUID: actualMessageUUID,
          loadingMessageId: undefined,
          returnedChattingId: chattingId ? Number(chattingId) : undefined,
          actualProjectId: (projectId ?? defaultProjectId) || undefined,
          isResend: true, // LLM 재전송 플래그
          eventSourcesRef,
          messageUUIDsRef,
          autoScrollEnabledRef,
          setMessages,
          setIsLoading,
          updateCurrentTitle,
          addChatToProject,
          updateChatTitle,
          defaultProjectId,
        });
      } catch (error) {
        console.error('Failed to retry LLM:', error);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== aiMessageId);
          return [
            ...filtered,
            {
              id: crypto.randomUUID(),
              type: 'error',
              message: 'AI 응답 재요청에 실패했습니다.',
              timestamp: new Date(),
              errorType: 'llm' as const,
            },
          ];
        });
        setIsLoading(false);
      }
      return;
    }

    // 둘 다 에러이거나 errorType이 없는 경우(기존 에러) - updateMessage API 호출
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
      // updateMessage API 사용 (PATCH) - 둘 다 재요청
      const { updateMessage } = await import('@/services/api/message');
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
      setupSSEListeners({
        eventSource,
        aiMessageId,
        userMessageId: userMessageToRetry.id,
        messageUUID,
        loadingMessageId: undefined,
        returnedChattingId: chattingId ? Number(chattingId) : undefined,
        actualProjectId: (projectId ?? defaultProjectId) || undefined,
        eventSourcesRef,
        messageUUIDsRef,
        autoScrollEnabledRef,
        setMessages,
        setIsLoading,
        updateCurrentTitle,
        addChatToProject,
        updateChatTitle,
        defaultProjectId,
      });
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
      setupSSEListeners({
        eventSource,
        aiMessageId,
        userMessageId: messageId,
        messageUUID,
        loadingMessageId: undefined,
        returnedChattingId: chattingId ? Number(chattingId) : undefined,
        actualProjectId: (projectId ?? defaultProjectId) || undefined,
        eventSourcesRef,
        messageUUIDsRef,
        autoScrollEnabledRef,
        setMessages,
        setIsLoading,
        updateCurrentTitle,
        addChatToProject,
        updateChatTitle,
        defaultProjectId,
      });
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
            <MessageList
              messages={messages}
              lastUserMessageId={lastUserMessageId}
              lastMessageId={lastMessageId}
              firstNewMessageId={firstNewMessageIdRef.current}
              onEditAndResendMessage={handleEditAndResendMessage}
              onRetry={handleRetry}
            />
            <div ref={messagesEndRef} />
          </div>

          {showScrollToBottom && (
            <button
              className="scroll-to-bottom-btn"
              onClick={() => scrollToBottom(true)}
              aria-label="맨 아래로 가기"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
