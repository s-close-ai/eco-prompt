import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShellProvider, useAppShell } from '../context/AppShellContext';
import Topbar from '../components/common/Topbar';
import Sidebar from '../components/common/Sidebar';
import Bottombar from '../components/common/Bottombar';
import useDeviceMode from '../hooks/useDeviceMode';
import ProjectCreateOverlay from '@/components/project_create/ProjectCreateOverlay';
import ProjectOverlay from '@/components/project/ProjectOverlay';
import { mockProjectList } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

function ShellBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const { isSidebarCollapsed, isSidebarOpen } = useAppShell();
  const isChat = location.pathname.startsWith('/chat');
  const isHome = location.pathname === '/';
  const isProjectRoute = location.pathname.startsWith('/project');
  const bottomVariant: 'chat' | 'menu' | null = isChat
    ? 'chat'
    : isHome || isProjectRoute
    ? null
    : mode === 'mobile'
    ? 'menu'
    : null;

  const [isProjectCreateOpen, setProjectCreateOpen] = useState(false);
  useEffect(() => {
    const open = () => setProjectCreateOpen(true);
    const close = () => setProjectCreateOpen(false);
    window.addEventListener('project-create-open', open);
    window.addEventListener('project-create-close', close);
    return () => {
      window.removeEventListener('project-create-open', open);
      window.removeEventListener('project-create-close', close);
    };
  }, []);

  const projectCreateVariant: 'inline' | 'modal' | 'fullscreen' | 'bottom' =
    mode === 'mobile' ? 'fullscreen' : mode === 'tablet' ? 'inline' : 'modal';

  // 프로젝트 오버레이(선택 시) - 모바일/태블릿에서만 오버레이로 표시, 데스크탑은 메인 영역에 페이지로 표시
  const projectVariant: 'inline' | 'modal' | 'fullscreen' | null = isProjectRoute
    ? mode === 'mobile'
      ? 'fullscreen'
      : mode === 'tablet'
      ? 'inline'
      : null
    : null;
  // /project 페이지에서는 history state로 projectId를 전달받음
  const historyState = (location as unknown as { state?: { projectId?: number } }).state || {};
  const projectId = typeof historyState.projectId === 'number' ? historyState.projectId : null;
  const projectTitle = projectId ? mockProjectList.find((p) => p.id === projectId)?.title ?? '' : '';

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
        {projectVariant === 'inline' ? (
          <ProjectOverlay
            open={true}
            onClose={() => navigate(-1)}
            variant="inline"
            title={projectTitle}
          />
        ) : null}
        <Outlet />
      </main>
      {bottomVariant ? <Bottombar variant={bottomVariant} /> : null}
      {projectCreateVariant !== 'inline' ? (
        <ProjectCreateOverlay
          open={isProjectCreateOpen}
          onClose={() => setProjectCreateOpen(false)}
          variant={projectCreateVariant}
        />
      ) : null}
      {projectVariant && projectVariant !== 'inline' ? (
        <ProjectOverlay
          open={true}
          onClose={() => navigate(-1)}
          variant={projectVariant}
          title={projectTitle}
        />
      ) : null}
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
