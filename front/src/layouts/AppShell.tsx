import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShellProvider, useAppShell } from '../context/AppShellContext';
import Topbar from '../components/common/Topbar';
import Sidebar from '../components/common/Sidebar';
import Bottombar from '../components/common/Bottombar';
import useDeviceMode from '../hooks/useDeviceMode';
import ProjectCreateOverlay from '@/components/project_create/ProjectCreateOverlay';
import { useNavigate } from 'react-router-dom';

function ShellBody() {
  const location = useLocation();
  useNavigate();
  const mode = useDeviceMode();
  const { isSidebarCollapsed, isSidebarOpen } = useAppShell();
  const isChat = location.pathname.startsWith('/chat');
  const isHome = location.pathname === '/';
  const isProjectRoute = location.pathname.startsWith('/project');
  const bottomVariant: 'chat' | 'menu' | null =
    isChat || isProjectRoute ? 'chat' : mode === 'mobile' ? 'menu' : null;

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

  // /project 페이지에서는 history state로 projectId를 전달받음
  (location as unknown as { state?: { projectId?: number } }).state || {};

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
      {bottomVariant ? <Bottombar variant={bottomVariant} /> : null}
      {projectCreateVariant !== 'inline' ? (
        <ProjectCreateOverlay
          open={isProjectCreateOpen}
          onClose={() => setProjectCreateOpen(false)}
          variant={projectCreateVariant}
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
