import { useState, useEffect, useRef } from 'react';
import { getTodayRankings, getSpecificDateRankings } from '@/services/api/ranking';
import type { RankingItem } from '@/types/api/ranking.types';
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
  const [currentRankings, setCurrentRankings] = useState<RankingItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // 날짜 목록 생성 (오늘부터 6일 전까지)
  const dateList = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date;
  }).reverse(); // 오래된 날짜부터 최신 날짜 순서로

  // 선택된 날짜의 랭킹 데이터 로드
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const today = new Date();
        if (isSameDate(selectedDate, today)) {
          const response = await getTodayRankings();
          setCurrentRankings(response.data.content);
          setUpdatedAt(response.data.updatedAt || null);
        } else {
          const response = await getSpecificDateRankings(formatDate(selectedDate));
          setCurrentRankings(response.data);
          setUpdatedAt(null); // 과거 날짜는 updatedAt이 없음
        }
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
        setCurrentRankings([]);
        setUpdatedAt(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedDate]);

  // 업데이트 시간 포맷 함수
  const getUpdateTimeText = () => {
    if (!updatedAt) {
      return null; // updatedAt이 없으면 null 반환 (과거 날짜)
    }

    // updatedAt 파싱: "2025.11.10.13.38.51" 형식
    // 형식: YYYY.MM.DD.HH.mm.ss
    const parts = updatedAt.split('.');
    if (parts.length !== 6) {
      return null; // 형식이 맞지 않으면 null 반환
    }

    const hours = parseInt(parts[3], 10);
    const minutes = parseInt(parts[4], 10);
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}:${minutes.toString().padStart(2, '0')} 업데이트`;
  };

  // 오늘 날짜인지 확인
  const isToday = isSameDate(selectedDate, new Date());
  const updateTimeText = getUpdateTimeText();

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return `/icons/${rank}.svg`;
    }
    return null;
  };

  const getRankChangeIcon = (change: string) => {
    if (change === 'NEW') return null;
    return `/icons/${change.toLowerCase()}.svg`;
  };

  if (loading) {
    return <div className="ranking-container">Loading...</div>;
  }

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
        {mode !== 'mobile' && isToday && updateTimeText && (
          <div className="update-time-text">{updateTimeText}</div>
        )}
      </div>

      {currentRankings.length > 0 && (
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
              {currentRankings.map((entry: RankingItem) => (
                <tr key={entry.ranking}>
                  <td className="rank-cell">
                    {getRankIcon(entry.ranking) ? (
                      <img
                        src={getRankIcon(entry.ranking)!}
                        alt={`${entry.ranking}등`}
                        className="rank-icon"
                      />
                    ) : (
                      <span className="rank-number">{entry.ranking}</span>
                    )}
                    <span className="rank-name">{entry.name}</span>
                  </td>
                  <td className="score-cell">{entry.score}</td>
                  <td className="mileage-cell">{entry.mileage.toLocaleString()}</td>
                  <td className="change-cell">
                    {entry.change === 'NEW' ? (
                      <img src={newIcon} alt="new" className="change-icon" />
                    ) : (
                      getRankChangeIcon(entry.change) && (
                        <img
                          src={getRankChangeIcon(entry.change)!}
                          alt={entry.change}
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
      {currentRankings.length === 0 && !loading && (
        <div className="ranking-empty">랭킹 데이터가 없습니다.</div>
      )}
    </div>
  );
}
