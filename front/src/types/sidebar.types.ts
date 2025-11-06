// useSidebarData 훅이 반환하는 전체 데이터 구조
export interface SidebarData {
  projects: SidebarProjectItem[];
  generalChats: SidebarChatItem[];
  generalChatsPage: number;
  generalChatsTotalPages: number;
  generalChatsHasMore: boolean;
}

// 사이드바에 표시될 프로젝트 아이템의 타입
export interface SidebarProjectItem {
  projectId: number;
  title: string;
  chats: SidebarChatItem[];
  totalPages: number;
  currentPage: number;
  hasMore: boolean; // 해당 프로젝트의 채팅을 더 불러올 수 있는지 여부
}

// 사이드바에 표시될 채팅 아이템의 타입
export interface SidebarChatItem {
  chattingId: number;
  title: string;
  projectId: number;
}
