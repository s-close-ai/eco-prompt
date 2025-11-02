import Sheet from '@/components/common/Sheet';
import BookmarkCreateForm from '@/components/bookmark/BookmarkCreateForm';

type BookmarkCreateOverlayProps = {
  open: boolean;
  onClose: () => void;
  variant: 'modal' | 'fullscreen';
  onSubmit?: (data: { title: string; url: string; description: string }) => void;
};

export default function BookmarkCreateOverlay({
  open,
  onClose,
  variant,
  onSubmit,
}: BookmarkCreateOverlayProps) {
  const sheetVariant = variant === 'fullscreen' ? 'fullscreen' : 'modal';
  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={sheetVariant}
      ariaLabel="북마크 생성"
      className="bookmark-create-overlay-sheet"
    >
      <BookmarkCreateForm onSubmit={onSubmit} onClose={onClose} />
    </Sheet>
  );
}

