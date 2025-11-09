// 특정 날짜 랭킹 응답 (GET /api/v1/rankings)
export interface RankingResponse {
  status: string;
  data: RankingItem[];
}

// 오늘 랭킹 응답 (GET /api/v1/rankings/today)
export interface TodayRankingResponse {
  status: string;
  data: {
    content: RankingItem[];
    updatedAt: string;
  };
}

export interface RankingItem {
  ranking: number;
  name: string;
  score: number;
  mileage: number;
  promptCount: number;
  change: 'UP' | 'DOWN' | 'KEEP' | 'NEW';
}
