import { useState, useCallback, useEffect, useRef } from 'react';

type MenuId = string | number;

interface MenuPosition {
  top: number;
  left: number;
}

interface ToggleMenuOptions {
  leftOffset?: number;
  topOffset?: number;
  direction?: 'left' | 'right';
  menuWidth?: number;
}

/**
 * 여러 컨텍스트 메뉴의 상태와 동작을 관리하는 커스텀 훅
 */
export function useContextMenu() {
  // 열려있는 메뉴들의 ID와 위치를 관리하는 Map
  const [openMenus, setOpenMenus] = useState<Map<MenuId, MenuPosition>>(new Map());

  // 메뉴 DOM 요소와 트리거 DOM 요소를 참조하기 위한 Ref
  const menuRefs = useRef<Map<MenuId, HTMLDivElement>>(new Map());
  const triggerRefs = useRef<Map<MenuId, HTMLElement>>(new Map());

  /**
   * 메뉴를 토글하는 함수. 이미 열려있으면 닫고, 닫혀있으면 연다.
   * @param id - 메뉴의 고유 ID
   * @param anchorEl - 메뉴 위치의 기준이 될 DOM 요소
   * @param options - 위치 오프셋 옵션
   */
  const toggleMenu = useCallback(
    (id: MenuId, anchorEl: HTMLElement, options: ToggleMenuOptions = {}) => {
      const { leftOffset = 0, topOffset = 8, direction = 'left', menuWidth = 170 } = options;
      setOpenMenus((prev) => {
        const newMenus = new Map(prev);
        if (newMenus.has(id)) {
          newMenus.delete(id);
          triggerRefs.current.delete(id);
        } else {
          try {
            const rect = anchorEl.getBoundingClientRect();
            const top = rect.bottom + topOffset;

            let left: number;
            if (direction === 'right') {
              // 메뉴를 트리거 요소의 중간에 위치시키기 위해
              // 트리거 요소의 오른쪽에서 메뉴 너비의 절반을 뺀 위치에 배치
              left = rect.right - menuWidth / 2 + leftOffset;
            } else {
              left = rect.right - menuWidth + leftOffset;
            }

            // Viewport collision detection
            if (left + menuWidth > window.innerWidth) {
              left = window.innerWidth - menuWidth - 8; // 8px padding from edge
            }
            if (left < 8) {
              left = 8; // 8px padding from edge
            }

            newMenus.set(id, { top, left });
            triggerRefs.current.set(id, anchorEl);
          } catch (error) {
            // getBoundingClientRect 호출 실패 시 메뉴를 열지 않음
            console.warn('Failed to get bounding rect for menu:', error);
          }
        }
        return newMenus;
      });
    },
    [],
  );

  /**
   * 특정 메뉴를 닫는 함수
   * @param id - 닫을 메뉴의 ID
   */
  const closeMenu = useCallback((id: MenuId) => {
    setOpenMenus((prev) => {
      const newMenus = new Map(prev);
      if (newMenus.has(id)) {
        newMenus.delete(id);
        triggerRefs.current.delete(id);
      }
      return newMenus;
    });
  }, []);

  /**
   * 모든 메뉴를 닫는 함수
   */
  const closeAllMenus = useCallback(() => {
    if (openMenus.size > 0) {
      setOpenMenus(new Map());
      triggerRefs.current.clear();
    }
  }, [openMenus.size]);

  // 메뉴 외부 클릭 시 메뉴를 닫는 로직
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (openMenus.size === 0) return;

      const target = event.target as Node;
      openMenus.forEach((_, id) => {
        const menuRef = menuRefs.current.get(id);
        const triggerRef = triggerRefs.current.get(id);

        // 메뉴나 트리거 영역 외부를 클릭했는지 확인
        if (menuRef && !menuRef.contains(target) && triggerRef && !triggerRef.contains(target)) {
          closeMenu(id);
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [openMenus, closeMenu]);

  // 스크롤이나 리사이즈 시 모든 메뉴를 닫는 로직
  useEffect(() => {
    window.addEventListener('scroll', closeAllMenus, true);
    window.addEventListener('resize', closeAllMenus);
    return () => {
      window.removeEventListener('scroll', closeAllMenus, true);
      window.removeEventListener('resize', closeAllMenus);
    };
  }, [closeAllMenus]);

  /**
   * 메뉴 DOM 요소에 ref를 할당하기 위한 props를 반환하는 함수
   * @param id - 메뉴 ID
   */
  const getMenuProps = (id: MenuId) => ({
    ref: (el: HTMLDivElement | null) => {
      if (el) {
        menuRefs.current.set(id, el);
      } else {
        menuRefs.current.delete(id);
      }
    },
  });

  return {
    toggleMenu,
    closeMenu,
    closeAllMenus,
    openMenus,
    getMenuProps,
  };
}
