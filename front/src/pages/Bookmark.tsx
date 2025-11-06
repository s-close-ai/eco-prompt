import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
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

const MAX_BOOKMARKS = 12;

type FormMode = 'create' | 'edit';

export default function Bookmark() {
  const mode = useDeviceMode();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(mockBookmarks);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  // 화면 크기 추적 (북마크 페이지에서만)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모바일/태블릿: 롱프레스로 드래그, 데스크탑: 편집 모드에서만 드래그
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: mode === 'desktop' ? 0 : 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: mode === 'mobile' || mode === 'tablet' ? (isEditMode ? 0 : 1000) : 1000, // 모바일/태블릿: 편집 모드일 때만 즉시 드래그
        tolerance: 10, // 터치 이동 허용 범위 증가 (스크롤과 구분)
      },
    }),
  );

  const handleBookmarkClick = useCallback(
    (bookmark: Bookmark) => {
      // 모달이 열려있으면 먼저 닫기
      if (formMode !== null) {
        setFormMode(null);
      }
      window.open(bookmark.url, '_blank');
    },
    [formMode],
  );

  const handleEdit = useCallback((bookmark: Bookmark) => {
    // 다른 북마크 편집 시 기존 모달 닫고 새로 열기
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
    // 토글: 이미 생성 모달이 열려있으면 닫기, 아니면 열기
    if (formMode === 'create') {
      setFormMode(null);
    } else {
      setFormMode('create');
    }
  }, [formMode]);

  // 진동 피드백 함수 (PWA 지원)
  const vibrate = useCallback((duration: number = 200) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (error) {
        // 진동 기능이 지원되지 않는 경우 무시
        console.debug('Vibration not supported');
      }
    }
  }, []);

  const handleLongPress = useCallback(() => {
    // 롱프레스 시 편집 모드 활성화 (내부적으로만 사용, UI에는 표시 안 함)
    if (!isEditMode) {
      setIsEditMode(true);
      vibrate(200);
    }
  }, [isEditMode, vibrate]);

  const handleDragStart = useCallback(
    (_event: DragStartEvent) => {
      // 모바일에서 드래그 시작 시 진동 피드백
      if (mode === 'mobile') {
        vibrate(200);
      }
    },
    [mode, vibrate],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // over가 없거나 같은 아이템이면 드래그 취소 (스크롤로 간주)
      if (!over || active.id === over.id) {
        // 드래그가 끝났으므로 편집 모드 종료
        if (mode === 'mobile' || mode === 'tablet') {
          setIsEditMode(false);
        }
        return;
      }

      // 모바일에서 실제로 다른 위치로 이동했는지 확인
      if (mode === 'mobile' || mode === 'tablet') {
        const oldIndex = bookmarks.findIndex((item: Bookmark) => item.id === active.id);
        const newIndex = bookmarks.findIndex((item: Bookmark) => item.id === over.id);

        // 같은 위치면 드래그 취소 (스크롤로 간주)
        if (oldIndex === newIndex) {
          setIsEditMode(false);
          return;
        }
      }

      if (over && active.id !== over.id) {
        setBookmarks((items: Bookmark[]) => {
          const oldIndex = items.findIndex((item: Bookmark) => item.id === active.id);
          const newIndex = items.findIndex((item: Bookmark) => item.id === over.id);

          return arrayMove(items, oldIndex, newIndex);
        });

        // TODO: 백엔드에 순서 변경 API 호출
      }

      // 드래그가 끝났으므로 모바일/태블릿에서는 편집 모드 자동 종료
      if (mode === 'mobile' || mode === 'tablet') {
        setIsEditMode(false);
      }
    },
    [mode, bookmarks],
  );

  const canAddMore = bookmarks.length < MAX_BOOKMARKS;
  const isDraggable = isEditMode;
  const isFormOpen = formMode !== null;
  const bookmarkIds = useMemo(() => bookmarks.map((b: Bookmark) => b.id), [bookmarks]);

  // 동적 그리드 컬럼 수 계산
  const totalItems = bookmarks.length + (canAddMore && !isEditMode ? 1 : 0);
  const maxColumns = useMemo(() => {
    switch (mode) {
      case 'mobile':
        return 2;
      case 'tablet':
        // 태블릿: 화면 너비에 따라 2개 또는 3개 (945px 기준)
        return windowWidth >= 945 ? 3 : 2;
      case 'desktop':
        // 데스크탑: 화면 너비에 따라 3개 또는 4개 (1165px 기준)
        return windowWidth >= 1165 ? 4 : 3;
      default:
        return 4;
    }
  }, [mode, windowWidth]);
  const gridColumns = Math.min(totalItems, maxColumns);

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
    const gridStyle = {
      '--grid-columns': gridColumns,
    } as React.CSSProperties;

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={bookmarkIds} strategy={rectSortingStrategy}>
          {' '}
          <div className="bookmark-page__grid" style={gridStyle}>
            {bookmarks.map((bookmark: Bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onClick={handleBookmarkClick}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onLongPress={handleLongPress}
                isDraggable={isDraggable}
                isEditMode={isEditMode}
              />
            ))}
            {canAddMore && !isEditMode && (
              <div className="bookmark-card bookmark-card--add" onClick={handleCreateOpen}>
                <div className="bookmark-card__add-icon">
                  <img src="/icons/add.svg" alt="" aria-hidden />
                </div>
                <div className="bookmark-card__add-label">북마크 추가</div>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    );
  }, [
    sensors,
    bookmarkIds,
    handleDragStart,
    handleDragEnd,
    bookmarks,
    handleBookmarkClick,
    handleDelete,
    handleEdit,
    handleLongPress,
    isDraggable,
    isEditMode,
    canAddMore,
    handleCreateOpen,
    gridColumns,
  ]);

  // 모바일/태블릿: 페이지 형식
  if (mode === 'mobile' || mode === 'tablet') {
    if (isFormOpen) {
      return <div className="bookmark-create-page">{renderForm()}</div>;
    }

    return (
      <div className="bookmark-page">
        <div className="bookmark-page__header">
          <div className="bookmark-page__title">
            <img src="/icons/bookmark.svg" alt="" aria-hidden width={24} height={24} />
            <h2>북마크</h2>
          </div>
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
          <div className="bookmark-page__title">
            <img src="/icons/bookmark.svg" alt="" aria-hidden width={24} height={24} />
            <h2>북마크</h2>
          </div>
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
