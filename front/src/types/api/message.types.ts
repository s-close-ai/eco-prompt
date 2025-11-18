import type { AiMessage, ScoreMessage } from "./chatting.types";

export interface MessageInputRequest {
  projectId: number;
  chattingId?: number;
  content: string;
  uploadedFiles?: Array<{
    fileUrl: string;
    filename: string;
    fileId: number;
  }>;
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

export interface MessageJudgeResponse {
  status: string;
  data: ScoreMessage;
}

export interface MessageLLMResponse {
  status: string;
  data: AiMessage;
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