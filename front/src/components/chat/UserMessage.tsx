import '../../styles/components/chat/user-message.css';

interface UserMessageProps {
  message: string;
  timestamp?: Date;
}

export default function UserMessage({ message, timestamp }: UserMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="user-message-container">
      <div className="user-message">
        <p className="user-message-text">{message}</p>
        {timestamp && (
          <span className="user-message-time">{formatTime(timestamp)}</span>
        )}
      </div>
    </div>
  );
}

