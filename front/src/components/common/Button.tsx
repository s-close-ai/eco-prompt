import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import '@/styles/components/common/button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'mobile';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIconSrc?: string;
  rightIconSrc?: string;
  isDisabled?: boolean;
  ariaLabel?: string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'disabled' | 'aria-label'>;

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  leftIconSrc,
  rightIconSrc,
  isDisabled,
  ariaLabel,
  className: customClassName,
  type = 'button',
  ...rest
}: PropsWithChildren<ButtonProps>) {
  const className = [
    'ep-button',
    `ep-button--${variant}`,
    `ep-button--${size}`,
    fullWidth ? 'is-full' : '',
    customClassName || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={className}
      disabled={isDisabled}
      aria-label={ariaLabel}
      {...rest}
    >
      {leftIconSrc ? <img src={leftIconSrc} alt="" aria-hidden width={18} height={18} /> : null}
      <span className="ep-button__label">{children}</span>
      {rightIconSrc ? <img src={rightIconSrc} alt="" aria-hidden width={18} height={18} /> : null}
    </button>
  );
}
