import '@/styles/components/chat/user-message.css';
import { useState } from 'react';

interface UserMessageProps {
  message: string;
  timestamp?: Date;
}

export default function UserMessage({ message, timestamp }: UserMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <div className="user-message-container">
        <div className="user-message">
          <p className="user-message-text">{message}</p>
          {timestamp && <span className="user-message-time">{formatTime(timestamp)}</span>}
        </div>
      </div>
      <button onClick={handleCopy} className="ai-message-copy-btn" title="복사">
        <img src="/icons/copy.svg" alt="복사" width={16} height={16} />
        {copied && <span className="ai-message-copied">복사됨!</span>}
      </button>
    </>
  );
}
