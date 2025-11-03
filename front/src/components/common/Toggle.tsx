import type { ButtonHTMLAttributes } from 'react';
import '@/styles/components/common/toggle.css';

export type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
  isDisabled?: boolean;
  ariaLabel?: string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'value' | 'className' | 'disabled' | 'aria-label'
>;

export default function Toggle({
  value,
  onChange,
  leftLabel = '비공개',
  rightLabel = '공개',
  isDisabled = false,
  ariaLabel,
  ...rest
}: ToggleProps) {
  const handleClick = () => {
    if (!isDisabled) {
      onChange(!value);
    }
  };

  return (
    <div className="ep-toggle-container">
      <span className={`ep-toggle-label ${!value ? 'is-active' : ''}`}>{leftLabel}</span>
      <button
        type="button"
        className={`ep-toggle ${value ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-pressed={value}
        role="switch"
        {...rest}
      >
        <span className="ep-toggle__track">
          <span className="ep-toggle__thumb" />
        </span>
      </button>
      <span className={`ep-toggle-label ${value ? 'is-active' : ''}`}>{rightLabel}</span>
    </div>
  );
}
