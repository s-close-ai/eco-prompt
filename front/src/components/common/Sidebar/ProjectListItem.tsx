import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import { useLongPress } from '@/hooks/useLongPress';
import { ChatListItem } from './ChatListItem';
import { ICON_SIZE } from '@/constants/ui';
import type { SidebarProjectItem } from '@/types/sidebar.types';

interface ProjectListItemProps {
  project: SidebarProjectItem;
  onMenuToggle: (event: React.MouseEvent | React.TouchEvent) => void;
  onNestedMenuToggle: (chatId: number, e: React.MouseEvent | React.TouchEvent) => void;
  onLoadMoreChats: (projectId: number) => void;
}

/**
 * 사이드바에 표시되는 개별 프로젝트 아이템 컴포넌트.
 * 확장/축소 기능과 내부에 채팅 목록을 포함.
 */
export function ProjectListItem({
  project,
  onMenuToggle,
  onNestedMenuToggle,
  onLoadMoreChats,
}: ProjectListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const { closeSidebar } = useAppShell();

  // 프로젝트 타이틀 클릭 시 프로젝트 상세 페이지로 이동
  const handleProjectClick = () => {
    if (mode === 'mobile') {
      closeSidebar();
    }
    navigate('/project', { state: { projectId: project.projectId } });
  };

  // 프로젝트 확장/축소 토글
  const toggleExpand = () => {
    const newIsExpanded = !isExpanded;
    setIsExpanded(newIsExpanded);
    // 처음 확장할 때 채팅 목록이 비어있으면 추가 로드
    if (newIsExpanded && project.chats.length === 0 && project.hasMore) {
      onLoadMoreChats(project.projectId);
    }
  };

  // 롱 프레스 이벤트 핸들러
  const longPressEvents = useLongPress((e) => {
    if (mode !== 'desktop') {
      onMenuToggle(e);
    }
  }, 500);

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onMenuToggle(e);
  };

  // 프로젝트 하위 채팅 목록 무한 스크롤을 위한 Intersection Observer
  const sentinelRef = (node: HTMLDivElement | null) => {
    if (node && isExpanded && project.hasMore) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onLoadMoreChats(project.projectId);
          }
        },
        { threshold: 0, rootMargin: '100px' },
      );
      observer.observe(node);
      // 컴포넌트 언마운트 시 observer 연결 해제
      return () => observer.disconnect();
    }
  };

  return (
    <li>
      <div className="sidebar-list-item sidebar-list-item-project">
        <button
          className="sidebar-list-item-icon-btn"
          onClick={toggleExpand}
          aria-label={isExpanded ? '채팅 목록 접기' : '채팅 목록 열기'}
        >
          <img
            src={isExpanded ? '/icons/folder_open.svg' : '/icons/folder.svg'}
            alt="folder"
            width={18}
            height={18}
          />
        </button>
        <button
          className="sidebar-list-item-text-btn"
          onClick={handleProjectClick}
          onContextMenu={handleContextMenu}
          {...(mode !== 'desktop' ? longPressEvents : {})}
        >
          <span className="sidebar-list-item-text">{project.title}</span>
        </button>
        <div className="sidebar-list-item-menu-wrapper">
          <button
            className="sidebar-list-item-menu-btn"
            onClick={onMenuToggle}
            aria-label="프로젝트 메뉴"
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
      {isExpanded && (
        <ul className="sidebar-nested-list">
          {project.chats.map((chat) => (
            <ChatListItem
              key={chat.chattingId}
              chat={chat}
              isNested={true}
              onMenuToggle={(e) => onNestedMenuToggle(chat.chattingId, e)}
            />
          ))}
          {project.hasMore && <div ref={sentinelRef} style={{ height: '1px' }} />}
        </ul>
      )}
    </li>
  );
}
