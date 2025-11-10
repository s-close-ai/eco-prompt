export interface RankingResponse {
  status: string;
  data: RankingItem[];
}

export interface RankingItem {
  ranking: number;
  name: string;
  score: number;
  mileage: number;
  promptCount: number;
  change: 'UP' | 'DOWN' | 'KEEP' | 'NEW';
}
