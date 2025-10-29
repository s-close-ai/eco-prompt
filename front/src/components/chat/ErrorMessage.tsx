import '@/styles/components/chat/error-message.css';

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
					<img src="/icons/error.svg" alt="error" width={16} height={16} />
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
