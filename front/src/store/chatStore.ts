import { create } from 'zustand';

interface ChatStore {
  currentChattingId: number | null;
  currentChattingTitle: string | null;
  setCurrentChatting: (chattingId: number | null, title?: string | null) => void;
  updateCurrentTitle: (title: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  currentChattingId: null,
  currentChattingTitle: null,
  setCurrentChatting: (chattingId, title = null) =>
    set({ currentChattingId: chattingId, currentChattingTitle: title }),
  updateCurrentTitle: (title) => set({ currentChattingTitle: title }),
}));
