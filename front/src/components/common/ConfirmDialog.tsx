import { useEffect, useRef } from 'react';
import { useConfirmState } from '@/context/ConfirmContext';
import '@/styles/components/common/confirm-dialog.css';

export default function ConfirmDialog() {
  const { confirmState, handleConfirm, handleCancel } = useConfirmState();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmState) {
      // 다이얼로그가 열릴 때 확인 버튼에 포커스
      confirmButtonRef.current?.focus();

      // ESC 키로 닫기
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCancel();
        } else if (e.key === 'Enter') {
          handleConfirm();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [confirmState, handleCancel, handleConfirm]);

  if (!confirmState) return null;

  const {
    title = '확인',
    message,
    confirmText = '확인',
    cancelText = '취소',
    variant = 'info',
  } = confirmState;

  return (
    <div className="confirm-dialog-overlay" onClick={handleCancel}>
      <div
        className={`confirm-dialog confirm-dialog--${variant}`}
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="confirm-dialog__header">
          <div className={`confirm-dialog__icon confirm-dialog__icon--${variant}`}>
            {variant === 'danger' && '!'}
            {variant === 'warning' && '⚠'}
            {variant === 'info' && '?'}
          </div>
          <h2 id="confirm-title" className="confirm-dialog__title">
            {title}
          </h2>
        </div>
        <p id="confirm-message" className="confirm-dialog__message">
          {message}
        </p>
        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog__btn confirm-dialog__btn--confirm confirm-dialog__btn--${variant}`}
            onClick={handleConfirm}
            ref={confirmButtonRef}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
