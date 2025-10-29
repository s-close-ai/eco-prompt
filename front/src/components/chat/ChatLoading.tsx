import '@/styles/components/chat/chat-loading.css';

export default function ChatLoading() {
	return (
		<div className="chat-loading-container">
			<div className="chat-loading">
				<div className="chat-loading-dots">
					<span className="chat-loading-dot"></span>
					<span className="chat-loading-dot"></span>
					<span className="chat-loading-dot"></span>
				</div>
				<p className="chat-loading-text">응답 생성 중...</p>
			</div>
		</div>
	);
}
