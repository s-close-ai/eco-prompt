import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Bookmark } from '@/types/bookmark.types';
import '@/styles/components/bookmark/bookmark-card.css';

type BookmarkCardProps = {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
  onDelete?: (bookmark: Bookmark) => void;
  onEdit?: (bookmark: Bookmark) => void;
  isDraggable?: boolean;
  isEditMode?: boolean;
};

export default function BookmarkCard({
  bookmark,
  onClick,
  onDelete,
  onEdit,
  isDraggable = false,
  isEditMode = false,
}: BookmarkCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDraggable ? 'grab' : 'pointer',
  };

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleClick = () => {
    // 편집 모드일 때는 클릭 비활성화
    if (!isEditMode && !isMenuOpen) {
      onClick?.(bookmark);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit?.(bookmark);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.(bookmark);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bookmark-card ${isDragging ? 'bookmark-card--dragging' : ''} ${isEditMode ? 'bookmark-card--edit-mode' : ''}`}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {(onDelete || onEdit) && (
        <>
          <button
            ref={buttonRef}
            className="bookmark-card__menu"
            onClick={handleMenuClick}
            aria-label="메뉴"
            type="button"
            aria-expanded={isMenuOpen}
          >
            <img src="/icons/more_detail.svg" alt="" aria-hidden width={20} height={20} />
          </button>
          {isMenuOpen && (
            <div ref={menuRef} className="bookmark-card__menu-dropdown">
              {onEdit && (
                <button
                  className="bookmark-card__menu-item bookmark-card__menu-item--edit"
                  onClick={handleEdit}
                  type="button"
                >
                  편집
                </button>
              )}
              {onDelete && (
                <button
                  className="bookmark-card__menu-item bookmark-card__menu-item--delete"
                  onClick={handleDelete}
                  type="button"
                >
                  삭제
                </button>
              )}
            </div>
          )}
        </>
      )}
      <div className="bookmark-card__icon">
        {bookmark.icon ? (
          <img src={bookmark.icon} alt="" aria-hidden />
        ) : (
          <div className="bookmark-card__icon-placeholder">
            <img src="/icons/bookmark.svg" alt="" aria-hidden width={24} height={24} />
          </div>
        )}
      </div>
      <div className="bookmark-card__content">
        <h3 className="bookmark-card__title">{bookmark.title}</h3>
        {bookmark.description ? (
          <p className="bookmark-card__description">{bookmark.description}</p>
        ) : (
          <p className="bookmark-card__url">{bookmark.url}</p>
        )}
      </div>
    </div>
  );
}

