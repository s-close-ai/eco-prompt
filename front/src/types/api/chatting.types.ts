export interface ChattingTitleRequest {
  title: string;
}

export interface ChattingTitleResponse {
  status: string;
  data: void;
}

export interface ChattingProjectRequest {
  projectId: number;
}

export interface ChattingProjectResponse {
  status: string;
  data: void;
}

export interface ChattingMessagesResponse {
  status: string;
  data: {
    content: ChatMessage[];
    last: boolean;
  };
}

export interface ChatMessage {
  userMessage: UserMessage;
  scoreMessage: ScoreMessage;
  aiMessage: AiMessage;
}

export interface UserMessage {
  messageUUID: string;
  content: string;
}

export interface ScoreMessage {
  messageStatus: string;
  scoreInfo: {
    clarity: number;
    specificity: number;
    format: number;
    completeness: number;
    totalScore: number;
  };
}

export interface AiMessage {
  messageStatus: string;
  content: string;
}
