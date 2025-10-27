import '../../styles/components/chat/error-message.css';

interface ErrorMessageProps {
  message?: string;
  onRetry: () => void;
}

export default function ErrorMessage({
  message = '메시지를 전송하는 중 오류가 발생했습니다.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="error-message-container">
      <div className="error-message">
        <div className="error-message-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 8V12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        </div>
        <div className="error-message-content">
          <p className="error-message-text">{message}</p>
          <button onClick={onRetry} className="error-message-retry-btn">
            다시 전송하기
          </button>
        </div>
      </div>
    </div>
  );
}

