import { create } from 'zustand';
import type { SidebarProjectItem, SidebarChatItem } from '@/types/sidebar.types';

export interface Project {
  projectId: number;
  title: string;
}

interface ProjectStore {
  projects: SidebarProjectItem[];
  generalChats: SidebarChatItem[];
  defaultProjectId: number | null; // 사용자의 기본 프로젝트 ID
  setProjects: (projects: SidebarProjectItem[]) => void;
  setGeneralChats: (chats: SidebarChatItem[]) => void;
  setDefaultProjectId: (projectId: number) => void; // 기본 프로젝트 ID 설정
  addProject: (project: Project) => void;
  addChatToProject: (projectId: number, chat: SidebarChatItem) => void;
  removeProject: (projectId: number) => void;
  updateProjectTitle: (projectId: number, title: string) => void;
  updateChatTitle: (chattingId: number, title: string) => void;
  moveChatToTop: (chattingId: number) => void;
  removeChat: (chattingId: number) => void;
  moveChatToProject: (chattingId: number, targetProjectId: number) => void;
  editingProjectId: number | null;
  setEditingProjectId: (projectId: number | null) => void;
  editingChatId: number | null;
  setEditingChatId: (chatId: number | null) => void;
}

export const useProjectStore = create<ProjectStore>((set): ProjectStore => ({
  projects: [],
  generalChats: [],
  defaultProjectId: null,
  setProjects: (projects: SidebarProjectItem[]) => set({ projects }),
  setGeneralChats: (chats: SidebarChatItem[]) => set({ generalChats: chats }),
  setDefaultProjectId: (projectId: number) => set({ defaultProjectId: projectId }),
  // 새 프로젝트를 맨 위에 추가
  addProject: (project: Project) =>
    set((state: ProjectStore) => ({
      projects: [
        {
          ...project,
          chats: [],
          totalPages: 0,
          currentPage: 0,
          hasMore: false,
        },
        ...state.projects,
      ],
    })),
  // 프로젝트에 채팅 추가 (맨 위에 추가하고 5개 초과 시 맨 아래 제거)
  addChatToProject: (projectId: number, chat: SidebarChatItem) =>
    set((state: ProjectStore) => ({
      projects: state.projects.map((p: SidebarProjectItem) => {
        if (p.projectId === projectId) {
          const newChats = [chat, ...p.chats];
          // 백엔드가 5개만 보내주므로, 6개 이상이면 맨 아래 제거
          return { ...p, chats: newChats.length > 5 ? newChats.slice(0, 5) : newChats };
        }
        return p;
      }),
    })),
  // 프로젝트 삭제
  removeProject: (projectId: number) =>
    set((state: ProjectStore) => ({
      projects: state.projects.filter((p: SidebarProjectItem) => p.projectId !== projectId),
    })),
  // 프로젝트 제목 변경
  updateProjectTitle: (projectId: number, title: string) =>
    set((state: ProjectStore) => ({
      projects: state.projects.map((p: SidebarProjectItem) => (p.projectId === projectId ? { ...p, title } : p)),
    })),
  // 채팅 제목 변경 (변경된 채팅을 맨 위로 이동)
  updateChatTitle: (chattingId: number, title: string) =>
    set((state: ProjectStore) => {
      // 일반 채팅에서 찾기
      const generalChat = state.generalChats.find((c: SidebarChatItem) => c.chattingId === chattingId);
      if (generalChat) {
        const otherChats = state.generalChats.filter((c: SidebarChatItem) => c.chattingId !== chattingId);
        return {
          generalChats: [{ ...generalChat, title }, ...otherChats],
        };
      }

      // 프로젝트 내부 채팅에서 찾기
      const updatedProjects = state.projects.map((project: SidebarProjectItem) => {
        const chat = project.chats.find((c: SidebarChatItem) => c.chattingId === chattingId);
        if (chat) {
          const otherChats = project.chats.filter((c: SidebarChatItem) => c.chattingId !== chattingId);
          const newChats = [{ ...chat, title }, ...otherChats];
          return {
            ...project,
            chats: newChats.length > 5 ? newChats.slice(0, 5) : newChats,
          };
        }
        return project;
      });

      return { projects: updatedProjects };
    }),
  // 채팅을 맨 위로 이동 (제목 변경 없이)
  moveChatToTop: (chattingId: number) =>
    set((state: ProjectStore) => {
      // 일반 채팅에서 찾기
      const generalChat = state.generalChats.find((c: SidebarChatItem) => c.chattingId === chattingId);
      if (generalChat) {
        const otherChats = state.generalChats.filter((c: SidebarChatItem) => c.chattingId !== chattingId);
        return {
          generalChats: [generalChat, ...otherChats],
        };
      }

      // 프로젝트 내부 채팅에서 찾기
      const updatedProjects = state.projects.map((project: SidebarProjectItem) => {
        const chat = project.chats.find((c: SidebarChatItem) => c.chattingId === chattingId);
        if (chat) {
          const otherChats = project.chats.filter((c: SidebarChatItem) => c.chattingId !== chattingId);
          const newChats = [chat, ...otherChats];
          return {
            ...project,
            chats: newChats.length > 5 ? newChats.slice(0, 5) : newChats,
          };
        }
        return project;
      });

      return { projects: updatedProjects };
    }),
  // 채팅 삭제 (모든 프로젝트 + 일반 채팅에서)
  removeChat: (chattingId: number) =>
    set((state: ProjectStore) => ({
      projects: state.projects.map((p: SidebarProjectItem) => ({
        ...p,
        chats: p.chats.filter((c: SidebarChatItem) => c.chattingId !== chattingId),
      })),
      generalChats: state.generalChats.filter((c: SidebarChatItem) => c.chattingId !== chattingId),
    })),
  // 채팅을 다른 프로젝트로 이동
  moveChatToProject: (chattingId: number, targetProjectId: number) =>
    set((state: ProjectStore) => {
      // 이동할 채팅 찾기 (프로젝트 내부 또는 일반 채팅)
      let chatToMove: SidebarChatItem | null = null;
      let fromGeneralChats = false;

      // 일반 채팅에서 찾기
      const generalChat = state.generalChats.find((c: SidebarChatItem) => c.chattingId === chattingId);
      if (generalChat) {
        chatToMove = { ...generalChat, projectId: targetProjectId };
        fromGeneralChats = true;
      } else {
        // 프로젝트 내부에서 찾기
        for (const project of state.projects) {
          const chat = project.chats.find((c: SidebarChatItem) => c.chattingId === chattingId);
          if (chat) {
            chatToMove = { ...chat, projectId: targetProjectId };
            break;
          }
        }
      }

      if (!chatToMove) return state;

      // 기본 프로젝트(일반 채팅)로 이동하는 경우
      if (targetProjectId === state.defaultProjectId) {
        return {
          projects: state.projects.map((p: SidebarProjectItem) => ({
            ...p,
            chats: p.chats.filter((c: SidebarChatItem) => c.chattingId !== chattingId),
          })),
          // 일반 채팅에 추가 (맨 위에, 제한 없음)
          generalChats: fromGeneralChats
            ? state.generalChats // 이미 일반 채팅에 있으면 그대로
            : [chatToMove, ...state.generalChats],
        };
      }

      // 다른 프로젝트로 이동하는 경우
      return {
        projects: state.projects.map((p: SidebarProjectItem) => {
          if (p.projectId === targetProjectId) {
            // 대상 프로젝트에 채팅 추가 (5개 제한)
            const newChats = [chatToMove!, ...p.chats];
            return {
              ...p,
              chats: newChats.length > 5 ? newChats.slice(0, 5) : newChats,
            };
          } else {
            // 기존 프로젝트에서 채팅 제거
            return {
              ...p,
              chats: p.chats.filter((c: SidebarChatItem) => c.chattingId !== chattingId),
            };
          }
        }),
        // 일반 채팅에서 제거
        generalChats: fromGeneralChats
          ? state.generalChats.filter((c: SidebarChatItem) => c.chattingId !== chattingId)
          : state.generalChats,
      };
    }),
  // 편집 상태 관리
  editingProjectId: null,
  setEditingProjectId: (projectId: number | null) => set({ editingProjectId: projectId }),
  editingChatId: null,
  setEditingChatId: (chatId: number | null) => set({ editingChatId: chatId }),
}));
