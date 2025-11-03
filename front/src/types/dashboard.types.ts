// 랭킹 관련 타입
export interface RankingEntry {
  rank: number;
  name: string;
  highScore: number;
  mileage: number;
  rankChange: 'up' | 'down' | 'stay' | 'new';
}

export interface RankingData {
  date: Date;
  rankings: RankingEntry[];
}

// Eco 픽 프롬프트 타입
export interface EcoPickPrompt {
  id: number;
  name: string;
  score: number;
  description: string;
  tasks: string[];
  principles: string[];
  metrics: {
    clarity: number;
    specificity: number;
    formatCompliance: number;
    stability: number;
  };
}

// 대시보드 메트릭 타입
export interface DashboardMetric {
  name: 'clarity' | 'specificity' | 'formatCompliance' | 'stability';
  displayName: string;
  myScore: number;
  averageScore: number;
}

// 대시보드 통계 타입
export interface DashboardStats {
  highestRecord: number;
  averageScore: number;
  myMileage: number;
  promptCount: number;
}

