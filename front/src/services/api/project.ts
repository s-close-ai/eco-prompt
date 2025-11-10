import { apiClient } from '@/services/axios';
import type {
  AllChattingRoomsResponse,
  ProjectCreateRequest,
  ProjectCreateResponse,
  ChattingRoomsResponse,
  ProjectResponse,
  ProjectUpdateRequest,
  ProjectUpdateResponse,
} from '@/types/api/project.types';

/**
 * 전체 프로젝트 조회 (사이드바용)
 * Endpoint: GET  /projects
 * @returns 모든 프로젝트와 각 프로젝트의 채팅방 목록
 */
export const getPersonalProjects = async (): Promise<AllChattingRoomsResponse> => {
  const response = await apiClient.get<AllChattingRoomsResponse>('/projects');
  return response.data;
};

/**
 * 특정 프로젝트 상세 조회
 * Endpoint: GET  /projects/{projectId}
 * @param projectId - 조회할 프로젝트 ID
 * @returns 프로젝트 정보와 채팅방 목록
 */
export const getProject = async (projectId: number): Promise<ProjectResponse> => {
  const response = await apiClient.get(`/projects/${projectId}`);
  return response.data;
};

/**
 * 프로젝트 생성
 * Endpoint: POST  /projects
 * @param request - 프로젝트 제목
 * @returns 생성된 프로젝트 ID
 */
export const saveProject = async (
  request: ProjectCreateRequest,
): Promise<ProjectCreateResponse> => {
  const response = await apiClient.post<ProjectCreateResponse>('/projects', request);
  return response.data;
};

/**
 * 프로젝트 수정
 * Endpoint: PATCH  /projects/{projectId}
 * @param projectId - 수정할 프로젝트 ID
 * @param request - 수정할 프로젝트 제목
 */
export const updateProject = async (
  projectId: number,
  request: ProjectUpdateRequest,
): Promise<ProjectUpdateResponse> => {
  const response = await apiClient.patch<ProjectUpdateResponse>(`/projects/${projectId}`, request);
  return response.data;
};

/**
 * 프로젝트 삭제
 * Endpoint: PATCH  /projects/delete
 * @param projectId - 삭제할 프로젝트 ID
 * @returns HTTP 상태 코드 포함된 응답 (204 No Content 응답 처리)
 */
export const deleteProject = async (projectId: number) => {
  const response = await apiClient.patch(
    `/projects/delete`,
    {},
    {
      params: { projectId: projectId },
    },
  );
  // 204 응답은 body가 비어있으므로 status 코드 반환
  return {
    status: response.status,
    data: response.data,
  };
};

/**
 * 프로젝트의 채팅방 목록 조회 (페이징)
 * Endpoint: GET  /projects/{projectId}/chattings
 * @param projectId - 프로젝트 ID
 * @param page - 페이지 번호 (기본값: 0)
 * @returns 채팅방 목록
 */
export const getChattingsWithPaging = async (
  projectId: number,
  page: number = 0,
): Promise<ChattingRoomsResponse> => {
  const response = await apiClient.get<ChattingRoomsResponse>(`/projects/${projectId}/chattings`, {
    params: { page },
  });
  return response.data;
};
