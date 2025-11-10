import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import { useLongPress } from '@/hooks/useLongPress';
import { ICON_SIZE } from '@/constants/ui';
import type { SidebarChatItem } from '@/types/sidebar.types';
import { useProjectStore } from '@/store/projectStore';
import { updateChattingTitle } from '@/services/api/chatting';

interface ChatListItemProps {
  chat: SidebarChatItem;
  isNested: boolean; // 프로젝트 내부에 중첩된 리스트 아이템인지 여부
  onMenuToggle: (event: React.MouseEvent | React.TouchEvent) => void;
}

/**
 * 사이드바에 표시되는 개별 채팅 아이템 컴포넌트
 */
export function ChatListItem({ chat, isNested, onMenuToggle }: ChatListItemProps) {
  const [editedTitle, setEditedTitle] = useState(chat.title);
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const { closeSidebar } = useAppShell();
  const { editingChatId, setEditingChatId, updateChatTitle } = useProjectStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingChatId === chat.chattingId;

  // 편집 모드로 전환 시 input에 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // props가 변경되면 editedTitle 업데이트
  useEffect(() => {
    setEditedTitle(chat.title);
  }, [chat.title]);

  // 채팅 아이템 클릭 시 해당 채팅 페이지로 이동
  const handleClick = () => {
    if (isEditing) return; // 편집 중에는 클릭 무시
    if (mode === 'mobile') {
      closeSidebar();
    }
    navigate('/chat', { state: { chatId: chat.chattingId, projectId: chat.projectId } });
  };

  // 제목 저장 (낙관적 업데이트)
  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === chat.title) {
      setEditingChatId(null);
      setEditedTitle(chat.title);
      return;
    }

    // 로컬 상태 즉시 업데이트 (제목 변경 + 맨 위로 이동)
    updateChatTitle(chat.chattingId, editedTitle);
    setEditingChatId(null);

    // 백그라운드에서 API 호출
    updateChattingTitle(chat.chattingId, { title: editedTitle }).catch((error) => {
      console.error('채팅 이름 변경 API 실패:', error);
    });
  };

  // 제목 편집 취소
  const handleCancelEdit = () => {
    setEditedTitle(chat.title);
    setEditingChatId(null);
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
            className="sidebar-list-item-text-btn sidebar-list-item-text-btn-chat"
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            {...(mode !== 'desktop' ? longPressEvents : {})}
          >
            <span className="sidebar-list-item-text">{chat.title}</span>
          </button>
        )}
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
