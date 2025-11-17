// API 응답 타입
export interface RecordResponse {
  status: string;
  data: {
    highScore: number;
    averageScore: number;
    totalMileage: number;
    promptCount: number;
  };
}

export interface EcoPickResponse {
  status: string;
  data: EcoPickItem[];
}

export interface EcoPickItem {
  name: string;
  sc_ec_0: number;
  prompt: string;
  detailScore: DetailScoreItem;
}

export interface DetailScoreResponse {
  status: string;
  data: {
    myScoreResponse: DetailScoreItem;
    allScoreResponse: DetailScoreItem;
  };
}

export interface DetailScoreItem {
  sc_ec_0: number;
  sc_ec_1: number;
  sc_ec_2: number;
  sc_ec_3: number;
  sc_ec_4: number;
}

// UI/Mock용 타입
export interface MockRankingEntry {
  rank: number;
  name: string;
  highScore: number;
  mileage: number;
  rankChange: 'up' | 'down' | 'stay' | 'new';
}

export interface MockRankingData {
  date: Date;
  rankings: MockRankingEntry[];
}

export interface MockEcoPickPrompt {
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

export interface MockDashboardMetric {
  name: 'clarity' | 'specificity' | 'formatCompliance' | 'safety';
  displayName: string;
  myScore: number;
  averageScore: number;
}

export interface MockDashboardStats {
  highestRecord: number;
  averageScore: number;
  myMileage: number;
  promptCount: number;
}
