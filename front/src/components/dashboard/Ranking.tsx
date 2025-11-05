import { useState, useEffect, useRef } from 'react';
import { mockRankingData } from '@/data/mockData';
import type { RankingData } from '@/types/dashboard.types';
import useDeviceMode from '@/hooks/useDeviceMode';
import Tooltip from '@/components/common/Tooltip';
import '@/styles/components/dashboard/ranking.css';
import newIcon from '/icons/new.svg';

function getDateNumber(date: Date): string {
  return date.getDate().toString();
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isSameDate(date1: Date, date2: Date): boolean {
  return formatDate(date1) === formatDate(date2);
}

function getMonthLabel(date: Date): string {
  return `${date.getMonth() + 1}월`;
}

export default function Ranking() {
  const mode = useDeviceMode();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentRankings, setCurrentRankings] = useState<RankingData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 날짜 목록 생성 (오늘부터 6일 전까지)
  const dateList = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date;
  }).reverse(); // 오래된 날짜부터 최신 날짜 순서로

  // 선택된 날짜의 랭킹 데이터 로드
  useEffect(() => {
    const data = mockRankingData.find((d) => isSameDate(d.date, selectedDate));
    setCurrentRankings(data || null);
  }, [selectedDate]);

  // 새로고침 함수
  const handleRefresh = async () => {
    if (mode === 'desktop') {
      setIsRefreshing(true);
      // 실제로는 API 호출
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const data = mockRankingData.find((d) => isSameDate(d.date, selectedDate));
      setCurrentRankings(data || null);
      setIsRefreshing(false);
    }
  };

  // Pull-to-refresh (모바일/태블릿)
  useEffect(() => {
    if (mode === 'desktop') return;

    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0 && container.scrollTop === 0) {
        e.preventDefault();
      } else {
        isPulling = false;
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!isPulling) return;
      const currentY = e.changedTouches[0].clientY;
      const diff = currentY - startY;

      if (diff > 100) {
        setIsRefreshing(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const data = mockRankingData.find((d) => isSameDate(d.date, selectedDate));
        setCurrentRankings(data || null);
        setIsRefreshing(false);
      }

      isPulling = false;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mode, selectedDate]);

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return `/icons/${rank}.svg`;
    }
    return null;
  };

  const getRankChangeIcon = (change: string) => {
    if (change === 'new') return null;
    return `/icons/${change}.svg`;
  };

  return (
    <div className="ranking-container" ref={containerRef}>
      <div className="ranking-header">
        <div className="ranking-header-left">
          <div className="ranking-title-wrapper">
            <h2 className="ranking-title">Top 10 Rankings</h2>
            <Tooltip content="오늘 최고 점수 기준으로 랭킹이 결정됩니다. 동점일 경우 마일리지가 높은 순으로, 그래도 동점이면 프롬프트 수가 적은 순으로 정렬됩니다." />
          </div>
          <div className="date-selector">
            {dateList.map((date) => {
              const dateNumber = getDateNumber(date);
              const monthLabel = getMonthLabel(date);
              const isSelected = isSameDate(date, selectedDate);
              return (
                <button
                  key={formatDate(date)}
                  className={`date-button has-month ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span className="month-label">{monthLabel}</span>
                  <span className="date-number">{dateNumber}</span>
                </button>
              );
            })}
          </div>
        </div>
        {mode === 'desktop' && (
          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="새로고침"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isRefreshing ? 'spinning' : ''}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </button>
        )}
      </div>

      {isRefreshing && mode !== 'desktop' && (
        <div className="refresh-indicator">새로고침 중...</div>
      )}

      {currentRankings && (
        <div className="ranking-table-wrapper">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>High Score</th>
                <th>mileage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentRankings.rankings.map((entry) => (
                <tr key={entry.rank}>
                  <td className="rank-cell">
                    {getRankIcon(entry.rank) ? (
                      <img
                        src={getRankIcon(entry.rank)!}
                        alt={`${entry.rank}등`}
                        className="rank-icon"
                      />
                    ) : (
                      <span className="rank-number">{entry.rank}</span>
                    )}
                    <span className="rank-name">{entry.name}</span>
                  </td>
                  <td className="score-cell">{entry.highScore}</td>
                  <td className="mileage-cell">{entry.mileage.toLocaleString()}</td>
                  <td className="change-cell">
                    {entry.rankChange === 'new' ? (
                      <img src={newIcon} alt="new" className="change-icon" />
                    ) : (
                      getRankChangeIcon(entry.rankChange) && (
                        <img
                          src={getRankChangeIcon(entry.rankChange)!}
                          alt={entry.rankChange}
                          className="change-icon"
                        />
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
