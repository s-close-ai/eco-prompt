import type { ChattingRoomsItem } from './api/project.types';

// 사이드바에 표시될 채팅 아이템의 타입
// API 응답의 content 배열 아이템과 동일한 구조
export type SidebarChatItem = ChattingRoomsItem['content'][0];

// 사이드바에 표시될 프로젝트 아이템의 타입
// API 응답에 UI 상태(페이징 정보)를 추가한 확장 타입
export interface SidebarProjectItem {
  projectId: number;
  title: string;
  chats: SidebarChatItem[];
  totalPages: number;
  currentPage: number;
  hasMore: boolean; // 해당 프로젝트의 채팅을 더 불러올 수 있는지 여부
}

// useSidebarData 훅이 반환하는 전체 데이터 구조
// UI 레이어에서 사이드바 상태 관리를 위한 타입
export interface SidebarData {
  projects: SidebarProjectItem[];
  generalChats: SidebarChatItem[];
  generalChatsPage: number;
  generalChatsTotalPages: number;
  generalChatsHasMore: boolean;
}
