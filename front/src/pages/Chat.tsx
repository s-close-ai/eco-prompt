import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import UserMessage from '@/components/chat/UserMessage';
import AIMessage from '@/components/chat/AIMessage';
import PromptScore from '@/components/chat/PromptScore';
import ErrorMessage from '@/components/chat/ErrorMessage';
import ChatLoading from '@/components/chat/ChatLoading';
import MainChat from '@/components/home/MainChat';
import { getChattingMessages } from '@/services/api/chatting';
import { submitMessage, subscribeMessage } from '@/services/api/message';
import type { ChatMessage, PromptScore as PromptScoreType } from '@/types/chat.types';
import type { ChatLocationState } from '@/types/navigation.types';
import { useAppShell } from '@/context/AppShellContext';
import { useChatStore } from '@/store/chatStore';
import { useProjectStore } from '@/store/projectStore';
import '@/styles/pages/chat.css';

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatId: chatIdFromParams } = useParams<{ chatId?: string }>();
  const { setOnStopGeneration } = useAppShell();

  const locationState = location.state as ChatLocationState | undefined;
  const chattingId = chatIdFromParams ? Number(chatIdFromParams) : locationState?.chatId;
  const projectId = locationState?.projectId;

  const { setCurrentChatting, updateCurrentTitle } = useChatStore();
  const { addChatToProject, updateChatTitle, moveChatToTop } = useProjectStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const initialMessageSent = useRef(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const previousScrollTopRef = useRef<number>(0);
  const previousMessagesLengthRef = useRef<number>(0);
  const shouldScrollToBottomRef = useRef<boolean>(false);
  const isCreatingNewChatRef = useRef<boolean>(false);

  const handleStopGeneration = useCallback(() => {
    const lastStreamingMessageId = [...messages].reverse().find((m) => m.isStreaming)?.id;
    if (lastStreamingMessageId) {
      const eventSource = eventSourcesRef.current.get(lastStreamingMessageId);
      eventSource?.close();
      eventSourcesRef.current.delete(lastStreamingMessageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === lastStreamingMessageId ? { ...m, isStreaming: false } : m)),
      );
    }
  }, [messages]);

  useEffect(() => {
    setOnStopGeneration(() => handleStopGeneration);
  }, [handleStopGeneration, setOnStopGeneration]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = useCallback(
    async (message: string) => {
      const userMessageId = crypto.randomUUID();
      const loadingMessageId = crypto.randomUUID();
      const aiMessageId = crypto.randomUUID();
      const currentChatId = chattingId;
      const currentProjectId = projectId;

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
        shouldScrollToBottomRef.current = true; // 새 메시지 추가 시 스크롤 필요
        return [...prev, newUserMessage, loadingMessage];
      });

      try {
        // submitMessage API 사용 (chattingId는 optional)
        const response = await submitMessage({
          projectId: currentProjectId ?? 1, // 1: default project
          chattingId: currentChatId ? Number(currentChatId) : undefined,
          content: message,
        });

        const { chattingId: returnedChattingId, messageUUID } = response.data;

        // 새 채팅인 경우 URL 변경 (메시지 로드를 방지하기 위해 ref 사용)
        if (!currentChatId && returnedChattingId) {
          setCurrentChatting(returnedChattingId);
          // 메시지가 이미 추가되었으므로 로드하지 않도록 플래그 설정
          initialMessageSent.current = true;
          isCreatingNewChatRef.current = true; // 새 채팅 생성 중 플래그
          navigate(`/chat/${returnedChattingId}`, { replace: true, state: { projectId: currentProjectId } });
        } else if (currentChatId && typeof currentChatId === 'number') {
          // 기존 채팅인 경우 맨 위로 이동
          moveChatToTop(currentChatId);
        }

        // subscribeMessage API 사용
        const eventSource = subscribeMessage(messageUUID);
        eventSourcesRef.current.set(aiMessageId, eventSource);

        let isFirstChunk = true;

        // LLM_START 이벤트
        eventSource.addEventListener('LLM_START', () => {
          // LLM 시작 시 로딩 메시지를 AI 메시지로 교체
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
        });

        // LLM_TOKEN 이벤트 - 실시간으로 토큰 하나씩 받기
        eventSource.addEventListener('LLM_TOKEN', (event) => {
          try {
            const data = JSON.parse(event.data);
            const token = data.token || '';

            if (isFirstChunk) {
              // 첫 번째 토큰: 로딩 메시지를 AI 메시지로 교체 (LLM_START가 안 온 경우 대비)
              isFirstChunk = false;
              shouldScrollToBottomRef.current = true; // 스트리밍 중에는 맨 아래로 스크롤
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
              shouldScrollToBottomRef.current = true; // 스트리밍 중에는 맨 아래로 스크롤
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMessageId ? { ...m, message: m.message + token } : m,
                ),
              );
            }
          } catch (error) {
            console.error('Failed to parse LLM_TOKEN:', error);
          }
        });

        // JUDGE_PROMPT 이벤트 - 점수 정보
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

        // CHATTING_TITLE 이벤트 - 채팅 제목
        eventSource.addEventListener('CHATTING_TITLE', (event) => {
          const newTitle = event.data; // 텍스트로 옴
          if (!newTitle || !returnedChattingId) return;

          // 현재 채팅 스토어 업데이트
          updateCurrentTitle(newTitle);

          // 사이드바 즉시 업데이트
          if (currentProjectId && currentProjectId !== 1) {
            // 프로젝트 채팅인 경우
            const existingChat = useProjectStore.getState().projects
              .find(p => p.projectId === currentProjectId)
              ?.chats.find(c => c.chattingId === returnedChattingId);

            if (!existingChat) {
              // 새로운 채팅이면 맨 위에 추가
              addChatToProject(currentProjectId, {
                chattingId: returnedChattingId,
                title: newTitle,
                projectId: currentProjectId,
              });
            } else {
              // 기존 채팅이면 제목 업데이트 및 맨 위로 이동
              updateChatTitle(returnedChattingId, newTitle);
            }
          } else {
            // 일반 채팅인 경우
            const existingChat = useProjectStore.getState().generalChats
              .find(c => c.chattingId === returnedChattingId);

            if (!existingChat) {
              // 새로운 채팅이면 맨 위에 추가
              const { generalChats } = useProjectStore.getState();
              useProjectStore.getState().setGeneralChats([
                { chattingId: returnedChattingId, title: newTitle, projectId: 1 },
                ...generalChats,
              ]);
            } else {
              // 기존 채팅이면 제목 업데이트 및 맨 위로 이동
              updateChatTitle(returnedChattingId, newTitle);
            }
          }
        });

        // SSE_COMPLETE 이벤트 - 스트리밍 완료
        eventSource.addEventListener('SSE_COMPLETE', () => {
          eventSource.close();
          eventSourcesRef.current.delete(aiMessageId);
          shouldScrollToBottomRef.current = true; // 스트리밍 완료 시 맨 아래로 스크롤
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMessageId ? { ...m, isStreaming: false } : m)),
          );
        });

        eventSource.onerror = () => {
          eventSource.close();
          eventSourcesRef.current.delete(aiMessageId);
          // 로딩/AI 메시지와 점수 제거하고 에러 표시
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
                message: '스트리밍 중 오류가 발생했습니다.',
                timestamp: new Date(),
              },
            ];
          });
        };
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
      }
    },
    [chattingId, projectId, navigate, setCurrentChatting, updateCurrentTitle, addChatToProject, updateChatTitle, moveChatToTop],
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

        shouldScrollToBottomRef.current = false; // 이전 메시지 로드 시 스크롤하지 않음
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
    else if (!isLoadingMore && currentMessagesLength > previousMessagesLength && shouldScrollToBottomRef.current) {
      // 약간의 지연을 두어 DOM 업데이트가 완료된 후 스크롤
      setTimeout(() => {
        scrollToBottom();
        shouldScrollToBottomRef.current = false;
      }, 0);
    }

    previousMessagesLengthRef.current = currentMessagesLength;
  }, [messages, isLoadingMore]);

  // 스크롤 이벤트 감지 (상단 도달 시 추가 로드)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop } = container;

      // 맨 위에서 100px 이내일 때 추가 로드
      if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);

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
        shouldScrollToBottomRef.current = true; // 초기 로드 시 맨 아래로 스크롤

        console.log('Initial load:', {
          messagesCount: loadedMessages.length,
          hasMore: !response.data.last,
          currentPage: 0,
        });
      } catch (error) {
        console.error('Failed to load messages:', error);
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

  // 초기 메시지 로드 시 맨 아래로 스크롤
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMore && previousMessagesLengthRef.current === 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [chattingId]);

  // Bottombar의 ChatInput에서 오는 메시지 처리
  useEffect(() => {
    const onChatInputSend = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) handleSendMessage(detail.message);
    };
    window.addEventListener('chat-input-send', onChatInputSend as EventListener);
    return () => window.removeEventListener('chat-input-send', onChatInputSend as EventListener);
  }, [handleSendMessage]);

  const handleRetry = (errorMessageId: string) => {
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
    setMessages((prev) => prev.slice(0, userMessageIndex));
    handleSendMessage(userMessageToRetry.message);
  };

  const handleEditAndResendMessage = async (messageId: string, newMessage: string) => {
    const userMessageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (userMessageIndex === -1) return;

    const userMessage = messages[userMessageIndex];
    const aiMessageId = crypto.randomUUID();

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
        projectId: projectId ?? 1,
        chattingId: Number(chattingId),
        content: newMessage,
        messageUUID: messageId,
      });

      const { messageUUID } = response.data;

      // subscribeMessage API 사용
      const eventSource = subscribeMessage(messageUUID);
      eventSourcesRef.current.set(aiMessageId, eventSource);

      // LLM_START 이벤트
      eventSource.addEventListener('LLM_START', () => {
        // 이미 AI 메시지가 있으므로 아무 작업 안 함
      });

      // LLM_TOKEN 이벤트 - 실시간으로 토큰 하나씩 받기
      eventSource.addEventListener('LLM_TOKEN', (event) => {
        try {
          const data = JSON.parse(event.data);
          const token = data.token || '';

          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, message: m.message + token } : m,
            ),
          );
        } catch (error) {
          console.error('Failed to parse LLM_TOKEN:', error);
        }
      });

      // JUDGE_PROMPT 이벤트 - 점수 정보
      eventSource.addEventListener('JUDGE_PROMPT', (event) => {
        try {
          const scoreData = JSON.parse(event.data) as PromptScoreType;
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, score: scoreData } : m)),
          );
        } catch (error) {
          console.error('Failed to parse JUDGE_PROMPT:', error);
        }
      });

      // SSE_COMPLETE 이벤트 - 스트리밍 완료
      eventSource.addEventListener('SSE_COMPLETE', () => {
        eventSource.close();
        eventSourcesRef.current.delete(aiMessageId);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMessageId ? { ...m, isStreaming: false } : m)),
        );
      });

      eventSource.onerror = () => {
        eventSource.close();
        eventSourcesRef.current.delete(aiMessageId);
        setMessages((prev) => {
          const filtered = prev
            .filter((m) => m.id !== aiMessageId)
            .map((m) =>
              m.id === messageId
                ? { ...m, score: undefined }
                : m,
            );
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
      };
    } catch (error) {
      console.error('Failed to update message:', error);
      setMessages((prev) => {
        const filtered = prev
          .filter((m) => m.id !== aiMessageId)
          .map((m) =>
            m.id === messageId
              ? { ...m, score: undefined }
              : m,
          );
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
    }
  };

  const lastUserMessageId = messages.reduce((lastId, msg) => {
    if (msg.type === 'user') {
      return msg.id;
    }
    return lastId;
  }, '');

  // chattingId가 없고 메시지도 없을 때 MainChat 표시
  const showMainChat = !chattingId && messages.length === 0;

  return (
    <div className="chat-page-container">
      {showMainChat ? (
        <MainChat />
      ) : (
        <div className="chat-messages" ref={scrollContainerRef}>
          <div ref={messagesStartRef} />
          {isLoadingMore && (
            <div style={{ textAlign: 'center', padding: '10px', color: '#999' }}>
              이전 메시지 불러오는 중...
            </div>
          )}
          {messages.map((msg) => {
            if (msg.type === 'user') {
              return (
                <div key={msg.id}>
                  <UserMessage
                    message={msg.message}
                    onUpdate={(newMessage) => handleEditAndResendMessage(msg.id, newMessage)}
                    isLastUserMessage={msg.id === lastUserMessageId}
                  />
                  {msg.score && <PromptScore scores={msg.score} totalScore={msg.score?.totalScore} />}
                </div>
              );
            }
            if (msg.type === 'error')
              return (
                <ErrorMessage
                  key={msg.id}
                  message={msg.message}
                  onRetry={() => handleRetry(msg.id)}
                />
              );
            if (msg.type === 'loading')
              return <ChatLoading key={msg.id} />;
            if (msg.type === 'ai')
              return (
                <AIMessage
                  key={msg.id}
                  message={msg.message}
                  timestamp={msg.timestamp}
                  isStreaming={msg.isStreaming}
                />
              );
            return null;
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
