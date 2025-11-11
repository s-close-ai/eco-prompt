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
import type { MockBookmark } from '@/types/api/bookmark.types';
import type { BookmarkFormData } from '@/components/bookmark/BookmarkCreateForm';
import {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  updateBookmarkSequence,
} from '@/services/api/bookmark';
import '@/styles/pages/bookmark.css';

const MAX_BOOKMARKS = 12;

type FormMode = 'create' | 'edit';

export default function Bookmark() {
  const mode = useDeviceMode();
  const [bookmarks, setBookmarks] = useState<MockBookmark[]>([]);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<MockBookmark | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );
  const [originalBookmarkOrder, setOriginalBookmarkOrder] = useState<number[]>([]);

  // 북마크 데이터 로드
  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setIsLoading(true);
        const response = await getBookmarks();
        const bookmarksWithIcons = response.data.bookmarks.map((bookmark) => ({
          id: bookmark.bookmarkId,
          title: bookmark.title,
          url: bookmark.url,
          description: bookmark.description,
          icon: getFaviconUrl(bookmark.url),
        }));
        setBookmarks(bookmarksWithIcons);
        setOriginalBookmarkOrder(bookmarksWithIcons.map((b) => b.id));
      } catch (error) {
        console.error('북마크 조회 실패:', error);
        alert('북마크를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

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
    (bookmark: MockBookmark) => {
      // 모달이 열려있으면 먼저 닫기
      if (formMode !== null) {
        setFormMode(null);
      }
      window.open(bookmark.url, '_blank');
    },
    [formMode],
  );

  const handleEdit = useCallback((bookmark: MockBookmark) => {
    // 다른 북마크 편집 시 기존 모달 닫고 새로 열기
    setEditingBookmark(bookmark);
    setFormMode('edit');
  }, []);

  const handleUpdate = useCallback(
    async (data: BookmarkFormData) => {
      if (!editingBookmark) return;

      const normalizedUrl = normalizeUrl(data.url);

      try {
        await updateBookmark(editingBookmark.id, {
          title: data.title,
          url: normalizedUrl,
          description: data.description || undefined,
        });

        setBookmarks((prev: MockBookmark[]) =>
          prev.map((b: MockBookmark) =>
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
      } catch (error) {
        console.error('북마크 수정 실패:', error);
        alert('북마크 수정에 실패했습니다.');
      }
    },
    [editingBookmark],
  );

  const handleEditClose = useCallback(() => {
    setFormMode(null);
    setEditingBookmark(null);
  }, []);

  const handleDelete = useCallback(async (bookmark: MockBookmark) => {
    if (confirm(`"${bookmark.title}" 북마크를 삭제하시겠습니까?`)) {
      try {
        await deleteBookmark({ bookmarkId: bookmark.id });
        setBookmarks((prev: MockBookmark[]) =>
          prev.filter((b: MockBookmark) => b.id !== bookmark.id),
        );
      } catch (error) {
        console.error('북마크 삭제 실패:', error);
        alert('북마크 삭제에 실패했습니다.');
      }
    }
  }, []);

  const handleCreate = useCallback(
    async (data: BookmarkFormData) => {
      if (bookmarks.length >= MAX_BOOKMARKS) {
        alert(`최대 ${MAX_BOOKMARKS}개까지 추가할 수 있습니다.`);
        return;
      }

      const normalizedUrl = normalizeUrl(data.url);

      try {
        const response = await createBookmark({
          title: data.title,
          url: normalizedUrl,
          description: data.description || undefined,
        });

        const newBookmark: MockBookmark = {
          id: response.data.bookmarkId,
          title: data.title,
          url: normalizedUrl,
          description: data.description || undefined,
          icon: getFaviconUrl(normalizedUrl),
        };

        setBookmarks((prev: MockBookmark[]) => [...prev, newBookmark]);
        setFormMode(null);
      } catch (error) {
        console.error('북마크 생성 실패:', error);
        alert('북마크 생성에 실패했습니다.');
      }
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
    async (event: DragEndEvent) => {
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
        const oldIndex = bookmarks.findIndex((item: MockBookmark) => item.id === active.id);
        const newIndex = bookmarks.findIndex((item: MockBookmark) => item.id === over.id);

        // 같은 위치면 드래그 취소 (스크롤로 간주)
        if (oldIndex === newIndex) {
          setIsEditMode(false);
          return;
        }
      }

      if (over && active.id !== over.id) {
        let newBookmarks: MockBookmark[] = [];
        setBookmarks((items: MockBookmark[]) => {
          const oldIndex = items.findIndex((item: MockBookmark) => item.id === active.id);
          const newIndex = items.findIndex((item: MockBookmark) => item.id === over.id);
          newBookmarks = arrayMove(items, oldIndex, newIndex);
          return newBookmarks;
        });

        // 모바일/태블릿: 드래그 완료 시 즉시 순서 변경 API 호출
        if (mode === 'mobile' || mode === 'tablet') {
          try {
            await updateBookmarkSequence({
              bookmarkIds: newBookmarks.map((b) => b.id),
            });
          } catch (error) {
            console.error('북마크 순서 변경 실패:', error);
            alert('북마크 순서 변경에 실패했습니다.');
            // 실패 시 원래 순서로 되돌리기
            setBookmarks(bookmarks);
          }
        }
      }

      // 드래그가 끝났으므로 모바일/태블릿에서는 편집 모드 자동 종료
      if (mode === 'mobile' || mode === 'tablet') {
        setIsEditMode(false);
      }
    },
    [mode, bookmarks],
  );

  // 데스크탑에서 편집 모드 토글 및 순서 저장
  const handleEditModeToggle = useCallback(async () => {
    // 편집 모드를 끄는 경우 (완료 버튼 클릭)
    if (isEditMode) {
      // 순서가 변경되었는지 확인
      const currentOrder = bookmarks.map((b) => b.id);
      const hasOrderChanged =
        JSON.stringify(currentOrder) !== JSON.stringify(originalBookmarkOrder);

      if (hasOrderChanged) {
        try {
          await updateBookmarkSequence({
            bookmarkIds: currentOrder,
          });
          setOriginalBookmarkOrder(currentOrder);
        } catch (error) {
          console.error('북마크 순서 변경 실패:', error);
          alert('북마크 순서 변경에 실패했습니다.');
          // 실패 시 원래 순서로 되돌리기
          const originalBookmarks = [...bookmarks].sort((a, b) => {
            return originalBookmarkOrder.indexOf(a.id) - originalBookmarkOrder.indexOf(b.id);
          });
          setBookmarks(originalBookmarks);
        }
      }
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, bookmarks, originalBookmarkOrder]);

  const canAddMore = bookmarks.length < MAX_BOOKMARKS;
  const isDraggable = isEditMode;
  const isFormOpen = formMode !== null;
  const bookmarkIds = useMemo(() => bookmarks.map((b: MockBookmark) => b.id), [bookmarks]);

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
            {bookmarks.map((bookmark: MockBookmark) => (
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

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="bookmark-page">
        <div className="bookmark-page__header">
          <div className="bookmark-page__title">
            <img src="/icons/bookmark.svg" alt="" aria-hidden width={24} height={24} />
            <h2>북마크</h2>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</div>
      </div>
    );
  }

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
            onClick={handleEditModeToggle}
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
