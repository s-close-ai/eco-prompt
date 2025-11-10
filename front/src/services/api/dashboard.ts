import { apiClient } from '@/services/axios';
import type {
  RecordResponse,
  EcoPickResponse,
  DetailScoreResponse,
} from '@/types/api/dashboard.types';

/**
 * 개인 기록 조회
 * Endpoint: GET  /dashboard/records
 * @returns 개인 통계 정보 (최고 점수, 평균 점수, 총 마일리지, 프롬프트 횟수)
 */
export const getRecord = async (): Promise<RecordResponse> => {
  const response = await apiClient.get<RecordResponse>('/dashboard/records');
  return response.data;
};

/**
 * 에코픽 조회
 * Endpoint: GET  /dashboard/eco-pick
 * @returns 추천 프롬프트 목록
 */
export const getEcoPick = async (): Promise<EcoPickResponse> => {
  const response = await apiClient.get<EcoPickResponse>('/dashboard/eco-pick');
  return response.data;
};

/**
 * 상세 점수 조회
 * Endpoint: GET  /dashboard/detail-scores
 * @returns 나의 상세 점수와 전체 평균 점수
 */
export const getDetailScore = async (): Promise<DetailScoreResponse> => {
  const response = await apiClient.get<DetailScoreResponse>('/dashboard/detail-scores');
  return response.data;
};
