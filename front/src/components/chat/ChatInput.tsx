import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import Alert from '@/components/common/Alert';
import ErrorIcon from '@/assets/icons/error.svg?react';
import '../../styles/components/chat/chat-input.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_CHARACTERS = 15000;

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask Eco prompt',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
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

    // 15000자 제한
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
    <>
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="chat-input-textarea"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className="chat-input-send-btn"
            title="전송"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 11L12 6L17 11M12 18V7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="chat-input-footer">
          <p className="chat-input-disclaimer">
            Eco Prompt는 실수를 할 수 있습니다. 중요한 정보는 확인하세요.
          </p>
        </div>
      </div>

      {showAlert && (
        <Alert
          message= {<><ErrorIcon />최대 15000자입니다!</>}
          onConfirm={() => setShowAlert(false)}
        />
      )}
    </>
  );
}

