import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Bookmark } from '@/types/bookmark.types';
import '@/styles/components/bookmark/bookmark-card.css';

type BookmarkCardProps = {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
  onDelete?: (bookmark: Bookmark) => void;
  isDraggable?: boolean;
  isEditMode?: boolean;
};

export default function BookmarkCard({
  bookmark,
  onClick,
  onDelete,
  isDraggable = false,
  isEditMode = false,
}: BookmarkCardProps) {
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
  const handleClick = () => {
    // 편집 모드일 때는 클릭 비활성화
    if (!isEditMode) {
      onClick?.(bookmark);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      {onDelete && (
        <button
          className="bookmark-card__delete"
          onClick={handleDelete}
          aria-label="삭제"
          type="button"
        >
          <img src="/icons/close.svg" alt="" aria-hidden width={16} height={16} />
        </button>
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

