import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from '@/components/chat/ChatInput';
import { generateChatId } from '@/utils/id';

export default function Home() {
  const navigate = useNavigate();

  const handleSend = useCallback(
    (message: string) => {
      const newChatId = generateChatId();
      navigate(`/chat/${newChatId}`, {
        state: { chatId: newChatId, isNew: true, message },
      });
    },
    [navigate],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* 중앙 콘텐츠 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32, textAlign: 'center' }}>무엇을 도와드릴까요?</h1>
      </div>

      {/* 하단 입력창 */}
      <div
        style={{
          padding: '16px',
        }}
      >
        <div style={{ margin: '0 auto', width: '100%' }}>
          <ChatInput onSend={handleSend} placeholder="Ask Eco prompt" />
        </div>
      </div>
    </div>
  );
}
