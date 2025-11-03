import { useState, useMemo, useCallback } from 'react';
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

type FormMode = 'create' | 'edit';

export default function Bookmark() {
  const mode = useDeviceMode();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(mockBookmarks);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // 모바일/태블릿: 롱프레스로 드래그, 데스크탑: 편집 모드에서만 드래그
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: mode === 'desktop' ? 0 : 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const handleBookmarkClick = useCallback((bookmark: Bookmark) => {
    window.open(bookmark.url, '_blank');
  }, []);

  const handleEdit = useCallback((bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setFormMode('edit');
  }, []);

  const handleUpdate = useCallback(
    (data: BookmarkFormData) => {
      if (!editingBookmark) return;

      const normalizedUrl = normalizeUrl(data.url);

      setBookmarks((prev: Bookmark[]) =>
        prev.map((b: Bookmark) =>
          b.id === editingBookmark.id
            ? {
                ...b,
                title: data.title,
                url: normalizedUrl,
                description: data.description || undefined,
                icon: getFaviconUrl(normalizedUrl),
              }
            : b,
        ),
      );
      setFormMode(null);
      setEditingBookmark(null);
    },
    [editingBookmark],
  );

  const handleEditClose = useCallback(() => {
    setFormMode(null);
    setEditingBookmark(null);
  }, []);

  const handleDelete = useCallback((bookmark: Bookmark) => {
    if (confirm(`"${bookmark.title}" 북마크를 삭제하시겠습니까?`)) {
      setBookmarks((prev: Bookmark[]) => prev.filter((b: Bookmark) => b.id !== bookmark.id));
    }
  }, []);

  const handleCreate = useCallback(
    (data: BookmarkFormData) => {
      if (bookmarks.length >= MAX_BOOKMARKS) {
        alert(`최대 ${MAX_BOOKMARKS}개까지 추가할 수 있습니다.`);
        return;
      }

      const normalizedUrl = normalizeUrl(data.url);

      const newBookmark: Bookmark = {
        id: Date.now() + Math.random(), // 더 안전한 ID 생성
        title: data.title,
        url: normalizedUrl,
        description: data.description || undefined,
        icon: getFaviconUrl(normalizedUrl),
      };

      setBookmarks((prev: Bookmark[]) => [...prev, newBookmark]);
      setFormMode(null);
    },
    [bookmarks.length],
  );

  const handleCreateOpen = useCallback(() => {
    setFormMode('create');
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBookmarks((items: Bookmark[]) => {
        const oldIndex = items.findIndex((item: Bookmark) => item.id === active.id);
        const newIndex = items.findIndex((item: Bookmark) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });

      // TODO: 백엔드에 순서 변경 API 호출
    }
  }, []);

  const canAddMore = bookmarks.length < MAX_BOOKMARKS;
  const isDraggable = mode === 'desktop' ? isEditMode : true;
  const isFormOpen = formMode !== null;
  const bookmarkIds = useMemo(() => bookmarks.map((b: Bookmark) => b.id), [bookmarks]);

  // 생성/편집 폼 렌더링 헬퍼
  const renderForm = useCallback(() => {
    if (formMode === 'create') {
      return <BookmarkCreateForm onSubmit={handleCreate} onClose={handleEditClose} />;
    }

    if (formMode === 'edit' && editingBookmark) {
      return (
        <BookmarkCreateForm
          onSubmit={handleUpdate}
          onClose={handleEditClose}
          initialData={{
            title: editingBookmark.title,
            url: editingBookmark.url,
            description: editingBookmark.description || '',
          }}
        />
      );
    }

    return null;
  }, [formMode, editingBookmark, handleCreate, handleUpdate, handleEditClose]);

  // 북마크 그리드 렌더링 헬퍼
  const renderBookmarkGrid = useCallback(() => {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={bookmarkIds} strategy={rectSortingStrategy}>
          <div className="bookmark-page__grid">
            {bookmarks.map((bookmark: Bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onClick={handleBookmarkClick}
                onDelete={handleDelete}
                onEdit={handleEdit}
                isDraggable={isDraggable}
                isEditMode={isEditMode}
              />
            ))}
            {canAddMore && !isEditMode && (
              <div className="bookmark-card bookmark-card--add" onClick={handleCreateOpen}>
                <div className="bookmark-card__add-icon">
                  <img src="/icons/add.svg" alt="" aria-hidden />
                </div>
                <div className="bookmark-card__add-label">링크 추가</div>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    );
  }, [
    sensors,
    bookmarkIds,
    handleDragEnd,
    bookmarks,
    handleBookmarkClick,
    handleDelete,
    handleEdit,
    isDraggable,
    isEditMode,
    canAddMore,
    handleCreateOpen,
  ]);

  // 모바일/태블릿: 페이지 형식
  if (mode === 'mobile' || mode === 'tablet') {
    if (isFormOpen) {
      return <div className="bookmark-create-page">{renderForm()}</div>;
    }

    return (
      <div className="bookmark-page">
        <div className="bookmark-page__header">
          <h1 className="bookmark-page__title">북마크</h1>
        </div>
        {renderBookmarkGrid()}
      </div>
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
        {renderBookmarkGrid()}
      </div>

      {formMode === 'create' && (
        <BookmarkCreateOverlay
          open={isFormOpen}
          onClose={handleEditClose}
          variant="modal"
          onSubmit={handleCreate}
        />
      )}

      {formMode === 'edit' && editingBookmark && (
        <BookmarkCreateOverlay
          open={isFormOpen}
          onClose={handleEditClose}
          variant="modal"
          onSubmit={handleUpdate}
          initialData={{
            title: editingBookmark.title,
            url: editingBookmark.url,
            description: editingBookmark.description || '',
          }}
        />
      )}
    </>
  );
}
