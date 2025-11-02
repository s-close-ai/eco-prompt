import Sheet from '@/components/common/Sheet';
import BookmarkCreateForm from '@/components/bookmark/BookmarkCreateForm';
import type { BookmarkFormData } from '@/components/bookmark/BookmarkCreateForm';

type BookmarkCreateOverlayProps = {
  open: boolean;
  onClose: () => void;
  variant: 'modal' | 'fullscreen';
  onSubmit?: (data: { title: string; url: string; description: string }) => void;
  initialData?: BookmarkFormData;
};

export default function BookmarkCreateOverlay({
  open,
  onClose,
  variant,
  onSubmit,
  initialData,
}: BookmarkCreateOverlayProps) {
  const sheetVariant = variant === 'fullscreen' ? 'fullscreen' : 'modal';
  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={sheetVariant}
      ariaLabel={initialData ? '북마크 수정' : '북마크 생성'}
      className="bookmark-create-overlay-sheet"
    >
      <BookmarkCreateForm onSubmit={onSubmit} onClose={onClose} initialData={initialData} />
    </Sheet>
  );
}

