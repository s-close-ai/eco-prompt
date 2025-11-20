import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShellProvider, useAppShell } from '../context/AppShellContext';
import { ToastProvider } from '@/context/ToastContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import Toast from '@/components/common/Toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Topbar from '../components/common/Topbar';
import { Sidebar } from '@/components/common/Sidebar/Sidebar';
import Bottombar from '../components/common/Bottombar';
import useDeviceMode from '../hooks/useDeviceMode';
import ProjectCreateOverlay from '@/components/project_create/ProjectCreateOverlay';
import SettingsOverlay from '@/components/settings/SettingsOverlay';
import SearchModal from '@/components/search/SearchModal';
import type { SettingsFormData } from '@/components/settings/SettingsForm';
import { getSharingInformation } from '@/services/api/auth';
import { getSettings } from '@/services/api/user-info';

function ShellBody() {
  const location = useLocation();
  const mode = useDeviceMode();
  const { isSidebarCollapsed, isSidebarOpen, isSettingsOpen, closeSettings, closeSearch } =
    useAppShell();
  const isChat = location.pathname.startsWith('/chat');
  const isProjectRoute = location.pathname.startsWith('/project');
  const isHome = location.pathname === '/chat';
  const bottomVariant: 'chat' | 'menu' | null =
    isChat || isProjectRoute || isHome ? 'chat' : mode === 'mobile' ? 'menu' : null;

  const [isProjectCreateOpen, setProjectCreateOpen] = useState(false);
  const [settingsData, setSettingsData] = useState<SettingsFormData | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  const handleSendMessage = (message: string, uploadedFiles?: import('@/types/api/file.types').UploadedFileInfo[]) => {
    // Chat 페이지일 때는 전역 이벤트 발생 (MainChat에서 리스닝)
    // Chat 페이지가 아닐 때만 전역 이벤트 발생
    if (!isChat) {
      window.dispatchEvent(new CustomEvent('chat-send', { detail: { message, uploadedFiles } }));
    } else {
      // Chat 페이지일 때는 chat-input-send 이벤트 발생
      window.dispatchEvent(new CustomEvent('chat-input-send', { detail: { message, uploadedFiles } }));
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

  // 설정 모달이 열릴 때 데이터 로드
  useEffect(() => {
    const loadSettings = async () => {
      if (isSettingsOpen && !settingsData && !isLoadingSettings) {
        try {
          setIsLoadingSettings(true);
          
          const [sharingInfoResponse, settingsResponse] = await Promise.all([
            getSharingInformation(),
            getSettings(),
          ]);

          const formattedData: SettingsFormData = {
            privacyConsent: {
              agreed: sharingInfoResponse.data.sharingInformation === 'Y',
              date: sharingInfoResponse.data.sharingInformationUpdatedAt
                ? sharingInfoResponse.data.sharingInformationUpdatedAt.split('.').slice(0, 3).join('.')
                : undefined,
            },
            promptPublic: settingsResponse.data.sharingPrompt === 'Y',
            personalizedPrompt: settingsResponse.data.personalPrompt || '',
          };

          setSettingsData(formattedData);
        } catch (error) {
          setSettingsData({
            privacyConsent: {
              agreed: false,
            },
            promptPublic: false,
            personalizedPrompt: '',
          });
        } finally {
          setIsLoadingSettings(false);
        }
      }
    };

    loadSettings();
  }, [isSettingsOpen, settingsData, isLoadingSettings]);

  const handleSettingsAutoSave = (data: SettingsFormData) => {
    // 자동 저장 시 데이터 업데이트 (API 호출은 SettingsForm에서 처리)
    setSettingsData(data);
  };

  const handleSettingsSubmit = (data: SettingsFormData) => {
    // 저장 시 데이터 업데이트 (API 호출은 SettingsForm에서 처리)
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
    <>
      <div className={shellClass}>
        <Topbar />
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
        <ProjectCreateOverlay
          open={isProjectCreateOpen}
          onClose={() => setProjectCreateOpen(false)}
          variant={projectCreateVariant}
        />
        {mode === 'desktop' && settingsData && (
          <SettingsOverlay
            open={isSettingsOpen}
            onClose={closeSettings}
            variant="modal"
            initialData={settingsData}
            onSubmit={handleSettingsSubmit}
            onAutoSave={handleSettingsAutoSave}
          />
        )}
        <SearchModal />
        <Toast />
        <ConfirmDialog />
      </div>
      {bottomVariant ? (
        <Bottombar variant={bottomVariant} onSendMessage={handleSendMessage} />
      ) : null}
    </>
  );
}

export function AppShell() {
  return (
    <AppShellProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ShellBody />
        </ConfirmProvider>
      </ToastProvider>
    </AppShellProvider>
  );
}

export default AppShell;
