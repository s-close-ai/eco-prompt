import React from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
  children: React.ReactNode;
  position: { top: number; left: number };
  menuProps: {
    ref: (el: HTMLDivElement | null) => void;
  };
}

/**
 * React Portal을 사용하여 body에 직접 컨텍스트 메뉴를 렌더링하는 컴포넌트
 */
export function ContextMenu({ children, position, menuProps }: ContextMenuProps) {
  // document.body가 존재할 때만 포털을 생성
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      {...menuProps}
      className="sidebar-list-item-menu"
      role="menu"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body,
  );
}
