import { useState, useCallback } from 'react';
import { getPersonalProjects, getChattingsWithPaging } from '@/services/api/project';
import type { SidebarProjectItem, SidebarChatItem } from '@/types/sidebar.types';
import { useProjectStore } from '@/store/projectStore';

export function useSidebarData() {
  const { setProjects, setGeneralChats } = useProjectStore();
  const [data, setData] = useState<{
    generalChatsPage: number;
    generalChatsTotalPages: number;
    generalChatsHasMore: boolean;
    projectsPage: number;
    projectsHasMore: boolean;
  }>({
    generalChatsPage: 0,
    generalChatsTotalPages: 0,
    generalChatsHasMore: false,
    projectsPage: 0,
    projectsHasMore: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 초기 데이터 로드 (프로젝트 20개만)
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getPersonalProjects();
      const projectResponses = response.data.personalProjectResponses;

      const projects: SidebarProjectItem[] = [];
      let generalChats: SidebarChatItem[] = [];
      let generalChatsPage = 0;
      let generalChatsTotalPages = 0;
      let generalChatsHasMore = false;

      // 프로젝트 목록을 처음 20개만 처리 (프로젝트 ID 1 제외)
      const nonDefaultProjects = projectResponses.filter((p) => p.projectId !== 1);
      const initialProjects = nonDefaultProjects.slice(0, 20);

      initialProjects.forEach((project) => {
        const firstChattingResponse = project.chattingResponses;

        // 일반 프로젝트 - 첫 페이지의 처음 20개만 가져오기
        projects.push({
          projectId: project.projectId,
          title: project.title,
          chats: firstChattingResponse.content.slice(0, 20).map((chat) => ({
            chattingId: chat.chattingId,
            title: chat.title,
            projectId: chat.projectId,
          })),
          totalPages: firstChattingResponse.totalPages,
          currentPage: 0,
          // 첫 페이지에 20개 이상 있거나, 다음 페이지가 있으면 hasMore = true
          hasMore: firstChattingResponse.content.length > 20 || !firstChattingResponse.last,
        });
      });

      // 기본 프로젝트(projectId: 1)는 일반 채팅으로 분류
      const defaultProject = projectResponses.find((p) => p.projectId === 1);
      if (defaultProject) {
        const firstChattingResponse = defaultProject.chattingResponses;
        generalChats = firstChattingResponse.content.slice(0, 20).map((chat) => ({
          chattingId: chat.chattingId,
          title: chat.title,
          projectId: chat.projectId,
        }));
        generalChatsPage = firstChattingResponse.number;
        generalChatsTotalPages = firstChattingResponse.totalPages;
        generalChatsHasMore = firstChattingResponse.content.length > 20 || !firstChattingResponse.last;
      }

      setProjects(projects);
      setGeneralChats(generalChats);
      setData({
        generalChatsPage,
        generalChatsTotalPages,
        generalChatsHasMore,
        projectsPage: 0,
        projectsHasMore: nonDefaultProjects.length > 20,
      });
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load sidebar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setProjects, setGeneralChats]);

  // 프로젝트 목록 더 불러오기
  const loadMoreProjects = useCallback(async () => {
    if (!data.projectsHasMore || isLoading) return;

    setIsLoading(true);
    try {
      const response = await getPersonalProjects();
      const projectResponses = response.data.personalProjectResponses;
      const nonDefaultProjects = projectResponses.filter((p) => p.projectId !== 1);
      
      const { projects } = useProjectStore.getState();
      const currentCount = projects.length;
      const nextProjects = nonDefaultProjects.slice(currentCount, currentCount + 20);

      const newProjects: SidebarProjectItem[] = nextProjects.map((project) => {
        const firstChattingResponse = project.chattingResponses;
        return {
          projectId: project.projectId,
          title: project.title,
          chats: firstChattingResponse.content.slice(0, 20).map((chat) => ({
            chattingId: chat.chattingId,
            title: chat.title,
            projectId: chat.projectId,
          })),
          totalPages: firstChattingResponse.totalPages,
          currentPage: 0,
          hasMore: firstChattingResponse.content.length > 20 || !firstChattingResponse.last,
        };
      });

      setProjects([...projects, ...newProjects]);
      setData((prev) => ({
        ...prev,
        projectsPage: prev.projectsPage + 1,
        projectsHasMore: nonDefaultProjects.length > currentCount + 20,
      }));
    } catch (err) {
      console.error('Failed to load more projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [data.projectsHasMore, isLoading, setProjects]);

  // 프로젝트의 더 많은 채팅 로드
  const loadMoreProjectChats = useCallback(
    async (projectId: number) => {
      const { projects } = useProjectStore.getState();
      const project = projects.find((p) => p.projectId === projectId);
      if (!project || !project.hasMore) return;

      try {
        const response = await getChattingsWithPaging(projectId, project.currentPage + 1);
        const chattingData = response.data.chattingResponses;

        const newChats = chattingData.content.map((chat) => ({
          chattingId: chat.chattingId,
          title: chat.title,
          projectId: chat.projectId,
        }));

        // 스토어 업데이트
        const updatedProjects = projects.map((p) =>
          p.projectId === projectId
            ? {
                ...p,
                chats: [...p.chats, ...newChats],
                currentPage: chattingData.number,
                hasMore: !chattingData.last,
              }
            : p,
        );
        setProjects(updatedProjects);
      } catch (err) {
        console.error(`Failed to load more chats for project ${projectId}:`, err);
      }
    },
    [setProjects],
  );

  // 일반 채팅의 더 많은 항목 로드
  const loadMoreGeneralChats = useCallback(async () => {
    if (!data.generalChatsHasMore || isLoading) return;

    setIsLoading(true);
    try {
      const nextPage = data.generalChatsPage + 1;
      const response = await getChattingsWithPaging(1, nextPage); // projectId 1은 기본 프로젝트

      // 응답 구조 확인 - 실제 응답 구조에 맞게 수정
      // 응답이 data.chattingResponses 형태일 수도 있고, data가 직접 ChattingRoomsItem일 수도 있음
      let chattingData;
      if (response.data?.chattingResponses) {
        chattingData = response.data.chattingResponses;
      } else if ((response.data as any)?.content) {
        // 직접 content가 있는 경우 (실제 API 응답 구조)
        chattingData = response.data as any;
      } else {
        console.error('Invalid response structure:', response);
        // 응답 구조가 잘못되었으면 더 이상 로드하지 않도록 설정
        setData((prev) => ({
          ...prev,
          generalChatsHasMore: false,
        }));
        return;
      }

      if (!chattingData.content || !Array.isArray(chattingData.content)) {
        console.error('Invalid response structure: content is not an array', response);
        setData((prev) => ({
          ...prev,
          generalChatsHasMore: false,
        }));
        return;
      }

      const newChats = chattingData.content.map((chat: any) => ({
        chattingId: chat.chattingId,
        title: chat.title,
        projectId: chat.projectId,
      }));

      // store에 추가 - 기존 목록 아래에 추가
      const { generalChats } = useProjectStore.getState();
      setGeneralChats([...generalChats, ...newChats]);

      setData((prev) => ({
        ...prev,
        generalChatsPage: chattingData.number ?? nextPage,
        generalChatsHasMore: !chattingData.last,
      }));
    } catch (err) {
      console.error('Failed to load more general chats:', err);
      // 에러 발생 시 더 이상 로드하지 않도록 설정
      setData((prev) => ({
        ...prev,
        generalChatsHasMore: false,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [data.generalChatsPage, data.generalChatsHasMore, isLoading, setGeneralChats]);

  return {
    data,
    isLoading,
    error,
    loadInitialData,
    loadMoreProjects,
    loadMoreProjectChats,
    loadMoreGeneralChats,
    projectsHasMore: data.projectsHasMore,
  };
}
