import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleOpen: () => void;
  toggleCollapsed: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  // 모바일/태블릿: isOpen으로 완전히 열림/닫힘 제어
  // 데스크탑: 항상 열려있고, isCollapsed로 접기/펼치기 제어
  isOpen: false,
  isCollapsed: false,

  // 모바일/태블릿 메뉴 버튼 토글 (완전히 열기/닫기)
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  // 데스크탑 접기/펼치기 토글
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}));

