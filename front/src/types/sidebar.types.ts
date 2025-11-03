// 사이드바 관련 타입 정의

export interface ChatItem {
  id: number;
  title: string;
  preview?: string; // 채팅 미리보기 텍스트
  timestamp?: Date; // 마지막 업데이트 시간
}

export interface ProjectItem {
  id: number;
  title: string;
  chats: ChatItem[];
}
