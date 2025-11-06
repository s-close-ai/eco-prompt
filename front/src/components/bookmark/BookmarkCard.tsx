import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useClickOutside } from '@/hooks/useClickOutside';
import type { MockBookmark } from '@/types/bookmark.types';
import '@/styles/components/bookmark/bookmark-card.css';

type BookmarkCardProps = {
  bookmark: MockBookmark;
  onClick?: (bookmark: MockBookmark) => void;
  onDelete?: (bookmark: MockBookmark) => void;
  onEdit?: (bookmark: MockBookmark) => void;
  onLongPress?: () => void;
  isDraggable?: boolean;
  isEditMode?: boolean;
};

export default function BookmarkCard({
  bookmark,
  onClick,
  onDelete,
  onEdit,
  onLongPress,
  isDraggable = false,
  isEditMode = false,
}: BookmarkCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [isDragDisabled, setIsDragDisabled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartTimeRef = useRef<number>(0);
  const clickAllowedRef = useRef(true);
  const touchMoveDistanceRef = useRef(0);
  const touchMoveDirectionRef = useRef<'vertical' | 'horizontal' | 'none'>('none');
  const longPressTimerRef = useRef<number | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: bookmark.id,
    disabled: !isDraggable || isDragDisabled,
  });

  // 드래그 상태 추적
  useEffect(() => {
    if (isSortableDragging && !isDragging) {
      setIsDragging(true);
      dragStartTimeRef.current = Date.now();
      clickAllowedRef.current = false;
    } else if (!isSortableDragging && isDragging) {
      // 드래그가 끝나면 약간의 지연 후 클릭 이벤트 허용
      const timeoutId = setTimeout(() => {
        setIsDragging(false);
        clickAllowedRef.current = true;
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isSortableDragging, isDragging]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isSortableDragging ? 0.5 : 1,
      cursor: isDraggable ? 'grab' : 'pointer',
    }),
    [transform, transition, isSortableDragging, isDraggable],
  );

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useClickOutside(
    [menuRef as React.RefObject<HTMLElement>, buttonRef as React.RefObject<HTMLElement>],
    handleCloseMenu,
    isMenuOpen,
  );

  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // 드래그 중이거나 드래그가 방금 끝났거나 클릭이 허용되지 않으면 무시
      if (
        !clickAllowedRef.current ||
        isDragging ||
        isSortableDragging ||
        Date.now() - dragStartTimeRef.current < 300
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!isEditMode && !isMenuOpen) {
        onClick?.(bookmark);
      }
    },
    [isEditMode, isMenuOpen, onClick, bookmark, isDragging, isSortableDragging],
  );

  // 모바일에서 터치 시작 시 시간과 위치 기록
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setTouchStartTime(Date.now());
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
      touchMoveDistanceRef.current = 0;
      touchMoveDirectionRef.current = 'none';
      setIsDragDisabled(false); // 드래그 비활성화 초기화
      clickAllowedRef.current = true;

      // 편집 모드가 아닐 때만 2초 타이머 시작
      if (!isDraggable && onLongPress) {
        longPressTimerRef.current = window.setTimeout(() => {
          onLongPress();
          longPressTimerRef.current = null;
        }, 2000);
      }
    },
    [isDraggable, onLongPress],
  );

  // 터치 이동 추적
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartTime === 0) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      const moveDistance = Math.max(deltaX, deltaY);
      touchMoveDistanceRef.current = moveDistance;

      // 일정 거리 이상 움직이면 롱프레스 타이머 취소
      if (moveDistance > 10 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // 편집 모드가 아닐 때는 이동 추적만 하고 드래그 관련 처리는 하지 않음
      if (!isDraggable) return;

      // 이동 방향 결정
      if (deltaY > deltaX * 1.5) {
        // 수직 이동이 수평 이동보다 1.5배 이상 크면 스크롤로 간주
        touchMoveDirectionRef.current = 'vertical';
        setIsDragDisabled(true);
        // 스크롤을 위해 기본 동작 허용
        return;
      } else if (deltaX > deltaY * 1.5) {
        touchMoveDirectionRef.current = 'horizontal';
      } else {
        touchMoveDirectionRef.current = 'none';
      }

      // 터치 시간이 짧고 이동 거리가 크면 스크롤로 간주하여 드래그 비활성화
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration < 1500 && moveDistance > 15) {
        setIsDragDisabled(true);
      }
    },
    [isDraggable, touchStartTime, touchStartPos],
  );

  // 터치 종료 시 클릭 허용 여부 결정
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchDuration = Date.now() - touchStartTime;
      const moveDistance = touchMoveDistanceRef.current;
      const moveDirection = touchMoveDirectionRef.current;

      // 롱프레스 타이머 취소
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!isDraggable) {
        if (touchDuration < 2000 && moveDistance < 10) {
          handleClick(e);
        }
        setIsDragDisabled(false);
        setTouchStartTime(0);
        return;
      }

      // 수직 이동(스크롤)이거나, 짧은 터치에서 큰 이동이 있었으면 드래그 무시
      if (moveDirection === 'vertical' || (touchDuration < 1500 && moveDistance > 15)) {
        clickAllowedRef.current = true;
        setIsDragDisabled(false);
        setTouchStartTime(0);
        // 스크롤이었으므로 클릭도 처리하지 않음
        return;
      }

      // 2초 이상 눌렀거나, 30px 이상 수평 이동했으면 드래그로 간주하여 클릭 무시
      if (touchDuration >= 1800 || (moveDistance >= 30 && moveDirection === 'horizontal')) {
        clickAllowedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      } else {
        // 짧은 터치이고 이동 거리가 적으면 클릭으로 처리
        handleClick(e);
      }

      // 터치 종료 시 드래그 비활성화 상태 초기화
      setIsDragDisabled(false);
      setTouchStartTime(0);
      touchMoveDirectionRef.current = 'none';
    },
    [isDraggable, touchStartTime, handleClick, onLongPress],
  );

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
    if (isSortableDragging) classes.push('bookmark-card--dragging');
    if (isEditMode) classes.push('bookmark-card--edit-mode');
    return classes.join(' ');
  }, [isSortableDragging, isEditMode]);

  const hasMenuActions = Boolean(onDelete || onEdit);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClassName}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...attributes}
      {...(isDraggable && !isDragDisabled ? listeners : {})}
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
