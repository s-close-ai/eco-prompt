import { apiClient } from '@/services/axios';
import type {
  AllChattingRoomsResponse,
  ProjectCreateRequest,
  ProjectCreateResponse,
  ProjectDeleteResponse,
  ChattingRoomsResponse,
  ProjectDeleteRequest,
  ProjectResponse,
} from '@/types/project.types';

/**
 * 전체 프로젝트 조회 (사이드바용)
 * Endpoint: GET /api/v1/projects
 * @returns 모든 프로젝트와 각 프로젝트의 채팅방 목록
 */
export const getPersonalProjects = async (): Promise<AllChattingRoomsResponse> => {
  const response = await apiClient.get<AllChattingRoomsResponse>('/api/v1/projects');
  return response.data;
};

/**
 * 특정 프로젝트 상세 조회
 * Endpoint: GET /api/v1/projects/{projectId}
 * @param projectId - 조회할 프로젝트 ID
 * @returns 프로젝트 정보와 채팅방 목록
 */
export const getProject = async (projectId: number): Promise<ProjectResponse> => {
  const response = await apiClient.get(`/api/v1/projects/${projectId}`);
  return response.data;
};

/**
 * 프로젝트 생성
 * Endpoint: POST /api/v1/projects
 * @param request - 프로젝트 제목
 * @returns 생성된 프로젝트 ID
 */
export const saveProject = async (
  request: ProjectCreateRequest,
): Promise<ProjectCreateResponse> => {
  const response = await apiClient.post<ProjectCreateResponse>('/api/v1/projects', request);
  return response.data;
};

/**
 * 프로젝트 수정
 * Endpoint: PATCH /api/v1/projects/{projectId}
 * @param projectId - 수정할 프로젝트 ID
 * @param request - 수정할 프로젝트 제목
 */
export const updateProject = async (
  projectId: number,
  request: ProjectCreateRequest,
): Promise<ProjectDeleteResponse> => {
  const response = await apiClient.patch<ProjectDeleteResponse>(
    `/api/v1/projects/${projectId}`,
    request,
  );
  return response.data;
};

/**
 * 프로젝트 삭제
 * Endpoint: PATCH /api/v1/projects/delete
 * @param projectId - 삭제할 프로젝트 ID
 */
export const deleteProject = async (
  request: ProjectDeleteRequest,
): Promise<ProjectDeleteResponse> => {
  const response = await apiClient.patch<ProjectDeleteResponse>(
    `/api/v1/projects/delete`,
    {},
    {
      params: { projectId: request.projectId },
    },
  );
  return response.data;
};

/**
 * 프로젝트의 채팅방 목록 조회 (페이징)
 * Endpoint: GET /api/v1/projects/{projectId}/chattings
 * @param projectId - 프로젝트 ID
 * @param page - 페이지 번호 (기본값: 0)
 * @returns 채팅방 목록
 */
export const getChattingsWithPaging = async (
  projectId: number,
  page: number = 0,
): Promise<ChattingRoomsResponse> => {
  const response = await apiClient.get<ChattingRoomsResponse>(
    `/api/v1/projects/${projectId}/chattings`,
    {
      params: { page },
    },
  );
  return response.data;
};
