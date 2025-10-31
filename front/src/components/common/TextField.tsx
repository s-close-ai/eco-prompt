import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import '@/styles/components/common/text-field.css';

export type TextFieldProps = {
  label?: string;
  assistiveText?: string;
  leftIconSrc?: string;
  rightIconSrc?: string;
  fullWidth?: boolean;
  isInvalid?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, assistiveText, leftIconSrc, rightIconSrc, fullWidth, isInvalid, ...rest },
  ref,
) {
  const wrapperClass = [
    'ep-text-field',
    fullWidth ? 'is-full' : '',
    isInvalid ? 'is-invalid' : '',
    leftIconSrc ? 'has-left-icon' : '',
    rightIconSrc ? 'has-right-icon' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClass}>
      {label ? <span className="ep-text-field__label">{label}</span> : null}
      <div className="ep-text-field__control">
        {leftIconSrc ? <img src={leftIconSrc} alt="" aria-hidden width={18} height={18} /> : null}
        <input ref={ref} {...rest} />
        {rightIconSrc ? <img src={rightIconSrc} alt="" aria-hidden width={18} height={18} /> : null}
      </div>
      {assistiveText ? (
        <span className="ep-text-field__assist" aria-live="polite">
          {assistiveText}
        </span>
      ) : null}
    </label>
  );
});

export default TextField;
