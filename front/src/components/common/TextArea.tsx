import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import '@/styles/components/common/text-area.css';

export type TextAreaProps = {
  label?: string;
  assistiveText?: string;
  fullWidth?: boolean;
  isInvalid?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  rows?: number;
  autoResize?: boolean;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'rows'>;

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    label,
    assistiveText,
    fullWidth,
    isInvalid,
    maxLength,
    showCharCount = false,
    rows = 4,
    autoResize = false,
    value,
    onChange,
    ...rest
  },
  ref,
) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const currentValue = value as string;
  const charCount = typeof currentValue === 'string' ? currentValue.length : 0;

  useImperativeHandle(ref, () => internalRef.current!, []);

  useEffect(() => {
    if (autoResize && internalRef.current) {
      internalRef.current.style.height = 'auto';
      internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
    }
  }, [currentValue, autoResize]);

  const wrapperClass = [
    'ep-text-area',
    fullWidth ? 'is-full' : '',
    isInvalid ? 'is-invalid' : '',
    rest.disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (maxLength && e.target.value.length > maxLength) {
      return;
    }
    onChange?.(e);
  };

  return (
    <label className={wrapperClass}>
      {label ? <span className="ep-text-area__label">{label}</span> : null}
      <div className="ep-text-area__control">
        <textarea
          ref={internalRef}
          rows={autoResize ? 1 : rows}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          {...rest}
        />
      </div>
      {showCharCount && maxLength ? (
        <span className="ep-text-area__char-count">
          {charCount} / {maxLength}
        </span>
      ) : null}
      {assistiveText ? (
        <span className="ep-text-area__assist" aria-live="polite">
          {assistiveText}
        </span>
      ) : null}
    </label>
  );
});

export default TextArea;
