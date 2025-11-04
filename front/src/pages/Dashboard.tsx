import { Link, Outlet, useLocation } from 'react-router-dom';
import '@/styles/pages/dashboard.css';

type TabType = 'ranking' | 'eco-pick' | 'dashboard';

export default function DashboardPage() {
  const location = useLocation();

  const getActiveTab = (): TabType => {
    if (location.pathname.includes('ranking')) return 'ranking';
    if (location.pathname.includes('eco-pick')) return 'eco-pick';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const tabs: { id: TabType; label: string; path: string }[] = [
    { id: 'ranking', label: '랭킹', path: '/dashboard/ranking' },
    { id: 'eco-pick', label: 'Eco 픽', path: '/dashboard/eco-pick' },
    { id: 'dashboard', label: '개인기록', path: '/dashboard' },
  ];

  return (
    <div className="home-container">
      <div className="tabs-navigation">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="tabs-content">
        <div className="tab-panel">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
