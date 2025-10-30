import '@/styles/components/chat/user-message.css';

interface UserMessageProps {
  message: string;
}

export default function UserMessage({ message }: UserMessageProps) {
  return (
    <>
      <div className="user-message-container">
        <div className="user-message">
          <p className="user-message-text">{message}</p>
        </div>
      </div>
    </>
  );
}
