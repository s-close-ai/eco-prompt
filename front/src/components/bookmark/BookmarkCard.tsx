import { useState, useRef, useMemo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useClickOutside } from '@/hooks/useClickOutside';
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

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      cursor: isDraggable ? 'grab' : 'pointer',
    }),
    [transform, transition, isDragging, isDraggable],
  );

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useClickOutside(
    [menuRef as React.RefObject<HTMLElement>, buttonRef as React.RefObject<HTMLElement>],
    handleCloseMenu,
    isMenuOpen
  );

  const handleClick = useCallback(() => {
    if (!isEditMode && !isMenuOpen) {
      onClick?.(bookmark);
    }
  }, [isEditMode, isMenuOpen, onClick, bookmark]);

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMenuOpen(false);
      onEdit?.(bookmark);
    },
    [onEdit, bookmark],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMenuOpen(false);
      onDelete?.(bookmark);
    },
    [onDelete, bookmark],
  );

  const cardClassName = useMemo(() => {
    const classes = ['bookmark-card'];
    if (isDragging) classes.push('bookmark-card--dragging');
    if (isEditMode) classes.push('bookmark-card--edit-mode');
    return classes.join(' ');
  }, [isDragging, isEditMode]);

  const hasMenuActions = Boolean(onDelete || onEdit);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClassName}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {hasMenuActions && (
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
