import { useNavigate, useLocation } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import '@/styles/components/common/topbar.css';

export default function Topbar() {
  const { toggleSidebar } = useAppShell();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = useDeviceMode();

  // 설정, 대시보드, 북마크 페이지에서는 채팅 아이콘 표시 (단어 포함 체크)
  const pathsToShowChat = ['settings', 'dashboard', 'bookmark'];
  const showChatIcon =
    pathsToShowChat.some((path) => location.pathname.includes(path)) ||
    location.search.includes('tab');

  const handleTopbarClick = () => {
    // 태블릿 모드에서 헤더 클릭 시 프로젝트 생성 카드 닫기
    if (mode === 'tablet') {
      window.dispatchEvent(new CustomEvent('project-create-close'));
    }
  };

  return (
    <header className="topbar" onClick={handleTopbarClick}>
      <div className="topbar-content container" onClick={(e) => e.stopPropagation()}>
        <button aria-label="메뉴 열기" className="icon-button" onClick={toggleSidebar}>
          <img src="/icons/menu.svg" alt="menu" width={24} height={24} />
        </button>

        <img src="/logo/header_img.png" alt="Eco Prompt" className="topbar-logo" />

        {showChatIcon ? (
          <button
            aria-label="채팅"
            className="icon-button"
            onClick={() => {
              const targetPath = '/';
              if (location.pathname !== targetPath) {
                navigate(targetPath);
              }
            }}
          >
            <img src="/icons/chat.svg" alt="chat" width={24} height={24} />
          </button>
        ) : (
          <button
            aria-label="대시보드"
            className="icon-button"
            onClick={() => {
              const targetPath = '/dashboard';
              if (location.pathname !== targetPath) {
                navigate(targetPath);
              }
            }}
          >
            <img src="/icons/dashboard.svg" alt="dashboard" width={24} height={24} />
          </button>
        )}
      </div>
    </header>
  );
}
