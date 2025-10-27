import { useState } from 'react';
import { UserMessage, AIMessage, PromptScore, ChatInput, ChatLoading, ErrorMessage } from '@/components/chat';
import { mockChatMessages } from '@/data/mockData';
import type { ChatMessage } from '@/data/mockData';
import '@/styles/pages/chat.css';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = (message: string) => {
    // 새 사용자 메시지 추가
    const newUserMessage: ChatMessage = {
      id: messages.length + 1,
      type: 'user',
      message,
      timestamp: new Date(),
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
        score: {
          clarity: Math.floor(Math.random() * 5) + 20,
          specificity: Math.floor(Math.random() * 5) + 20,
          format: Math.floor(Math.random() * 5) + 20,
          completeness: Math.floor(Math.random() * 5) + 20,
          totalScore: Math.floor(Math.random() * 20) + 80,
        },
      };

      setMessages((prev) => [...prev, newAIMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handleRetry = (errorMessageId: number) => {
    // 에러 메시지를 제거
    setMessages((prev) => prev.filter((msg) => msg.id !== errorMessageId));

    // 마지막 사용자 메시지를 다시 전송
    const lastUserMessage = [...messages].reverse().find((msg) => msg.type === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.message);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg) => {
          if (msg.type === 'user') {
            return <UserMessage key={msg.id} message={msg.message} timestamp={msg.timestamp} />;
          } else if (msg.type === 'ai') {
            return (
              <div key={msg.id} className="ai-message-with-score">
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
                <AIMessage message={msg.message} timestamp={msg.timestamp} />
              </div>
            );
          } else if (msg.type === 'loading') {
            return <ChatLoading key={msg.id} />;
          } else if (msg.type === 'error') {
            return <ErrorMessage key={msg.id} message={msg.message} onRetry={() => handleRetry(msg.id)} />;
          }
          return null;
        })}

        {isLoading && <ChatLoading />}
      </div>

      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
