import { useNavigate } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';

/**
 * 데스크탑에서 사이드바가 축소되었을 때의 UI를 담당하는 컴포넌트
 */
export function SidebarCollapsed() {
  const navigate = useNavigate();
  const { toggleSidebarCollapsed, toggleSearch, toggleSettings } = useAppShell();

  const closeAllOverlays = () => {
    window.dispatchEvent(new CustomEvent('project-create-close'));
    window.dispatchEvent(new CustomEvent('settings-close'));
  };

  const handleNavigate = (path: string) => {
    closeAllOverlays();
    navigate(path);
  };

  const handleCreateProject = () => {
    closeAllOverlays();
    window.dispatchEvent(new CustomEvent('project-create-toggle'));
  };

  return (
    <div className="sidebar-collapsed" onClick={(e) => e.stopPropagation()}>
      <button
        className="sidebar-logo-btn"
        onClick={() => {
          closeAllOverlays();
          toggleSidebarCollapsed();
        }}
        aria-label="사이드바 열기"
      >
        <img src="/logo/ngb_logo_png.png" alt="로고" className="sidebar-logo-icon" />
      </button>

      <div className="sidebar-collapsed-icons">
        <button
          className="sidebar-icon-btn"
          aria-label="검색"
          onClick={() => {
            closeAllOverlays();
            toggleSearch();
          }}
        >
          <img src="/icons/search.svg" alt="search" width={20} height={20} />
        </button>
        <button
          className="sidebar-icon-btn"
          aria-label="새 채팅"
          onClick={() => handleNavigate('/chat')}
        >
          <img src="/icons/add_chat.svg" alt="add chat" width={20} height={20} />
        </button>
        <button className="sidebar-icon-btn" aria-label="새 프로젝트" onClick={handleCreateProject}>
          <img src="/icons/add_folder.svg" alt="add folder" width={20} height={20} />
        </button>
      </div>

      <div className="sidebar-collapsed-footer">
        <button
          className="sidebar-icon-btn"
          aria-label="대시보드"
          onClick={() => handleNavigate('/dashboard/ranking')}
        >
          <img src="/icons/dashboard.svg" alt="dashboard" width={20} height={20} />
        </button>
        <button
          className="sidebar-icon-btn"
          aria-label="북마크"
          onClick={() => handleNavigate('/bookmark')}
        >
          <img src="/icons/bookmark.svg" alt="bookmark" width={20} height={20} />
        </button>
        <button
          className="sidebar-icon-btn"
          aria-label="설정"
          onClick={() => {
            closeAllOverlays();
            toggleSettings();
          }}
        >
          <img src="/icons/settings.svg" alt="settings" width={20} height={20} />
        </button>
      </div>
    </div>
  );
}
