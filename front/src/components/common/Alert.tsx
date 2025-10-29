import '@/styles/components/common/alert.css';

interface AlertProps {
  message: React.ReactNode;
  onConfirm: () => void;
}

export default function Alert({ message, onConfirm }: AlertProps) {
  return (
    <div className="alert-backdrop" onClick={onConfirm}>
      <div className="alert-container" onClick={(e) => e.stopPropagation()}>
        <p className="alert-message">{message}</p>
        <button onClick={onConfirm} className="alert-button">
          확인
        </button>
      </div>
    </div>
  );
}
