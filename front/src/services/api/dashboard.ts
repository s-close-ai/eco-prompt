import { apiClient } from '@/services/axios';

/**
 * 개인 기록 조회
 * Endpoint: GET /api/v1/dashboard/records
 * @returns 개인 통계 정보 (최고 점수, 평균 점수, 총 마일리지, 프롬프트 횟수)
 */
export const getRecord = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/dashboard/records');
  return response.data;
};

/**
 * 에코픽 조회
 * Endpoint: GET /api/v1/dashboard/eco-pick
 * @returns 추천 프롬프트 목록
 */
export const getEcoPick = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/dashboard/eco-pick');
  return response.data;
};

/**
 * 상세 점수 조회
 * Endpoint: GET /api/v1/dashboard/detail-scores
 * @returns 나의 상세 점수와 전체 평균 점수
 */
export const getDetailScore = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/dashboard/detail-scores');
  return response.data;
};
