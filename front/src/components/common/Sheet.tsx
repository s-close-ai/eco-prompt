import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import '@/styles/components/common/sheet.css';

type SheetVariant = 'modal' | 'bottom' | 'fullscreen';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  variant: SheetVariant;
  ariaLabel?: string;
  className?: string;
};

export default function Sheet({
  open,
  onClose,
  variant,
  ariaLabel,
  className,
  children,
}: PropsWithChildren<SheetProps>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`ep-sheet ${className || ''}`}
      role="dialog"
      aria-modal
      aria-label={ariaLabel}
      data-variant={variant}
    >
      <div className="ep-sheet__backdrop" onClick={onClose} />
      <div className="ep-sheet__panel" data-variant={variant}>
        <div className="ep-sheet__content">{children}</div>
      </div>
    </div>
  );
}
