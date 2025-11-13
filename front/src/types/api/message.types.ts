export interface MessageInputRequest {
  projectId: number;
  chattingId?: number;
  content: string;
}

export interface MessageInputResponse {
  status: string;
  data: {
    chattingId: number;
    messageUUID: string;
  };
}

export interface MessageUpdateRequest {
  projectId: number;
  chattingId: number;
  content: string;
  messageUUID: string;
}

export interface MessageUpdateResponse {
  status: string;
  data: {
    chattingId: number;
    messageUUID: string;
  };
}

export interface MessageSearchRequest {
  string: string;
}

export interface MessageSearchResponse {
  status: string;
  data: {
    chattingId: number;
    chattingTitle: string | null;
    content: string | null;
    chattingUpdatedAt: string;
  }[];
}