import { useNavigate } from 'react-router-dom';
import '@/styles/components/home/main-chat.css';
import { useEffect, useCallback } from 'react';

export default function MainChat() {
  const navigate = useNavigate();

  // ChatInput에서 메시지를 받아 새 채팅 시작
  const handleChatSend = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; uploadedFiles?: import('@/types/api/file.types').UploadedFileInfo[] }>).detail;
      if (!detail?.message) return;

      // 파일이 있을 경우 경고 메시지 표시 (추후 파일 업로드 기능 구현 시 제거)
      if (detail.uploadedFiles && detail.uploadedFiles.length > 0) {
        console.warn('파일 업로드 기능은 채팅 시작 후 사용 가능합니다.');
      }

      navigate('/chat', {
        state: { isNew: true, message: detail.message },
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
