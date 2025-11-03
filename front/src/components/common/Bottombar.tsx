import { useNavigate } from 'react-router-dom';
import '@/styles/components/common/bottombar.css';
import ChatInput from '@/components/chat/ChatInput';

type BottombarProps = {
  variant: 'chat' | 'menu';
};

export default function Bottombar({ variant }: BottombarProps) {
  const navigate = useNavigate();

  if (variant === 'chat') {
    return (
      <footer className="bottombar bottombar--chat app-footer" data-variant="chat">
        <ChatInput onSend={() => {}} />
      </footer>
    );
  }

  return (
    <footer className="bottombar bottombar--menu" data-variant="menu">
      <div className="bottombar-content">
        <button aria-label="chat" className="icon-button" onClick={() => navigate('/')}>
          <img src="/icons/chat.svg" alt="chat" />
        </button>
        <button aria-label="dashboard" className="icon-button">
          <img src="/icons/dashboard.svg" alt="dashboard" />
        </button>
        <button aria-label="bookmark" className="icon-button" onClick={() => navigate('/bookmark')}>
          <img src="/icons/bookmark.svg" alt="bookmark" />
        </button>
        <button aria-label="settings" className="icon-button" onClick={() => navigate('/settings')}>
          <img src="/icons/settings.svg" alt="settings" />
        </button>
      </div>
    </footer>
  );
}
