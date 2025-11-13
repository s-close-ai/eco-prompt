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
    sc_ec_0: number;
    sc_ec_1: number;
    sc_ec_2: number;
    sc_ec_3: number;
    sc_ec_4: number;
  };
}

export interface AiMessage {
  messageStatus: string;
  content: string;
}
