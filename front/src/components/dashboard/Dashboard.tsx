import { useEffect, useState } from 'react';
import { getRecord, getDetailScore } from '@/services/api/dashboard';
import type { DetailScoreItem } from '@/types/api/dashboard.types';
import Tooltip from '@/components/common/Tooltip';
import '@/styles/components/dashboard/dashboard.css';

const metricDescriptions: Record<string, string> = {
  clarityScore: '질문이 명확하고 오해의 여지가 없는 정도를 나타냅니다.',
  specificityScore: '필요한 정보와 제한조건이 구체적으로 제시된 정도를 나타냅니다.',
  formatScore: '출력 형식, 언어, 길이 등이 명확히 지시된 정도를 나타냅니다.',
  safetyScore: '안전하고 윤리적으로 문제 없는 정도를 나타냅니다.',
};

const metricDisplayNames: Record<string, string> = {
  clarityScore: '명확성',
  specificityScore: '구체성',
  formatScore: '형식 준수',
  safetyScore: '안정성',
};

interface MetricData {
  name: string;
  displayName: string;
  myScore: number;
  averageScore: number;
}

function CircularProgress({
  metric,
  size = 130,
  strokeWidth = 12,
}: {
  metric: MetricData;
  size?: number;
  strokeWidth?: number;
}) {
  // 내부 계산은 기준 크기(size)를 사용하고, 실제 표시 크기는 컨테이너의 CSS clamp로 제어한다.
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 각 점수는 최대 25점이므로, 25를 기준으로 계산
  const maxScore = 25;
  const myPercentage = Math.min((metric.myScore / maxScore) * 100, 100);
  const averagePercentage = Math.min((metric.averageScore / maxScore) * 100, 100);
  const myOffset = circumference - (myPercentage / 100) * circumference;
  const averageOffset = circumference - (averagePercentage / 100) * circumference;

  return (
    <div
      className="circular-progress-container"
      style={{
        width: 'clamp(7rem, 6.77vw, 9rem)',
        height: 'clamp(7rem, 6.77vw, 9rem)',
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="circular-progress">
        {/* 배경 원 (연한 회색) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
        />
        {/* 평균 점수 원 (연한 초록색) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#90ee90"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={averageOffset}
          strokeLinecap="round"
          className="average-circle"
        />
        {/* 내 점수 원 (진한 초록색) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#006400"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={myOffset}
          strokeLinecap="round"
          className="my-score-circle"
        />
      </svg>
      <div className="circular-progress-text">
        <div className="score-value my-score">{metric.myScore.toFixed(2)}</div>
        <div className="score-value average-score">{metric.averageScore.toFixed(2)}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [stats, setStats] = useState({
    highScore: 0,
    averageScore: 0,
    totalMileage: 0,
    promptCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [recordData, detailScoreData] = await Promise.all([getRecord(), getDetailScore()]);

        setStats(recordData.data);

        // API 타입의 DetailScoreItem을 MetricData로 변환
        const metricsData: MetricData[] = Object.keys(detailScoreData.data.myScoreResponse).map(
          (key) => ({
            name: key,
            displayName: metricDisplayNames[key] || key,
            myScore: detailScoreData.data.myScoreResponse[key as keyof DetailScoreItem],
            averageScore: detailScoreData.data.allScoreResponse[key as keyof DetailScoreItem],
          }),
        );

        setMetrics(metricsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="dashboard-container">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-metrics">
        {metrics.map((metric) => (
          <div key={metric.name} className="metric-card">
            <div className="metric-title-wrapper">
              <h3 className="metric-title">{metric.displayName}</h3>
              <Tooltip content={metricDescriptions[metric.name] || ''} />
            </div>
            <CircularProgress metric={metric} />
          </div>
        ))}
      </div>

      <div className="dashboard-stats">
        <h3 className="stats-title">기록 통계</h3>
        <div className="stats-list">
          <div className="stat-item">
            <span className="stat-label">최고기록</span>
            <span className="stat-value">{stats.highScore} 점</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">평균 점수</span>
            <span className="stat-value">{stats.averageScore} 점</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">내 마일리지</span>
            <span className="stat-value">{stats.totalMileage.toLocaleString()} 마일</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">입력한 프롬프트 개수</span>
            <span className="stat-value">{stats.promptCount} 개</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 대시보드 메트릭만 표시하는 컴포넌트
export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetailScore = async () => {
      try {
        setLoading(true);
        const detailScoreData = await getDetailScore();

        const metricsData: MetricData[] = Object.keys(detailScoreData.data.myScoreResponse).map(
          (key) => ({
            name: key,
            displayName: metricDisplayNames[key] || key,
            myScore: detailScoreData.data.myScoreResponse[key as keyof DetailScoreItem],
            averageScore: detailScoreData.data.allScoreResponse[key as keyof DetailScoreItem],
          }),
        );

        setMetrics(metricsData);
      } catch (error) {
        console.error('Failed to fetch detail score:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailScore();
  }, []);

  if (loading) {
    return <div className="dashboard-metrics-container">Loading...</div>;
  }

  return (
    <div className="dashboard-metrics-container">
      <div className="dashboard-metrics">
        {metrics.map((metric) => (
          <div key={metric.name} className="metric-card">
            <div className="metric-title-wrapper">
              <h3 className="metric-title">{metric.displayName}</h3>
              <Tooltip content={metricDescriptions[metric.name] || ''} />
            </div>
            <CircularProgress metric={metric} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 기록 통계만 표시하는 컴포넌트
export function DashboardStats() {
  const [stats, setStats] = useState({
    highScore: 0,
    averageScore: 0,
    totalMileage: 0,
    promptCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setLoading(true);
        const recordData = await getRecord();
        setStats(recordData.data);
      } catch (error) {
        console.error('Failed to fetch record:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, []);

  if (loading) {
    return <div className="dashboard-stats-container">Loading...</div>;
  }

  return (
    <div className="dashboard-stats-container">
      <h3 className="stats-title">기록 통계</h3>
      <div className="stats-list">
        <div className="stat-item">
          <span className="stat-label">최고기록</span>
          <span className="stat-value">{stats.highScore}점</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">평균 점수</span>
          <span className="stat-value">{stats.averageScore}점</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">내 마일리지</span>
          <span className="stat-value">{stats.totalMileage.toLocaleString()}마일</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">입력한 프롬프트 개수</span>
          <span className="stat-value">{stats.promptCount}개</span>
        </div>
      </div>
    </div>
  );
}
