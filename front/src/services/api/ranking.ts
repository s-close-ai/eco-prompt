import { apiClient } from '@/services/axios';
import type { RankingResponse, TodayRankingResponse } from '@/types/api/ranking.types';

/**
 * 오늘 랭킹 조회
 * Endpoint: GET  /api/v1/rankings/today
 * 어제와 비교한 오늘의 랭킹을 조회하는 API
 * @returns 오늘의 랭킹 목록 (content, updatedAt 포함)
 */
export const getTodayRankings = async (): Promise<TodayRankingResponse> => {
  const response = await apiClient.get<TodayRankingResponse>('/rankings/today');
  return response.data;
};

/**
 * 특정 날짜 랭킹 조회
 * Endpoint: GET  /api/v1/rankings
 * 특정 날짜의 랭킹을 조회하는 API (해당 날짜의 00시~23:59까지 집계된 랭킹 스냅샷)
 * @param date - 조회할 날짜 (YYYY-MM-DD 형식, 예: 2025-11-08)
 * @returns 해당 날짜의 랭킹 목록
 */
export const getSpecificDateRankings = async (date: string): Promise<RankingResponse> => {
  const response = await apiClient.get<RankingResponse>('/rankings', {
    params: { date },
  });
  return response.data;
};
