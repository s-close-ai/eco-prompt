import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/components/common/tooltip.css';
import InfoIcon from '/icons/info.svg';

interface TooltipProps {
  content: string;
}

export default function Tooltip({ content }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = rect.top - 8; // 위로 8px
    const left = rect.left + rect.width / 2; // 중앙 기준
    setPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      updatePosition();
      
      const handleScroll = () => {
        if (isVisible) {
          updatePosition();
        }
      };
      
      const handleResize = () => {
        if (isVisible) {
          updatePosition();
        }
      };

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);

  const handleMouseEnter = () => {
    setIsVisible(true);
    updatePosition();
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
    setPosition(null);
  };

  return (
    <>
      <div className="ep-tooltip-wrapper">
        <button
          ref={triggerRef}
          type="button"
          className="ep-tooltip-trigger"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleMouseEnter}
          onBlur={handleMouseLeave}
          aria-label="도움말"
        >
          <img src={InfoIcon} alt="info" width={16} height={16} />
        </button>
      </div>
      {isVisible && position &&
        createPortal(
          <div
            ref={tooltipRef}
            className="ep-tooltip-content"
            role="tooltip"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={handleMouseLeave}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
