// 임시 Mock 데이터 - 추후 API 연동 시 제거 예정

export interface ChatItem {
  id: number;
  title: string;
}

export interface ProjectItem {
  id: number;
  title: string;
}

export const mockChatList: ChatItem[] = [
  { id: 1, title: '일일체팅' },
  { id: 2, title: '파일 추가' },
  { id: 3, title: '테스트 확인 완료' },
  { id: 4, title: '프로젝트 만들기 설명' },
];

export const mockProjectList: ProjectItem[] = [
  { id: 1, title: '지지스캐서 피드백' },
  { id: 2, title: '자기소개서 초안 작성' },
  { id: 3, title: 'PRM 프로젝트 설계' },
  { id: 4, title: '지지스캐서 피드백 2' },
];
