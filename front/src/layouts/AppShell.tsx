import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShellProvider, useAppShell } from '../context/AppShellContext';
import Topbar from '../components/common/Topbar';
import Sidebar from '../components/common/Sidebar';
import Bottombar from '../components/common/Bottombar';
import useDeviceMode from '../hooks/useDeviceMode';
import ProjectCreateOverlay from '@/components/project_create/ProjectCreateOverlay';
import SettingsOverlay from '@/components/settings/SettingsOverlay';
import type { SettingsFormData } from '@/components/settings/SettingsForm';
import { useNavigate } from 'react-router-dom';

// TODO: 실제 API에서 데이터를 가져오도록 수정
const mockSettingsData: SettingsFormData = {
  privacyConsent: {
    agreed: true,
    date: '2025.10.18',
  },
  promptPublic: false,
  personalizedPrompt: '',
};

function ShellBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const { isSidebarCollapsed, isSidebarOpen, isSettingsOpen, closeSettings } = useAppShell();
  const isChat = location.pathname.startsWith('/chat');
  const isProjectRoute = location.pathname.startsWith('/project');
  const isHome = location.pathname === '/';
  const bottomVariant: 'chat' | 'menu' | null =
    isChat || isProjectRoute || isHome ? 'chat' : mode === 'mobile' ? 'menu' : null;

  const [isProjectCreateOpen, setProjectCreateOpen] = useState(false);
  const [settingsData, setSettingsData] = useState<SettingsFormData>(mockSettingsData);

  const handleSendMessage = (message: string) => {
    navigate('/chat', { state: { isNew: true, message: message } });
  };

  useEffect(() => {
    const open = () => setProjectCreateOpen(true);
    const close = () => setProjectCreateOpen(false);
    const toggle = () => setProjectCreateOpen((prev) => !prev);
    window.addEventListener('project-create-open', open);
    window.addEventListener('project-create-close', close);
    window.addEventListener('project-create-toggle', toggle);
    return () => {
      window.removeEventListener('project-create-open', open);
      window.removeEventListener('project-create-close', close);
      window.removeEventListener('project-create-toggle', toggle);
    };
  }, []);

  useEffect(() => {
    const close = () => closeSettings();
    window.addEventListener('settings-close', close);
    return () => {
      window.removeEventListener('settings-close', close);
    };
  }, [closeSettings]);

  // 라우트 변경 시 모달 닫기
  useEffect(() => {
    setProjectCreateOpen(false);
    closeSettings();
  }, [location.pathname, closeSettings]);

  const handleSettingsAutoSave = (data: SettingsFormData) => {
    // TODO: 실제 API에 자동 저장
    console.log('Settings auto-saved:', data);
    setSettingsData(data);
  };

  const handleSettingsSubmit = (data: SettingsFormData) => {
    // TODO: 실제 API에 저장
    console.log('Settings saved:', data);
    setSettingsData(data);
    closeSettings();
  };

  const projectCreateVariant: 'inline' | 'modal' | 'fullscreen' | 'bottom' =
    mode === 'mobile' ? 'fullscreen' : mode === 'tablet' ? 'inline' : 'modal';

  const shellClass = [
    'app-shell',
    mode === 'desktop' ? 'has-desktop-sidebar' : '',
    mode === 'desktop' && isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
    mode === 'tablet' && isSidebarOpen ? 'has-tablet-sidebar-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      <Topbar />
      <Sidebar />
      <main className="app-main">
        {projectCreateVariant === 'inline' ? (
          <ProjectCreateOverlay
            open={isProjectCreateOpen}
            onClose={() => setProjectCreateOpen(false)}
            variant="inline"
          />
        ) : null}
        <Outlet />
      </main>
      {bottomVariant ? <Bottombar variant={bottomVariant} onSendMessage={handleSendMessage} /> : null}
      {projectCreateVariant !== 'inline' ? (
        <ProjectCreateOverlay
          open={isProjectCreateOpen}
          onClose={() => setProjectCreateOpen(false)}
          variant={projectCreateVariant}
        />
      ) : null}
      {mode === 'desktop' && (
        <SettingsOverlay
          open={isSettingsOpen}
          onClose={closeSettings}
          variant="modal"
          initialData={settingsData}
          onSubmit={handleSettingsSubmit}
          onAutoSave={handleSettingsAutoSave}
        />
      )}
    </div>
  );
}

export function AppShell() {
  return (
    <AppShellProvider>
      <ShellBody />
    </AppShellProvider>
  );
}

export default AppShell;
