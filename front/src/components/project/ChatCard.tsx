import { memo, useState, useRef, useEffect } from 'react';
import { ICON_SIZE } from '@/constants/ui';
import '@/styles/pages/project.css';
import { useProjectStore } from '@/store/projectStore';
import { updateChattingTitle } from '@/services/api/chatting';

interface ChatCardProps {
  id: number;
  title: string;
  preview?: string;
  timestamp?: string | number | Date;
  onClick: (chatId: number) => void;
  onMenuToggle?: (chatId: number) => void;
  onMenuAction?: (
    chatId: number,
    action: 'rename' | 'delete' | 'moveToProject',
    targetProjectId?: number,
  ) => void;
  isMenuOpen?: boolean;
  projectId?: number;
  allProjects?: Array<{ projectId: number; title: string }>;
  showProjectMoveMenu?: boolean;
  onProjectMoveToggle?: (chatId: number) => void;
  menuRef?: (el: HTMLDivElement | null) => void;
}

function ChatCard({
  id,
  title,
  preview,
  onClick,
  onMenuToggle,
  onMenuAction,
  isMenuOpen = false,
  projectId,
  allProjects = [],
  showProjectMoveMenu = false,
  onProjectMoveToggle,
  menuRef,
}: ChatCardProps) {
  const [editedTitle, setEditedTitle] = useState(title);
  const { editingChatId, setEditingChatId, updateChatTitle } = useProjectStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingChatId === id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === title) {
      setEditingChatId(null);
      setEditedTitle(title);
      return;
    }
    updateChatTitle(id, editedTitle);
    setEditingChatId(null);
    updateChattingTitle(id, { title: editedTitle }).catch((error) => {
      console.error('채팅 이름 변경 API 실패:', error);
    });
  };

  const handleCancelEdit = () => {
    setEditedTitle(title);
    setEditingChatId(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onClick(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick(id);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMenuToggle?.(id);
  };

  const handleProjectMoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onProjectMoveToggle?.(id);
  };

  const handleProjectSelect = (targetProjectId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMenuAction?.(id, 'moveToProject', targetProjectId);
  };

  return (
    <div className="project-chat-card-wrapper">
      <div
        className="project-chat-card"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`${title} 채팅 열기`}
      >
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
          <>
            <div className="project-chat-card__title-row">
              <span className="project-chat-card__title">{title}</span>
            </div>
            {preview && <p className="project-chat-card__preview">{preview}</p>}
          </>
        )}

        {onMenuToggle && !isEditing && (
          <div className="project-chat-card-menu-wrapper" ref={menuRef}>
            <button
              className="project-chat-card-menu-btn"
              onClick={handleMenuClick}
              aria-label="채팅 메뉴"
              aria-expanded={isMenuOpen}
            >
              <img
                src="/icons/more_detail.svg"
                alt=""
                width={ICON_SIZE.SM}
                height={ICON_SIZE.SM}
                aria-hidden="true"
              />
            </button>
            {isMenuOpen && (
              <div className="project-chat-card-menu" role="menu">
                <button
                  className="project-chat-card-menu-item"
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMenuAction?.(id, 'rename');
                  }}
                >
                  <img
                    src="/icons/edit.svg"
                    alt=""
                    width={ICON_SIZE.SM}
                    height={ICON_SIZE.SM}
                    aria-hidden="true"
                  />
                  <span>이름 바꾸기</span>
                </button>
                <div className="project-chat-card-menu-item project-chat-card-menu-item-with-submenu">
                  <button
                    className="project-chat-card-menu-item-btn"
                    onClick={handleProjectMoveClick}
                  >
                    <img
                      src="/icons/folder.svg"
                      alt=""
                      width={ICON_SIZE.SM}
                      height={ICON_SIZE.SM}
                      aria-hidden="true"
                    />
                    <span>프로젝트 이동</span>
                    <img
                      src={'/icons/chevron.svg'}
                      alt=""
                      width={ICON_SIZE.SM}
                      height={ICON_SIZE.SM}
                      className="project-chat-card-menu-item-chevron"
                      aria-hidden="true"
                    />
                  </button>
                  {showProjectMoveMenu && (
                    <div className="project-chat-card-menu-submenu">
                      {allProjects
                        .filter((p) => p.projectId !== projectId)
                        .map((targetProject) => (
                          <button
                            key={targetProject.projectId}
                            className="project-chat-card-menu-submenu-item"
                            onClick={(e) => handleProjectSelect(targetProject.projectId, e)}
                          >
                            <span>{targetProject.title}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <button
                  className="project-chat-card-menu-item"
                  role="menuitem"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMenuAction?.(id, 'delete');
                  }}
                >
                  <img
                    src="/icons/delete.svg"
                    alt=""
                    width={ICON_SIZE.SM}
                    height={ICON_SIZE.SM}
                    aria-hidden="true"
                  />
                  <span>채팅 삭제</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// React.memo로 불필요한 리렌더링 방지
export default memo(ChatCard);
