import { useState, useRef, useEffect } from 'react';
import { UserMessage, AIMessage, PromptScore, ChatInput, ChatLoading, ErrorMessage } from '@/components/chat';
import { mockChatMessages } from '@/data/mockData';
import type { ChatMessage } from '@/data/mockData';
import '@/styles/pages/chat.css';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = (message: string) => {
    // 새 사용자 메시지 추가 (프롬프트 점수 포함)
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

    // AI 응답 시뮬레이션 (2초 후)
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
    // 에러 메시지의 인덱스 찾기
    const errorIndex = messages.findIndex((msg) => msg.id === errorMessageId);

    if (errorIndex === -1) return;

    // 에러 메시지 이전의 사용자 메시지 찾기
    let userMessageToRetry: ChatMessage | null = null;
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        userMessageToRetry = messages[i];
        break;
      }
    }

    if (!userMessageToRetry) return;

    // 에러 메시지와 해당 사용자 메시지를 모두 제거
    setMessages((prev) =>
      prev.filter((msg) => msg.id !== errorMessageId && msg.id !== userMessageToRetry!.id)
    );

    // 다시 전송
    handleSendMessage(userMessageToRetry.message);
  };

  return (
    <div className="chat-page-container">
      <div className="chat-messages">
        {messages.map((msg) => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id}>
                <UserMessage message={msg.message} timestamp={msg.timestamp} />
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
          } else if (msg.type === 'loading') {
            return <ChatLoading key={msg.id} />;
          } else if (msg.type === 'error') {
            return <ErrorMessage key={msg.id} message={msg.message} onRetry={() => handleRetry(msg.id)} />;
          } else if (msg.type === 'ai') {
            return <AIMessage key={msg.id} message={msg.message} timestamp={msg.timestamp} />;
          }
          return null;
        })}

        {isLoading && <ChatLoading />}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
