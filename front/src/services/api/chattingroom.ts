import { apiClient } from "@/services/axios";
import type { AllChattingRoomsResponse, ProjectCreateRequest, ProjectCreateResponse, ProjectDeleteResponse, ChattingRoomsResponse, ProjectDeleteRequest } from "@/types/chattingroom.types";

// 모든 채팅방 조회
export const getAllChattingRooms = async (): Promise<AllChattingRoomsResponse> => {
    const response = await apiClient.get<AllChattingRoomsResponse>("/api/v1/projects");
    return response.data;
}

// 프로젝트 생성
export const createProject = async (request: ProjectCreateRequest): Promise<ProjectCreateResponse> => {
    const response = await apiClient.post<ProjectCreateResponse>("/api/v1/projects", request);
    return response.data;
}

// 프로젝트 수정
export const updateProject = async (projectId: number, request: ProjectCreateRequest): Promise<ProjectDeleteResponse> => {
    const response = await apiClient.patch<ProjectDeleteResponse>(`/api/v1/projects/${projectId}`, request);
    return response.data;
}

// 프로젝트 삭제
export const deleteProject = async ( request: ProjectDeleteRequest): Promise<ProjectDeleteResponse> => {
    const response = await apiClient.patch<ProjectDeleteResponse>(`/api/v1/projects/delete/`, request);
    return response.data;
}

// 채팅방 조회
export const getChattingRooms = async (projectId: number): Promise<ChattingRoomsResponse> => {
    const response = await apiClient.get<ChattingRoomsResponse>(`/api/v1/projects/${projectId}/chattings`);
    return response.data;
}