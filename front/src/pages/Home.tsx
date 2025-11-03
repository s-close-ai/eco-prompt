import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Ranking from '@/components/dashboard/Ranking';
import EcoPick from '@/components/dashboard/EcoPick';
import Dashboard, { DashboardMetrics, DashboardStats } from '@/components/dashboard/Dashboard';
import useDeviceMode from '@/hooks/useDeviceMode';
import '@/styles/pages/home.css';

type TabType = 'ranking' | 'eco-pick' | 'dashboard';

export default function Home() {
  const mode = useDeviceMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && ['ranking', 'eco-pick', 'dashboard'].includes(tabFromUrl)
      ? tabFromUrl
      : 'ranking',
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'ranking', label: '랭킹' },
    { id: 'eco-pick', label: 'Eco 픽' },
    { id: 'dashboard', label: '대시보드' },
  ];

  // URL 파라미터 변경 시 탭 동기화
  useEffect(() => {
    if (tabFromUrl && ['ranking', 'eco-pick', 'dashboard'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // 탭 변경 함수 (URL 업데이트 포함)
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // 모바일에서 탭 간 스와이프 처리
  useEffect(() => {
    if (mode !== 'mobile') return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      isDraggingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const currentX = e.touches[0].clientX;
      const diff = startXRef.current - currentX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          // 왼쪽으로 스와이프 (다음 탭)
          const currentIndex = tabs.findIndex((t) => t.id === activeTab);
          if (currentIndex < tabs.length - 1) {
            handleTabChange(tabs[currentIndex + 1].id);
            isDraggingRef.current = false;
          }
        } else {
          // 오른쪽으로 스와이프 (이전 탭)
          const currentIndex = tabs.findIndex((t) => t.id === activeTab);
          if (currentIndex > 0) {
            handleTabChange(tabs[currentIndex - 1].id);
            isDraggingRef.current = false;
          }
        }
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mode, activeTab, tabs, handleTabChange]);

  // Eco 픽에서 스와이프 시 탭 전환
  const handleEcoPickSwipeLeft = () => {
    if (mode === 'mobile') {
      handleTabChange('ranking');
    }
  };

  const handleEcoPickSwipeRight = () => {
    if (mode === 'mobile') {
      handleTabChange('dashboard');
    }
  };

  return (
    <div className="home-container" ref={containerRef}>
      <div className="tabs-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tabs-content">
        {mode === 'mobile' ? (
          // 모바일: 한 번에 하나씩 표시
          <div className="tab-panel">
            {activeTab === 'ranking' && <Ranking />}
            {activeTab === 'eco-pick' && (
              <EcoPick
                onSwipeLeft={handleEcoPickSwipeLeft}
                onSwipeRight={handleEcoPickSwipeRight}
              />
            )}
            {activeTab === 'dashboard' && <Dashboard />}
          </div>
        ) : (
          // 태블릿/데스크탑: 모든 내용을 한눈에 표시
          <div className="dashboard-grid">
            <div className="left-sections">
              <div className="grid-section ranking-section">
                <h2 className="section-title">랭킹</h2>
                <Ranking />
              </div>
              <div className="grid-section metrics-section">
                <h2 className="section-title">마이 대시보드</h2>
                <DashboardMetrics />
              </div>
            </div>
            <div className="right-sections">
              <div className="grid-section eco-pick-section">
                <h2 className="section-title">Eco 픽</h2>
                <EcoPick />
              </div>
              <div className="grid-section stats-section">
                <h2 className="section-title">내 기록</h2>
                <DashboardStats />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
