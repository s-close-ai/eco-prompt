import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import '@/styles/components/chat/chat-input.css';
import { MAX_MESSAGE_LENGTH } from '@/constants/ui';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  onStop?: () => void;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask Eco prompt',
  isLoading = false,
  onStop,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      const trimmed = message.trim();
      onSend(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length > MAX_MESSAGE_LENGTH) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    setMessage(newValue);
    setShowAlert(false);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // 모바일 키보드가 올라올 때 스크롤을 맨 아래로 이동
  const handleFocus = () => {
    // 키보드가 완전히 올라온 후 스크롤 처리
    requestAnimationFrame(() => {
      setTimeout(() => {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 300);
    });
  };

  // 키보드가 올라올 때 viewport 변화 감지 및 스크롤 처리
  useEffect(() => {
    let initialHeight = window.visualViewport?.height || window.innerHeight;
    
    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      
      // 키보드가 올라왔을 때 (높이가 줄어들었을 때)
      if (currentHeight < initialHeight) {
        requestAnimationFrame(() => {
          const chatMessages = document.querySelector('.chat-messages');
          if (chatMessages && textareaRef.current === document.activeElement) {
            chatMessages.scrollTo({
              top: chatMessages.scrollHeight,
              behavior: 'smooth',
            });
          }
        });
      }
      
      initialHeight = currentHeight;
    };

    // visualViewport API 지원하는 브라우저에서 사용
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="chat-input-textarea"
          rows={1}
        />
        {isLoading ? (
          <button onClick={onStop} className="chat-input-send-btn" title="중지">
            <img src="/icons/stop.svg" alt="중지" width={16} height={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className="chat-input-send-btn"
            title="전송"
          >
            <img src="/icons/send.svg" alt="전송" width={16} height={16} color="white" />
          </button>
        )}
      </div>
      <div className="chat-input-footer">
        <p className="chat-input-disclaimer">
          Eco Prompt는 실수를 할 수 있고, 공유될 수 있습니다. 중요한 정보는 확인하세요.
        </p>
      </div>
      {showAlert && (
        <div className="chat-input-alert">
          최대 {MAX_MESSAGE_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.
        </div>
      )}
    </div>
  );
}
