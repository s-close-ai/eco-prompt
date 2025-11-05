import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PropsWithChildren } from 'react';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
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
  const [isVisible, setIsVisible] = useState(open);
  const [isAnimating, setIsAnimating] = useState(false);
  const { isSidebarCollapsed } = useAppShell();
  const mode = useDeviceMode();

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      // 다음 프레임에서 애니메이션 시작
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      // 애니메이션 완료 후 unmount
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // CSS transition 시간과 동일
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!isVisible) return null;

  const sheetClasses = [
    'ep-sheet',
    className || '',
    isAnimating ? 'is-open' : '',
    mode === 'desktop' && isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      className={sheetClasses}
      role="dialog"
      aria-modal
      aria-label={ariaLabel}
      data-variant={variant}
    >
      <div className="ep-sheet__backdrop" onClick={onClose} />
      <div className="ep-sheet__panel" data-variant={variant} onClick={(e) => e.stopPropagation()}>
        <div className="ep-sheet__content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
