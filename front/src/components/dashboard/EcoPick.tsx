import { useState, useEffect, useRef } from 'react';
import { getEcoPick } from '@/services/api/dashboard';
import type { EcoPickItem } from '@/types/api/dashboard.types';
import useDeviceMode from '@/hooks/useDeviceMode';
import '@/styles/components/dashboard/eco-pick.css';
import copyIcon from '/icons/copy.svg';

interface EcoPickProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

// 이스케이프 문자를 처리하는 함수
function parseEscapeCharacters(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // 이스케이프 문자 처리: \n을 실제 줄바꿈으로
  const parts = text.split('\\n');
  
  return parts.flatMap((part, index) => {
    const elements: React.ReactNode[] = [];
    
    if (index > 0) {
      elements.push(<br key={`br-${index}`} />);
    }
    
    // \t를 탭으로 처리
    if (part.includes('\\t')) {
      const tabParts = part.split('\\t');
      tabParts.forEach((tabPart, tabIndex) => {
        if (tabIndex > 0) {
          elements.push(<span key={`tab-${index}-${tabIndex}`} style={{ marginLeft: '2em' }} />);
        }
        if (tabPart) {
          elements.push(tabPart);
        }
      });
    } else if (part) {
      elements.push(part);
    }
    
    return elements;
  });
}

export default function EcoPick({ onSwipeLeft, onSwipeRight }: EcoPickProps) {
  const mode = useDeviceMode();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<EcoPickItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const fetchEcoPick = async () => {
      try {
        setLoading(true);
        const response = await getEcoPick();
        setPrompts(response.data);
      } catch (error) {
        console.error('Failed to fetch eco pick:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEcoPick();
  }, []);

  const currentPrompt = prompts[currentIndex];

  // 태블릿/데스크탑 구분
  const isDesktopMode = mode === 'desktop';
  const isTabletMode = mode === 'tablet';

  // 스와이프 처리 (모바일, 태블릿)
  useEffect(() => {
    if (mode === 'desktop') return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      currentXRef.current = startXRef.current;
      isDraggingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      currentXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;

      const diff = startXRef.current - currentXRef.current;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          // 왼쪽으로 스와이프 (다음)
          if (currentIndex < prompts.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setExpandedIndex(null);
          } else if (onSwipeRight) {
            // 맨 뒤에서 더 스와이프하면 내 점수로
            onSwipeRight();
          }
        } else {
          // 오른쪽으로 스와이프 (이전)
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setExpandedIndex(null);
          } else if (onSwipeLeft) {
            // 맨 앞에서 더 스와이프하면 랭킹으로
            onSwipeLeft();
          }
        }
      }

      isDraggingRef.current = false;
      startXRef.current = 0;
      currentXRef.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mode, currentIndex, prompts.length, onSwipeLeft, onSwipeRight]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setExpandedIndex(null);
    }
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setExpandedIndex(null);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      // 이스케이프 문자를 실제 문자로 변환
      const processedText = text
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r');
      
      await navigator.clipboard.writeText(processedText);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const renderPromptCard = (prompt: EcoPickItem, index: number) => (
    <div key={index} className="eco-pick-card">
      <div className="eco-pick-header">
        <div className="eco-pick-name-wrapper">
          <h3 className="eco-pick-name">{prompt.name}</h3>
        </div>
        <div className="eco-pick-score-wrapper">
          <button
            className="copy-button"
            onClick={() => handleCopy(prompt.prompt)}
            aria-label="프롬프트 복사"
          >
            <img src={copyIcon} alt="복사" />
          </button>
          <div className="eco-pick-score">{prompt.sumOfScore}</div>
        </div>
      </div>

      <div className={`eco-pick-content ${expandedIndex === index ? 'expanded' : ''}`}>
        <p className="eco-pick-description">{parseEscapeCharacters(prompt.prompt)}</p>
      </div>

      <div className="eco-pick-metrics">
        <div className="metric-item">
          <span className="metric-label">명확성</span>
          <span className="metric-value">{prompt.detailScore.sc_ec_1}점</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">구체성</span>
          <span className="metric-value">{prompt.detailScore.sc_ec_2}점</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">형식 준수</span>
          <span className="metric-value">{prompt.detailScore.sc_ec_3}점</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">안전성</span>
          <span className="metric-value">{prompt.detailScore.sc_ec_4}점</span>
        </div>
      </div>
      
      {copied && <span className="eco-pick-copied">복사됨!</span>}
    </div>
  );

  if (loading) {
    return <div className="eco-pick-container">Loading...</div>;
  }

  if (!prompts.length) {
    return <div className="eco-pick-container">추천 프롬프트가 없습니다.</div>;
  }

  return (
    <div className="eco-pick-container" ref={containerRef}>
      <div className="eco-pick-carousel">
        {isDesktopMode ? (
          // 데스크탑: 좌우 화살표 버튼 + 인디케이터
          <>
            <div className="carousel-track" ref={carouselRef}>
              {renderPromptCard(currentPrompt, currentIndex)}
            </div>
            <div className="eco-pick-controls">
              <button
                className="carousel-button-bottom prev"
                onClick={handlePrev}
                aria-label="이전"
                disabled={currentIndex === 0}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="eco-pick-indicators">
                {prompts.map((_, idx) => (
                  <button
                    key={idx}
                    className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`${idx + 1}번째 프롬프트`}
                  />
                ))}
              </div>
              <button
                className="carousel-button-bottom next"
                onClick={handleNext}
                aria-label="다음"
                disabled={currentIndex === prompts.length - 1}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </>
        ) : isTabletMode ? (
          // 태블릿: 인디케이터만 (모바일과 동일)
          <>
            <div className="carousel-track" ref={carouselRef}>
              {renderPromptCard(currentPrompt, currentIndex)}
            </div>
            <div className="eco-pick-indicators">
              {prompts.map((_, idx) => (
                <button
                  key={idx}
                  className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`${idx + 1}번째 프롬프트`}
                />
              ))}
            </div>
          </>
        ) : (
          // 모바일: 인디케이터만
          <>
            <div className="eco-pick-card-wrapper">
              {renderPromptCard(currentPrompt, currentIndex)}
            </div>
            <div className="eco-pick-indicators">
              {prompts.map((_, idx) => (
                <span
                  key={idx}
                  className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
