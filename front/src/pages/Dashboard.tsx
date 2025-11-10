import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import useDeviceMode from '@/hooks/useDeviceMode';
import Ranking from '@/components/dashboard/Ranking';
import EcoPick from '@/components/dashboard/EcoPick';
import { DashboardMetrics, DashboardStats } from '@/components/dashboard/Dashboard';
import '@/styles/pages/dashboard.css';
import Tooltip from '@/components/common/Tooltip';

type TabType = 'ranking' | 'eco-pick' | 'dashboard';

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

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

  // 모바일 슬라이드 기능 (에코픽 카드 슬라이드가 아닌 경우만)
  useEffect(() => {
    if (mode !== 'mobile') return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // 에코픽 카드 내부에서 시작한 터치는 무시
      if (target.closest('.eco-pick-card-wrapper') || target.closest('.eco-pick-card')) {
        return;
      }
      startXRef.current = e.touches[0].clientX;
      isDraggingRef.current = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      const endX = e.changedTouches[0].clientX;
      const diff = startXRef.current - endX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

        if (diff > 0) {
          // 왼쪽으로 스와이프 (다음 탭)
          if (currentIndex < tabs.length - 1) {
            navigate(tabs[currentIndex + 1].path);
          }
        } else {
          // 오른쪽으로 스와이프 (이전 탭)
          if (currentIndex > 0) {
            navigate(tabs[currentIndex - 1].path);
          }
        }
      }

      isDraggingRef.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mode, activeTab, navigate, tabs]);

  // 데스크탑/태블릿: 통합 레이아웃
  if (mode === 'desktop' || mode === 'tablet') {
    return (
      <div className="home-container">
        <div className="dashboard-grid">
          <div className="left-sections">
            <div className="grid-section ranking-section">
              <Ranking />
            </div>
            <div className="grid-section metrics-section">
              <h2 className="section-title">마이 데이터</h2>
              <DashboardMetrics />
              <DashboardStats />
            </div>
          </div>
          <div className="right-sections">
            <div className="grid-section eco-pick-section">
              <div className="section-title-wrapper">
                <h2 className="section-title">Eco Pick</h2>
                <Tooltip content="어제의 가장 잘 쓴 프롬프트입니다. 명확성, 구체성, 형식 준수, 안전성을 기준으로 선정됩니다." />
              </div>
              <EcoPick />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 모바일: 탭 레이아웃 + 슬라이드
  return (
    <div className="home-container" ref={containerRef}>
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
