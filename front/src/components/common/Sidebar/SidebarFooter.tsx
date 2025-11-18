import { useLocation, useNavigate } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';

/**
 * 펼쳐진 사이드바의 하단 영역을 담당하는 컴포넌트
 */
export function SidebarFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = useDeviceMode();
  const { closeSidebar, toggleSettings } = useAppShell();

  const closeAllOverlays = () => {
    window.dispatchEvent(new CustomEvent('project-create-close'));
    window.dispatchEvent(new CustomEvent('settings-close'));
  };

  const handleNavigate = (path: string) => {
    if (mode === 'mobile') {
      closeSidebar();
    }
    closeAllOverlays();
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  const handleSettingsClick = () => {
    if (mode === 'mobile') {
      closeSidebar();
    }
    if (mode === 'desktop') {
      toggleSettings();
    } else {
      handleNavigate('/settings');
    }
  };

  return (
    <div className="sidebar-footer">
      <button className="sidebar-explore-btn" onClick={() => handleNavigate('/dashboard/ranking')}>
        <img src="/icons/dashboard.svg" alt="dashboard" width={18} height={18} />
        <span>대시보드</span>
      </button>
      {mode !== 'mobile' && (
        <button className="sidebar-explore-btn" onClick={() => handleNavigate('/mr-generator')}>
          <img src="/icons/mr_create.svg" alt="mr-generator" width={18} height={18} />
          <span>MR 자동 생성기</span>
        </button>
      )}
      <button className="sidebar-explore-btn" onClick={handleSettingsClick}>
        <img src="/icons/settings.svg" alt="settings" width={18} height={18} />
        <span>설정</span>
      </button>
    </div>
  );
}
