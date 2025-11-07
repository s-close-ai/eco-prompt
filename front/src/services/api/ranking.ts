import { apiClient } from '@/services/axios';
import type { RankingResponse } from '@/types/api/ranking.types';

/**
 * 오늘 랭킹 조회
 * Endpoint: GET  /rankings/today
 * @returns 오늘의 랭킹 목록
 */
export const getTodayRankings = async (): Promise<RankingResponse> => {
  const response = await apiClient.get<RankingResponse>('/rankings/today');
  return response.data;
};

/**
 * 특정 날짜 랭킹 조회
 * Endpoint: GET  /rankings
 * @param date - 조회할 날짜 (YYYY-MM-DD 형식)
 * @returns 해당 날짜의 랭킹 목록
 */
export const getSpecificDateRankings = async (date: string): Promise<RankingResponse> => {
  const response = await apiClient.get<RankingResponse>('/rankings', {
    params: { date },
  });
  return response.data;
};
