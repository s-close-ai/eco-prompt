import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import useDeviceMode from '@/hooks/useDeviceMode';
import BookmarkCard from '@/components/bookmark/BookmarkCard';
import BookmarkCreateOverlay from '@/components/bookmark/BookmarkCreateOverlay';
import BookmarkCreateForm from '@/components/bookmark/BookmarkCreateForm';
import Button from '@/components/common/Button';
import { getFaviconUrl, normalizeUrl } from '@/utils/bookmark';
import type { Bookmark } from '@/types/bookmark.types';
import type { BookmarkFormData } from '@/components/bookmark/BookmarkCreateForm';
import '@/styles/pages/bookmark.css';

// TODO: 실제 API에서 데이터를 가져오도록 수정
const mockBookmarks: Bookmark[] = [
  {
    id: 1,
    title: '에듀 싸피',
    url: 'https://edu.ssafy.com/edu/main/index.do',
    description: '싸피 출결 관리',
    icon: getFaviconUrl('https://edu.ssafy.com/edu/main/index.do'),
  },
  {
    id: 2,
    title: '싸피 출결 소명기',
    url: 'https://ssafy-attendance.vercel.app/?tab=confirm',
    description: '싸피 출결 소명기 웹',
    icon: getFaviconUrl('https://ssafy-attendance.vercel.app/?tab=confirm'),
  },
];

const MAX_BOOKMARKS = 10;

export default function Bookmark() {
  const mode = useDeviceMode();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(mockBookmarks);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // 모바일/태블릿: 롱프레스로 드래그, 데스크탑: 편집 모드에서만 드래그
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: mode === 'desktop' ? 0 : 8, // 데스크탑은 즉시, 모바일은 8px 이동 후
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms 롱프레스
        tolerance: 5,
      },
    })
  );

  const handleBookmarkClick = (bookmark: Bookmark) => {
    window.open(bookmark.url, '_blank');
  };

  const handleDelete = (bookmark: Bookmark) => {
    if (confirm(`"${bookmark.title}" 북마크를 삭제하시겠습니까?`)) {
      setBookmarks(bookmarks.filter((b) => b.id !== bookmark.id));
    }
  };

  const handleCreate = (data: BookmarkFormData) => {
    if (bookmarks.length >= MAX_BOOKMARKS) {
      alert(`최대 ${MAX_BOOKMARKS}개까지 추가할 수 있습니다.`);
      return;
    }

    // URL 정규화 (프로토콜 자동 추가)
    const normalizedUrl = normalizeUrl(data.url);

    const newBookmark: Bookmark = {
      id: Date.now(),
      title: data.title,
      url: normalizedUrl,
      description: data.description || undefined,
      icon: getFaviconUrl(normalizedUrl),
    };

    setBookmarks([...bookmarks, newBookmark]);
    setIsCreateOpen(false);
  };

  const handleClose = () => {
    setIsCreateOpen(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBookmarks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });

      // TODO: 백엔드에 순서 변경 API 호출
      // updateBookmarkOrder(bookmarks.map(b => b.id));
    }
  };

  const canAddMore = bookmarks.length < MAX_BOOKMARKS;

  // 데스크탑에서 편집 모드가 아니면 드래그 비활성화
  const isDraggable = mode === 'desktop' ? isEditMode : true;

  // 모바일: 전체 페이지
  if (mode === 'mobile') {
    if (isCreateOpen) {
      return (
        <div className="bookmark-create-page">
          <BookmarkCreateForm onSubmit={handleCreate} onClose={handleClose} />
        </div>
      );
    }

    return (
      <div className="bookmark-page">
        <div className="bookmark-page__header">
          <h1 className="bookmark-page__title">북마크</h1>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bookmarks.map((b) => b.id)} strategy={rectSortingStrategy}>
            <div className="bookmark-page__grid">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onClick={handleBookmarkClick}
                  onDelete={handleDelete}
                  isDraggable={isDraggable}
                />
              ))}
              {canAddMore && (
                <div
                  className="bookmark-card bookmark-card--add"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <div className="bookmark-card__add-icon">
                    <img src="/icons/add_folder.svg" alt="" aria-hidden />
                  </div>
                  <div className="bookmark-card__add-label">링크 추가</div>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  // 태블릿: 모달
  if (mode === 'tablet') {
    return (
      <>
        <div className="bookmark-page">
          <div className="bookmark-page__header">
            <h1 className="bookmark-page__title">북마크</h1>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={bookmarks.map((b) => b.id)} strategy={rectSortingStrategy}>
              <div className="bookmark-page__grid">
                {bookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    onClick={handleBookmarkClick}
                    onDelete={handleDelete}
                    isDraggable={isDraggable}
                  />
                ))}
                {canAddMore && (
                  <div
                    className="bookmark-card bookmark-card--add"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <div className="bookmark-card__add-icon">
                      <img src="/icons/add_folder.svg" alt="" aria-hidden />
                    </div>
                    <div className="bookmark-card__add-label">링크 추가</div>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <BookmarkCreateOverlay
          open={isCreateOpen}
          onClose={handleClose}
          variant="modal"
          onSubmit={handleCreate}
        />
      </>
    );
  }

  // 데스크탑: 모달 + 편집 버튼
  return (
    <>
      <div className="bookmark-page">
        <div className="bookmark-page__header">
          <h1 className="bookmark-page__title">북마크</h1>
          <Button
            variant={isEditMode ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            ariaLabel={isEditMode ? '완료' : '순서 편집'}
          >
            {isEditMode ? '완료' : '순서 편집'}
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bookmarks.map((b) => b.id)} strategy={rectSortingStrategy}>
            <div className="bookmark-page__grid">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onClick={handleBookmarkClick}
                  onDelete={handleDelete}
                  isDraggable={isDraggable}
                  isEditMode={isEditMode}
                />
              ))}
              {canAddMore && !isEditMode && (
                <div
                  className="bookmark-card bookmark-card--add"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <div className="bookmark-card__add-icon">
                    <img src="/icons/add_folder.svg" alt="" aria-hidden />
                  </div>
                  <div className="bookmark-card__add-label">링크 추가</div>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <BookmarkCreateOverlay
        open={isCreateOpen}
        onClose={handleClose}
        variant="modal"
        onSubmit={handleCreate}
      />
    </>
  );
}
