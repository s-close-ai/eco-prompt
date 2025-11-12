import { create } from 'zustand';

interface ChatStore {
  currentChattingId: number | null;
  currentChattingTitle: string | null;
  setCurrentChatting: (chattingId: number | null, title?: string | null) => void;
  updateCurrentTitle: (title: string) => void;
}

export const useChatStore = create<ChatStore>((set): ChatStore => ({
  currentChattingId: null,
  currentChattingTitle: null,
  setCurrentChatting: (chattingId: number | null, title: string | null = null) =>
    set({ currentChattingId: chattingId, currentChattingTitle: title }),
  updateCurrentTitle: (title: string) => set({ currentChattingTitle: title }),
}));
