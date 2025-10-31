import { PropsWithChildren, useEffect } from 'react';
import '@/styles/components/common/sheet.css';

type SheetVariant = 'modal' | 'bottom' | 'fullscreen';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  variant: SheetVariant;
  ariaLabel?: string;
};

export default function Sheet({ open, onClose, variant, ariaLabel, children }: PropsWithChildren<SheetProps>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ep-sheet" role="dialog" aria-modal aria-label={ariaLabel} data-variant={variant}>
      <div className="ep-sheet__backdrop" onClick={onClose} />
      <div className="ep-sheet__panel" data-variant={variant}>
        <button className="ep-sheet__close icon-button" aria-label="닫기" onClick={onClose}>
          <img src="/icons/close.svg" alt="close" width={20} height={20} />
        </button>
        <div className="ep-sheet__content">{children}</div>
      </div>
    </div>
  );
}


