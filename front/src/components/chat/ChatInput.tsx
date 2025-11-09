import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import '@/styles/components/chat/chat-input.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  onStop?: () => void;
}

const MAX_CHARACTERS = 15000;

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
    if (newValue.length > MAX_CHARACTERS) {
      setShowAlert(true);
      return;
    }
    setMessage(newValue);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
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
          Eco Prompt는 실수를 할 수 있습니다. 중요한 정보는 확인하세요.
        </p>
      </div>
      {showAlert ? null : null}
    </div>
  );
}
