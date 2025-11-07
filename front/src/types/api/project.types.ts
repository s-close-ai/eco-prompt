export interface AllChattingRoomsResponse {
  status: string;
  data: {
    personalProjectResponses: {
      projectId: number;
      title: string;
      chattingResponses: ChattingRoomsItem;
    }[];
  };
}

export interface ProjectCreateRequest {
  title: string;
}

export interface ProjectCreateResponse {
  status: string;
  data: {
    projectId: number;
  };
}

export interface ProjectDeleteResponse {
  status: {
    code: number;
    message: string;
  };
  data: object;
}

export interface ChattingRoomsItem {
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  size: number;
  content: {
    projectId: number;
    chattingId: number;
    title: string;
  }[];
  number: number;
  sort: {
    direction: string;
    nullHandling: string;
    ascending: boolean;
    property: string;
    ignoreCase: boolean;
  }[];
  numberOfElements: number;
  pageable: {
    offset: number;
    sort: {
      direction: string;
      nullHandling: string;
      ascending: boolean;
      property: string;
      ignoreCase: boolean;
    }[];
    pageSize: number;
    paged: boolean;
    pageNumber: number;
    unpaged: boolean;
  };
  empty: boolean;
}

export interface ChattingRoomsResponse {
  status: string;
  data: {
    chattingResponses: ChattingRoomsItem;
  };
}

export interface ProjectResponse {
  status: string;
  data: {
    projectId: number;
    title: string;
    chattingResponses: ChattingRoomItem[];
  };
}

// 개별 채팅 아이템 타입 (목록의 단일 항목)
export interface ChattingRoomItem {
  projectId: number;
  chattingId: number;
  title: string;
  lastMessage: string;
}

export interface ProjectUpdateRequest {
  title: string;
}

export interface ProjectUpdateResponse {
  status: string;
  data: object;
}
