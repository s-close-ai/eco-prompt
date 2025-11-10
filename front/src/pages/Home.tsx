import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import MainChat from '@/components/home/MainChat';
import '@/styles/pages/home.css';

export default function Home() {
  const { isSidebarCollapsed, isSidebarOpen } = useAppShell();
  const mode = useDeviceMode();

  const getContentClass = () => {
    if (mode === 'desktop') {
      if (isSidebarCollapsed) return 'desktop-sidebar-collapsed';
      return 'desktop-sidebar-open';
    }
    if (mode === 'tablet' && isSidebarOpen) {
      return 'tablet-sidebar-open';
    }
    return '';
  };

  return (
    <div className="home-container">
      <div className={`main-content ${getContentClass()}`}>
        <MainChat />
      </div>
    </div>
  );
}
