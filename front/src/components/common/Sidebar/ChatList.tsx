import { ChatListItem } from './ChatListItem';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { SidebarChatItem } from '@/types/sidebar.types';

interface ChatListProps {
  title: string;
  chats: SidebarChatItem[];
  scrollContainer: HTMLElement | null;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onMenuToggle: (chatId: number, e: React.MouseEvent | React.TouchEvent) => void;
}

/**
 * 일반 채팅 목록을 표시하는 컴포넌트. 무한 스크롤 기능을 포함.
 */
export function ChatList({
  title,
  chats,
  scrollContainer,
  hasMore,
  isLoading,
  onLoadMore,
  onMenuToggle,
}: ChatListProps) {
  // 무한 스크롤을 위한 센티널(감시 대상) 요소 설정
  // 사이드바 스크롤 컨테이너를 root로 지정
  // 로딩 중이거나 더 이상 불러올 항목이 없으면 감시하지 않음
  const sentinelRef = useInfiniteScroll({
    onLoadMore,
    hasMore: hasMore && !isLoading, // 로딩 중이면 더 이상 요청하지 않음
    isLoading,
    root: scrollContainer,
  });

  return (
    <div className="sidebar-section">
      <h3 className="sidebar-section-title">{title}</h3>
      <ul className="sidebar-list">
        {chats.map((chat) => (
          <ChatListItem
            key={chat.chattingId}
            chat={chat}
            isNested={false} // 일반 채팅 목록이므로 isNested는 false
            onMenuToggle={(e) => onMenuToggle(chat.chattingId, e)}
          />
        ))}
        {hasMore && !isLoading && <div ref={sentinelRef} style={{ height: '1px' }} />}
      </ul>
    </div>
  );
}
