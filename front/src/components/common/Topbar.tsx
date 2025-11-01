import { useNavigate, useLocation } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import '@/styles/components/common/topbar.css';

export default function Topbar() {
  const { toggleSidebar } = useAppShell();
  const navigate = useNavigate();
  const location = useLocation();

  // 설정, 대시보드, 북마크 페이지에서는 채팅 아이콘 표시
  const showChatIcon = ['/settings', '/dashboard', '/bookmark'].includes(location.pathname);

  return (
    <header className="topbar">
      <div className="topbar-content container">
        <button aria-label="메뉴 열기" className="icon-button" onClick={toggleSidebar}>
          <img src="/icons/menu.svg" alt="menu" width={24} height={24} />
        </button>

        <img src="/logo/header_img.png" alt="Eco Prompt" className="topbar-logo" />

        {showChatIcon ? (
          <button aria-label="채팅" className="icon-button" onClick={() => navigate('/')}>
            <img src="/icons/chat.svg" alt="chat" width={24} height={24} />
          </button>
        ) : (
          <button aria-label="대시보드" className="icon-button">
            <img src="/icons/dashboard.svg" alt="dashboard" width={24} height={24} />
          </button>
        )}
      </div>
    </header>
  );
}
