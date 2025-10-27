import '@/styles/components/common/button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variantClass = `button-${variant}`;
  const sizeClass = `button-${size}`;
  const widthClass = fullWidth ? 'button-full' : '';

  return (
    <button
      className={`button ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
