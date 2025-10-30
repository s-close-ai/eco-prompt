import { useEffect, useRef, useState } from 'react';
import UserMessage from '@/components/chat/UserMessage';
import AIMessage from '@/components/chat/AIMessage';
import PromptScore from '@/components/chat/PromptScore';
import ChatLoading from '@/components/chat/ChatLoading';
import ErrorMessage from '@/components/chat/ErrorMessage';
import { mockChatMessages } from '@/data/mockData';
import type { ChatMessage } from '@/types/chat.types';
import '@/styles/pages/chat.css';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages as ChatMessage[]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
  }, []);

  const handleSendMessage = (message: string) => {
    const newUserMessage: ChatMessage = {
      id: messages.length + 1,
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
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setTimeout(() => {
      const newAIMessage: ChatMessage = {
        id: messages.length + 2,
        type: 'ai',
        message: `"${message}"에 대한 응답입니다. 이것은 목 데이터를 통해 생성된 테스트 응답입니다.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newAIMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handleRetry = (errorMessageId: number) => {
    const errorIndex = messages.findIndex((m) => m.id === errorMessageId);
    if (errorIndex === -1) return;
    let userMessageToRetry: ChatMessage | null = null;
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        userMessageToRetry = messages[i];
        break;
      }
    }
    if (!userMessageToRetry) return;
    setMessages((prev) =>
      prev.filter((m) => m.id !== errorMessageId && m.id !== userMessageToRetry!.id),
    );
    handleSendMessage(userMessageToRetry.message);
  };

  return (
    <div className="chat-page-container">
      <div className="chat-messages">
        {messages.map((msg) => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id}>
                <UserMessage message={msg.message} />
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
