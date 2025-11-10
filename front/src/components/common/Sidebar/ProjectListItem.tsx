import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import { useLongPress } from '@/hooks/useLongPress';
import { ChatListItem } from './ChatListItem';
import { ICON_SIZE } from '@/constants/ui';
import type { SidebarProjectItem } from '@/types/sidebar.types';
import { useProjectStore } from '@/store/projectStore';
import { updateProject } from '@/services/api/project';

interface ProjectListItemProps {
  project: SidebarProjectItem;
  scrollContainer: HTMLElement | null;
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
  scrollContainer,
  onMenuToggle,
  onNestedMenuToggle,
  onLoadMoreChats,
}: ProjectListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title);
  const navigate = useNavigate();
  const location = useLocation();
  const mode = useDeviceMode();
  const { closeSidebar } = useAppShell();
  const {
    editingProjectId,
    setEditingProjectId,
    updateProjectTitle: updateStoreTitle,
  } = useProjectStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingProjectId === project.projectId;

  // 현재 페이지가 이 프로젝트 페이지인지 확인
  const locationState = location.state as { projectId?: number } | undefined;
  const isActiveProject =
    location.pathname === '/project' && locationState?.projectId === project.projectId;

  // 프로젝트 내 채팅이 활성화되어 있는지 확인
  const isProjectChatActive =
    location.pathname === '/chat' &&
    locationState?.projectId === project.projectId &&
    project.chats.some((chat) => chat.chattingId === (locationState as any)?.chatId);

  // 편집 모드로 전환 시 input에 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // props가 변경되면 editedTitle 업데이트
  useEffect(() => {
    setEditedTitle(project.title);
  }, [project.title]);

  // 프로젝트 내 채팅이 활성화되면 자동으로 확장
  useEffect(() => {
    if (isProjectChatActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isProjectChatActive, isExpanded]);

  // 프로젝트 타이틀 클릭 시 프로젝트 상세 페이지로 이동
  const handleProjectClick = () => {
    if (isEditing) return; // 편집 중에는 클릭 무시
    if (mode === 'mobile') {
      closeSidebar();
    }
    navigate('/project', { state: { projectId: project.projectId } });
  };

  // 제목 저장
  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === project.title) {
      setEditingProjectId(null);
      setEditedTitle(project.title);
      return;
    }

    // 로컬 상태 즉시 업데이트
    updateStoreTitle(project.projectId, editedTitle);
    setEditingProjectId(null);

    // 백그라운드에서 API 호출
    updateProject(project.projectId, { title: editedTitle }).catch((error) => {
      console.error('프로젝트 이름 변경 API 실패:', error);
    });
  };

  // 제목 편집 취소
  const handleCancelEdit = () => {
    setEditedTitle(project.title);
    setEditingProjectId(null);
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isExpanded || !project.hasMore || !scrollContainer) return;

    let isMounted = true;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && isMounted) {
          onLoadMoreChats(project.projectId);
        }
      },
      {
        root: scrollContainer,
        threshold: 0,
        rootMargin: '100px',
      },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      isMounted = false;
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
      observer.disconnect();
    };
  }, [isExpanded, project.hasMore, project.projectId, scrollContainer, onLoadMoreChats]);

  return (
    <li>
      <div
        className={`sidebar-list-item sidebar-list-item-project ${isActiveProject || isProjectChatActive ? 'active' : ''}`}
      >
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
        {isEditing ? (
          <div className="sidebar-list-item-edit">
            <input
              ref={inputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              onBlur={handleSaveTitle}
              className="sidebar-list-item-input"
            />
          </div>
        ) : (
          <button
            className="sidebar-list-item-text-btn"
            onClick={handleProjectClick}
            onContextMenu={handleContextMenu}
            {...(mode !== 'desktop' ? longPressEvents : {})}
            title={mode === 'desktop' ? project.title : undefined}
          >
            <span className="sidebar-list-item-text">{project.title}</span>
          </button>
        )}
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
