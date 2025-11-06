import { apiClient } from '@/services/axios';

/**
 * 오늘 랭킹 조회
 * Endpoint: GET /api/v1/rankings/today
 * @returns 오늘의 랭킹 목록
 */
export const getTodayRankings = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/rankings/today');
  return response.data;
};

/**
 * 특정 날짜 랭킹 조회
 * Endpoint: GET /api/v1/rankings
 * @param date - 조회할 날짜 (YYYY-MM-DD 형식)
 * @returns 해당 날짜의 랭킹 목록
 */
export const getSpecificDateRankings = async (date: string): Promise<any> => {
  const response = await apiClient.get('/api/v1/rankings', {
    params: { date },
  });
  return response.data;
};
