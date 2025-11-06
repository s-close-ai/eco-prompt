import { useState, useEffect, useCallback } from 'react';
import { getAllChattingRooms, getChattingRooms } from '@/services/api/chattingroom';

export interface ChatItem {
  chattingId: number;
  title: string;
  projectId: number;
}

export interface ProjectItem {
  projectId: number;
  title: string;
  chats: ChatItem[];
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

export interface SidebarData {
  projects: ProjectItem[];
  generalChats: ChatItem[];
  generalChatsPage: number;
  generalChatsTotalPages: number;
  generalChatsHasMore: boolean;
}

export function useSidebarData() {
  const [data, setData] = useState<SidebarData>({
    projects: [],
    generalChats: [],
    generalChatsPage: 0,
    generalChatsTotalPages: 0,
    generalChatsHasMore: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 초기 데이터 로드
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAllChattingRooms();
      const projectResponses = response.data.personalProjectResponses;

      const projects: ProjectItem[] = [];
      let generalChats: ChatItem[] = [];
      let generalChatsPage = 0;
      let generalChatsTotalPages = 0;
      let generalChatsHasMore = false;

      projectResponses.forEach((project) => {
        const firstChattingResponse = project.chattingResponses;

        if (project.projectId === 1) {
          // 기본 프로젝트는 일반 채팅으로 분류
          generalChats = firstChattingResponse.content.map((chat) => ({
            chattingId: chat.chattingId,
            title: chat.title,
            projectId: chat.projectId,
          }));
          generalChatsPage = firstChattingResponse.number;
          generalChatsTotalPages = firstChattingResponse.totalPages;
          generalChatsHasMore = !firstChattingResponse.last;
        } else {
          // 일반 프로젝트
          projects.push({
            projectId: project.projectId,
            title: project.title,
            chats: firstChattingResponse.content.map((chat) => ({
              chattingId: chat.chattingId,
              title: chat.title,
              projectId: chat.projectId,
            })),
            totalPages: firstChattingResponse.totalPages,
            currentPage: firstChattingResponse.number,
            hasMore: !firstChattingResponse.last,
          });
        }
      });

      setData({
        projects,
        generalChats,
        generalChatsPage,
        generalChatsTotalPages,
        generalChatsHasMore,
      });
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load sidebar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 프로젝트의 더 많은 채팅 로드
  const loadMoreProjectChats = useCallback(async (projectId: number) => {
    const project = data.projects.find((p) => p.projectId === projectId);
    if (!project || !project.hasMore) return;

    try {
      const nextPage = project.currentPage + 1;
      const response = await getChattingRooms(projectId);

      const newChats = response.data.content.map((chat) => ({
        chattingId: chat.chattingId,
        title: chat.title,
        projectId: chat.projectId,
      }));

      setData((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.projectId === projectId
            ? {
                ...p,
                chats: [...p.chats, ...newChats],
                currentPage: response.data.number,
                hasMore: !response.data.last,
              }
            : p
        ),
      }));
    } catch (err) {
      console.error(`Failed to load more chats for project ${projectId}:`, err);
    }
  }, [data.projects]);

  // 일반 채팅의 더 많은 항목 로드
  const loadMoreGeneralChats = useCallback(async () => {
    if (!data.generalChatsHasMore) return;

    try {
      const nextPage = data.generalChatsPage + 1;
      const response = await getChattingRooms(1); // projectId 1은 기본 프로젝트

      const newChats = response.data.content.map((chat) => ({
        chattingId: chat.chattingId,
        title: chat.title,
        projectId: chat.projectId,
      }));

      setData((prev) => ({
        ...prev,
        generalChats: [...prev.generalChats, ...newChats],
        generalChatsPage: response.data.number,
        generalChatsHasMore: !response.data.last,
      }));
    } catch (err) {
      console.error('Failed to load more general chats:', err);
    }
  }, [data.generalChatsPage, data.generalChatsHasMore]);

  return {
    data,
    isLoading,
    error,
    loadInitialData,
    loadMoreProjectChats,
    loadMoreGeneralChats,
  };
}
