import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShellProvider, useAppShell } from '../context/AppShellContext';
import Topbar from '../components/common/Topbar';
import { Sidebar } from '@/components/common/Sidebar/Sidebar';
import Bottombar from '../components/common/Bottombar';
import useDeviceMode from '../hooks/useDeviceMode';
import ProjectCreateOverlay from '@/components/project_create/ProjectCreateOverlay';
import SettingsOverlay from '@/components/settings/SettingsOverlay';
import SearchModal from '@/components/search/SearchModal';
import type { SettingsFormData } from '@/components/settings/SettingsForm';

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
  const mode = useDeviceMode();
  const { isSidebarCollapsed, isSidebarOpen, isSettingsOpen, closeSettings, closeSearch } =
    useAppShell();
  const isChat = location.pathname.startsWith('/chat');
  const isProjectRoute = location.pathname.startsWith('/project');
  const isHome = location.pathname === '/';
  const bottomVariant: 'chat' | 'menu' | null =
    isChat || isProjectRoute || isHome ? 'chat' : mode === 'mobile' ? 'menu' : null;

  const [isProjectCreateOpen, setProjectCreateOpen] = useState(false);
  const [settingsData, setSettingsData] = useState<SettingsFormData>(mockSettingsData);

  const handleSendMessage = (message: string) => {
    // Chat 페이지일 때는 전역 이벤트 발생 (MainChat에서 리스닝)
    // Chat 페이지가 아닐 때만 전역 이벤트 발생
    if (!isChat) {
      window.dispatchEvent(new CustomEvent('chat-send', { detail: { message } }));
    } else {
      // Chat 페이지일 때는 chat-input-send 이벤트 발생
      window.dispatchEvent(new CustomEvent('chat-input-send', { detail: { message } }));
    }
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
    closeSearch();
  }, [location.pathname, closeSettings, closeSearch]);

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
        <Outlet />
      </main>
      {bottomVariant ? (
        <Bottombar variant={bottomVariant} onSendMessage={handleSendMessage} />
      ) : null}
      <ProjectCreateOverlay
        open={isProjectCreateOpen}
        onClose={() => setProjectCreateOpen(false)}
        variant={projectCreateVariant}
      />
      {mode === 'desktop' && (
        <SettingsOverlay
          open={isSettingsOpen}
          onClose={closeSettings}
          variant="modal"
          initialData={settingsData}
          onSubmit={handleSettingsSubmit}
          onAutoSave={handleSettingsAutoSave}
        />
      )}{' '}
      <SearchModal />
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
