import { useAppShell } from '@/context/AppShellContext';
import '@/styles/components/common/topbar.css';

export default function Topbar() {
  const { toggleSidebar } = useAppShell();
  return (
    <header className="topbar">
      <div className="topbar-content container">
        <button aria-label="메뉴 열기" className="icon-button" onClick={toggleSidebar}>
          <img src="/icons/menu.svg" alt="menu" width={24} height={24} />
        </button>

        <img src="/logo/header_img.png" alt="Eco Prompt" className="topbar-logo" />

        <button aria-label="대시보드" className="icon-button">
          <img src="/icons/dashboard.svg" alt="dashboard" width={24} height={24} />
        </button>
      </div>
    </header>
  );
}
