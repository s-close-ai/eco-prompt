import { useState, useEffect, useRef } from 'react';
import { mockEcoPickPrompts } from '@/data/mockData';
import type { EcoPickPrompt } from '@/types/dashboard.types';
import useDeviceMode from '@/hooks/useDeviceMode';
import '@/styles/components/dashboard/eco-pick.css';

interface EcoPickProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export default function EcoPick({ onSwipeLeft, onSwipeRight }: EcoPickProps) {
  const mode = useDeviceMode();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const prompts = mockEcoPickPrompts;
  const currentPrompt = prompts[currentIndex];

  // 태블릿/데스크탑: 3개의 프롬프트를 캐러셀로 표시
  const isDesktopMode = mode === 'tablet' || mode === 'desktop';

  // 스와이프 처리 (모바일)
  useEffect(() => {
    if (mode !== 'mobile') return;

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

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const renderPromptCard = (prompt: EcoPickPrompt, index: number) => (
    <div key={prompt.id} className="eco-pick-card">
      <div className="eco-pick-header">
        <h3 className="eco-pick-name">{prompt.name}</h3>
        <div className="eco-pick-score">{prompt.score}</div>
      </div>

      <div className={`eco-pick-content ${expandedIndex === index ? 'expanded' : ''}`}>
        <p className="eco-pick-description">{prompt.description}</p>
        <div className="eco-pick-tasks">
          <p className="tasks-title">개발 환경:</p>
          <p>React, TypeScript</p>
        </div>
        <div className="eco-pick-tasks">
          <p className="tasks-title">작업:</p>
          {prompt.tasks.map((task, idx) => (
            <p key={idx}>{task}</p>
          ))}
        </div>
        <div className="eco-pick-principles">
          <p className="principles-title">원칙:</p>
          {prompt.principles.map((principle, idx) => (
            <p key={idx}>{principle}</p>
          ))}
        </div>
      </div>

      <div className="eco-pick-metrics">
        <div className="metric-item">
          <span className="metric-label">명확성</span>
          <span className="metric-value">{prompt.metrics.clarity}점</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">구체성</span>
          <span className="metric-value">{prompt.metrics.specificity}점</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">형식 준수</span>
          <span className="metric-value">{prompt.metrics.formatCompliance}점</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">안정성</span>
          <span className="metric-value">{prompt.metrics.stability}점</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="eco-pick-container" ref={containerRef}>
      <div className="eco-pick-carousel">
        {isDesktopMode ? (
          // 태블릿/데스크탑: 캐러셀 (3개 프롬프트)
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
            {currentIndex > 0 && (
              <button className="carousel-button prev" onClick={handlePrev} aria-label="이전">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            {currentIndex < prompts.length - 1 && (
              <button className="carousel-button next" onClick={handleNext} aria-label="다음">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </>
        ) : (
          // 모바일: 한 번에 하나씩
          <>
            <div className="eco-pick-card-wrapper">{renderPromptCard(currentPrompt, currentIndex)}</div>
            <div className="eco-pick-indicators">
              {prompts.map((_, idx) => (
                <span key={idx} className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`} />
              ))}
            </div>
            {currentIndex > 0 && (
              <button className="carousel-button prev" onClick={handlePrev} aria-label="이전">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            {currentIndex < prompts.length - 1 && (
              <button className="carousel-button next" onClick={handleNext} aria-label="다음">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

