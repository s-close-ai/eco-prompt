import { create } from 'zustand';
import type { SidebarProjectItem, SidebarChatItem } from '@/types/sidebar.types';

export interface Project {
  projectId: number;
  title: string;
}

interface ProjectStore {
  projects: SidebarProjectItem[];
  generalChats: SidebarChatItem[];
  setProjects: (projects: SidebarProjectItem[]) => void;
  setGeneralChats: (chats: SidebarChatItem[]) => void;
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

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  generalChats: [],
  setProjects: (projects) => set({ projects }),
  setGeneralChats: (chats) => set({ generalChats: chats }),
  // 새 프로젝트를 맨 위에 추가
  addProject: (project) =>
    set((state) => ({
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
  addChatToProject: (projectId, chat) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.projectId === projectId) {
          const newChats = [chat, ...p.chats];
          // 백엔드가 5개만 보내주므로, 6개 이상이면 맨 아래 제거
          return { ...p, chats: newChats.length > 5 ? newChats.slice(0, 5) : newChats };
        }
        return p;
      }),
    })),
  // 프로젝트 삭제
  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.projectId !== projectId),
    })),
  // 프로젝트 제목 변경
  updateProjectTitle: (projectId, title) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.projectId === projectId ? { ...p, title } : p,
      ),
    })),
  // 채팅 제목 변경 (변경된 채팅을 맨 위로 이동)
  updateChatTitle: (chattingId, title) =>
    set((state) => {
      // 일반 채팅에서 찾기
      const generalChat = state.generalChats.find((c) => c.chattingId === chattingId);
      if (generalChat) {
        const otherChats = state.generalChats.filter((c) => c.chattingId !== chattingId);
        return {
          generalChats: [{ ...generalChat, title }, ...otherChats],
        };
      }

      // 프로젝트 내부 채팅에서 찾기
      const updatedProjects = state.projects.map((project) => {
        const chat = project.chats.find((c) => c.chattingId === chattingId);
        if (chat) {
          const otherChats = project.chats.filter((c) => c.chattingId !== chattingId);
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
  moveChatToTop: (chattingId) =>
    set((state) => {
      // 일반 채팅에서 찾기
      const generalChat = state.generalChats.find((c) => c.chattingId === chattingId);
      if (generalChat) {
        const otherChats = state.generalChats.filter((c) => c.chattingId !== chattingId);
        return {
          generalChats: [generalChat, ...otherChats],
        };
      }

      // 프로젝트 내부 채팅에서 찾기
      const updatedProjects = state.projects.map((project) => {
        const chat = project.chats.find((c) => c.chattingId === chattingId);
        if (chat) {
          const otherChats = project.chats.filter((c) => c.chattingId !== chattingId);
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
  removeChat: (chattingId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        chats: p.chats.filter((c) => c.chattingId !== chattingId),
      })),
      generalChats: state.generalChats.filter((c) => c.chattingId !== chattingId),
    })),
  // 채팅을 다른 프로젝트로 이동
  moveChatToProject: (chattingId, targetProjectId) =>
    set((state) => {
      // 이동할 채팅 찾기 (프로젝트 내부 또는 일반 채팅)
      let chatToMove = null;
      let fromGeneralChats = false;

      // 일반 채팅에서 찾기
      const generalChat = state.generalChats.find((c) => c.chattingId === chattingId);
      if (generalChat) {
        chatToMove = { ...generalChat, projectId: targetProjectId };
        fromGeneralChats = true;
      } else {
        // 프로젝트 내부에서 찾기
        for (const project of state.projects) {
          const chat = project.chats.find((c) => c.chattingId === chattingId);
          if (chat) {
            chatToMove = { ...chat, projectId: targetProjectId };
            break;
          }
        }
      }

      if (!chatToMove) return state;

      return {
        projects: state.projects.map((p) => {
          if (p.projectId === targetProjectId) {
            // 대상 프로젝트에 채팅 추가 (5개 제한)
            const newChats = [chatToMove, ...p.chats];
            return {
              ...p,
              chats: newChats.length > 5 ? newChats.slice(0, 5) : newChats,
            };
          } else {
            // 기존 프로젝트에서 채팅 제거
            return {
              ...p,
              chats: p.chats.filter((c) => c.chattingId !== chattingId),
            };
          }
        }),
        // 일반 채팅에서 제거
        generalChats: fromGeneralChats
          ? state.generalChats.filter((c) => c.chattingId !== chattingId)
          : state.generalChats,
      };
    }),
  // 편집 상태 관리
  editingProjectId: null,
  setEditingProjectId: (projectId) => set({ editingProjectId: projectId }),
  editingChatId: null,
  setEditingChatId: (chatId) => set({ editingChatId: chatId }),
}));
