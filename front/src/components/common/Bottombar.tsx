import { useNavigate, useLocation } from 'react-router-dom';
import '@/styles/components/common/bottombar.css';
import { useAppShell } from '@/context/AppShellContext';
import ChatInput from '@/components/chat/ChatInput';

type BottombarProps = {
  variant: 'chat' | 'menu';
  onSendMessage?: (message: string) => void;
};

export default function Bottombar({ variant, onSendMessage }: BottombarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, onStopGeneration } = useAppShell();

  if (variant === 'chat') {
    return (
      <footer className="bottombar bottombar--chat app-footer" data-variant="chat">
        <ChatInput
          onSend={onSendMessage || (() => {})}
          isLoading={isLoading}
          onStop={onStopGeneration}
        />
      </footer>
    );
  }

  return (
    <footer className="bottombar bottombar--menu" data-variant="menu">
      <div className="bottombar-content">
        <button
          aria-label="chat"
          className="icon-button"
          onClick={() => {
            const targetPath = '/chat';
            if (location.pathname !== targetPath) {
              navigate(targetPath);
            }
          }}
        >
          <img src="/icons/chat.svg" alt="chat" />
        </button>
        <button
          aria-label="dashboard"
          className="icon-button"
          onClick={() => {
            const targetPath = '/dashboard';
            if (location.pathname !== targetPath) {
              navigate(targetPath);
            }
          }}
        >
          <img src="/icons/dashboard.svg" alt="dashboard" />
        </button>
        <button
          aria-label="bookmark"
          className="icon-button"
          onClick={() => {
            const targetPath = '/bookmark';
            if (location.pathname !== targetPath) {
              navigate(targetPath);
            }
          }}
        >
          <img src="/icons/bookmark.svg" alt="bookmark" />
        </button>
        <button
          aria-label="settings"
          className="icon-button"
          onClick={() => {
            const targetPath = '/settings';
            if (location.pathname !== targetPath) {
              navigate(targetPath);
            }
          }}
        >
          <img src="/icons/settings.svg" alt="settings" />
        </button>
      </div>
    </footer>
  );
}
