
import { useNavigate } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import { useLongPress } from '@/hooks/useLongPress';
import { ICON_SIZE } from '@/constants/ui';
import type { SidebarChatItem } from '@/types/sidebar.types';

interface ChatListItemProps {
  chat: SidebarChatItem;
  isNested: boolean; // 프로젝트 내부에 중첩된 리스트 아이템인지 여부
  onMenuToggle: (event: React.MouseEvent | React.TouchEvent) => void;
}

/**
 * 사이드바에 표시되는 개별 채팅 아이템 컴포넌트
 */
export function ChatListItem({ chat, isNested, onMenuToggle }: ChatListItemProps) {
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const { closeSidebar } = useAppShell();

  // 채팅 아이템 클릭 시 해당 채팅 페이지로 이동
  const handleClick = () => {
    if (mode === 'mobile') {
      closeSidebar();
    }
    navigate(`/chat/mock/${chat.chattingId}`);
  };

  // 모바일에서 길게 누르기 이벤트를 메뉴 토글에 연결
  const longPressEvents = useLongPress((e) => {
    if (mode !== 'desktop') {
      onMenuToggle(e);
    }
  }, 500);

  // 데스크탑에서 우클릭 시 컨텍스트 메뉴 표시
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onMenuToggle(e);
  };

  const itemClass = `sidebar-list-item sidebar-list-item-chat ${isNested ? 'sidebar-nested-item' : ''}`;

  return (
    <li>
      <div className={itemClass}>
        <button
          className="sidebar-list-item-text-btn sidebar-list-item-text-btn-chat"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          {...(mode !== 'desktop' ? longPressEvents : {})}
        >
          <span className="sidebar-list-item-text">{chat.title}</span>
        </button>
        <div className="sidebar-list-item-menu-wrapper">
          <button
            className="sidebar-list-item-menu-btn"
            onClick={onMenuToggle}
            aria-label="채팅 메뉴"
          >
            <img
              src="/icons/more_detail.svg"
              alt=""
              width={ICON_SIZE.SM}
              height={ICON_SIZE.SM}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </li>
  );
}
