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
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [arrowPosition, setArrowPosition] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const { innerWidth: screenWidth } = window;
    const padding = 10;
    const tooltipHeight = tooltipRect.height;

    let newPlacement: 'top' | 'bottom' = 'top';
    if (triggerRect.top - tooltipHeight - padding < 0) {
      newPlacement = 'bottom';
    }

    let top;
    if (newPlacement === 'top') {
      top = triggerRect.top - tooltipHeight - 8;
    } else {
      top = triggerRect.bottom + 8;
    }

    let left = triggerRect.left + triggerRect.width / 2;
    let arrowLeft = triggerRect.left + triggerRect.width / 2;

    if (left - tooltipRect.width / 2 < padding) {
      left = tooltipRect.width / 2 + padding;
    } else if (left + tooltipRect.width / 2 > screenWidth - padding) {
      left = screenWidth - tooltipRect.width / 2 - padding;
    }

    arrowLeft = arrowLeft - left + tooltipRect.width / 2;

    setPosition({ top, left });
    setPlacement(newPlacement);
    setArrowPosition(arrowLeft);
  };

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(updatePosition, 0);

      const handleScroll = () => isVisible && updatePosition();
      const handleResize = () => isVisible && updatePosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);

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
      {createPortal(
        <div
          ref={tooltipRef}
          className={`ep-tooltip-content ${isVisible ? 'ep-tooltip-visible' : ''}`}
          role="tooltip"
          style={
            {
              ...(position
                ? {
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    '--arrow-left': `${arrowPosition}px`,
                  }
                : { visibility: 'hidden' }),
            } as React.CSSProperties
          }
          data-placement={placement}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
