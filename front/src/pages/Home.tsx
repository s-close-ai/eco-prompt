import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
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
        <h1>무엇을 도와드릴까요?</h1>
      </div>
    </div>
  );
}
