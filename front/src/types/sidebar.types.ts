// 사이드바 관련 타입 정의

export interface ChatItem {
  id: number;
  title: string;
}

export interface ProjectItem {
  id: number;
  title: string;
  chats: ChatItem[];
}
