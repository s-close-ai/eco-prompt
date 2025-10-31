// React Router location state 타입 정의

export interface ProjectLocationState {
  projectId?: number;
}

export interface ChatLocationState {
  chatId?: number | string;
  projectId?: number;
  isNew?: boolean;
  message?: string;
}
