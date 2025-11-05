import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import UserMessage from '@/components/chat/UserMessage';
import AIMessage from '@/components/chat/AIMessage';
import PromptScore from '@/components/chat/PromptScore';
import ChatLoading from '@/components/chat/ChatLoading';
import ErrorMessage from '@/components/chat/ErrorMessage';
import { mockChatMessages } from '@/data/mockData';
import type { ChatMessage } from '@/types/chat.types';
import type { ChatLocationState } from '@/types/navigation.types';
import { useAppShell } from '@/context/AppShellContext';
import '@/styles/pages/chat.css';

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const location = useLocation();
  const { isLoading, setIsLoading, setOnStopGeneration } = useAppShell();

  // 타입 안전한 방식으로 location state 추출
  const locationState = location.state as ChatLocationState | undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef(false);
  const aiResponseTimerRef = useRef<number | null>(null);

  const handleStopGeneration = useCallback(() => {
    if (aiResponseTimerRef.current) {
      clearTimeout(aiResponseTimerRef.current);
      aiResponseTimerRef.current = null;

      // 로딩 중에 중지되었으므로 빈 AI 메시지 추가
      setMessages((prev) => {
        const newAIMessage: ChatMessage = {
          id: prev.length + 1,
          type: 'ai',
          message: '', // 빈 메시지
          timestamp: new Date(),
        };
        return [...prev, newAIMessage];
      });
    }
    setIsLoading(false);
  }, [setIsLoading]);

  useEffect(() => {
    setOnStopGeneration(() => handleStopGeneration);
  }, [handleStopGeneration, setOnStopGeneration]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = useCallback(
    (message: string) => {
      setMessages((prev) => {
        const newUserMessage: ChatMessage = {
          id: prev.length + 1,
          type: 'user',
          message,
          timestamp: new Date(),
          score: {
            clarity: Math.floor(Math.random() * 5) + 20,
            specificity: Math.floor(Math.random() * 5) + 20,
            format: Math.floor(Math.random() * 5) + 20,
            completeness: Math.floor(Math.random() * 5) + 20,
            totalScore: Math.floor(Math.random() * 20) + 80,
          },
        };
        return [...prev, newUserMessage];
      });

      setIsLoading(true);
      aiResponseTimerRef.current = setTimeout(() => {
        setMessages((prev) => {
          const newAIMessage: ChatMessage = {
            id: prev.length + 1,
            type: 'ai',
            message: `"${message}"에 대한 응답입니다. 이것은 목 데이터를 통해 생성된 테스트 응답입니다.`,
            timestamp: new Date(),
          };
          return [...prev, newAIMessage];
        });
        setIsLoading(false);
      }, 2000);
    },
    [setIsLoading],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (aiResponseTimerRef.current) {
        clearTimeout(aiResponseTimerRef.current);
      }
    };
  }, []);

  // 채팅 데이터 로드
  useEffect(() => {
    if (!chatId) {
      // chatId가 없으면 목 데이터 로드 (기존 동작)
      setMessages(mockChatMessages as ChatMessage[]);
      initialMessageSent.current = true;
      return;
    }

    // TODO: 실제 API 호출로 chatId에 해당하는 메시지 로드
    // 현재는 목 데이터 사용
    const numericChatId = parseInt(chatId, 10);
    const isExistingChat = !isNaN(numericChatId) && numericChatId <= 4;

    if (isExistingChat) {
      // 기존 채팅 로드
      setMessages(mockChatMessages as ChatMessage[]);
      initialMessageSent.current = true;
    } else {
      // 새 채팅
      setMessages([]);
      initialMessageSent.current = false;
    }
  }, [chatId]);

  // 새 채팅인 경우 첫 메시지 자동 전송
  useEffect(() => {
    const initialMessage = locationState?.message;

    if (initialMessage && !initialMessageSent.current) {
      initialMessageSent.current = true;
      handleSendMessage(initialMessage);
    }
  }, [locationState, handleSendMessage]);

  // 스크롤 처리
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 하단바(ChatInput)에서 발생한 전역 이벤트 수신
  useEffect(() => {
    const onChatSend = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) handleSendMessage(detail.message);
    };
    window.addEventListener('chat-send', onChatSend as EventListener);
    return () => window.removeEventListener('chat-send', onChatSend as EventListener);
  }, [handleSendMessage]);

  const handleRetry = (errorMessageId: number) => {
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

    setMessages((prev) => {
      // Remove all messages from the user message up to and including the error message
      return prev.slice(0, userMessageIndex);
    });

    handleSendMessage(userMessageToRetry.message);
  };

  const handleEditAndResendMessage = (messageId: number, newMessage: string) => {
    let userMessageIndex = -1;

    setMessages((prev) => {
      userMessageIndex = prev.findIndex((msg) => msg.id === messageId);
      if (userMessageIndex === -1) return prev;

      // Find the next AI message to remove it
      let nextAiMessageIndex = -1;
      for (let i = userMessageIndex + 1; i < prev.length; i++) {
        if (prev[i].type === 'ai') {
          nextAiMessageIndex = i;
          break;
        }
      }

      let filteredMessages = [...prev];
      if (nextAiMessageIndex !== -1) {
        filteredMessages.splice(nextAiMessageIndex, 1);
      }
      filteredMessages.splice(userMessageIndex, 1);

      return filteredMessages;
    });

    handleSendMessage(newMessage);
  };

  // 마지막 user 메시지 ID 찾기
  const lastUserMessageId = messages.reduce((lastId, msg) => {
    if (msg.type === 'user') {
      return msg.id;
    }
    return lastId;
  }, -1);

  return (
    <div className="chat-page-container">
      <div className="chat-messages">
        {messages.map((msg) => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id}>
                <UserMessage
                  message={msg.message}
                  onUpdate={(newMessage) => handleEditAndResendMessage(msg.id, newMessage)}
                  isLastUserMessage={msg.id === lastUserMessageId}
                />
                {msg.score && (
                  <PromptScore
                    scores={{
                      clarity: msg.score.clarity,
                      specificity: msg.score.specificity,
                      format: msg.score.format,
                      completeness: msg.score.completeness,
                    }}
                    totalScore={msg.score.totalScore}
                  />
                )}
              </div>
            );
          }
          if (msg.type === 'loading') return <ChatLoading key={msg.id} />;
          if (msg.type === 'error')
            return (
              <ErrorMessage
                key={msg.id}
                message={msg.message}
                onRetry={() => handleRetry(msg.id)}
              />
            );
          if (msg.type === 'ai')
            return <AIMessage key={msg.id} message={msg.message} timestamp={msg.timestamp} />;
          return null;
        })}
        {isLoading && <ChatLoading />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
