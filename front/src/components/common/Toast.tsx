import { useEffect, useState } from 'react';
import { useToast, type Toast as ToastType } from '@/context/ToastContext';
import '@/styles/components/common/toast.css';

interface ToastItemProps {
  toast: ToastType;
}

function ToastItem({ toast }: ToastItemProps) {
  const { hideToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 애니메이션을 위해 약간의 지연 후 exit 시작
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration - 300); // 300ms 전에 exit 애니메이션 시작

      return () => clearTimeout(exitTimer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      hideToast(toast.id);
    }, 300); // 애니메이션 시간과 동일
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast--${toast.type} ${isExiting ? 'toast--exit' : ''}`}>
      <div className="toast__icon">{getIcon()}</div>
      <div className="toast__message">{toast.message}</div>
      <button className="toast__close" onClick={handleClose} aria-label="닫기">
        ✕
      </button>
    </div>
  );
}

export default function Toast() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
