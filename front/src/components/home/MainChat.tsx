import { useNavigate } from 'react-router-dom';
import { generateChatId } from '@/utils/id';
import '@/styles/components/home/main-chat.css';
import { useEffect, useCallback } from 'react';

export default function MainChat() {
  const navigate = useNavigate();

  // ChatInput에서 메시지를 받아 새 채팅 시작
  const handleChatSend = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (!detail?.message) return;

      const newChatId = generateChatId();
      navigate(`/chat/${newChatId}`, {
        state: { chatId: newChatId, isNew: true, message: detail.message },
      });
    },
    [navigate],
  );

  useEffect(() => {
    window.addEventListener('chat-send', handleChatSend as EventListener);
    return () => window.removeEventListener('chat-send', handleChatSend as EventListener);
  }, [handleChatSend]);

  return (
    <div className="main-chat-container">
      <div className="main-chat-content">
        <h1 className="main-chat-title">무엇을 도와드릴까요?</h1>
      </div>
    </div>
  );
}
