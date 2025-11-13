import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/types/chat.types';

interface UseChatScrollProps {
  messages: ChatMessage[];
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  onLoadMore: () => void;
  chattingId?: number | string;
}

interface UseChatScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesStartRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  scrollToBottom: (smooth?: boolean) => void;
  autoScrollEnabledRef: React.MutableRefObject<boolean>;
  isUserAtBottomRef: React.MutableRefObject<boolean>;
  previousScrollHeightRef: React.MutableRefObject<number>;
  previousScrollTopRef: React.MutableRefObject<number>;
  previousMessagesLengthRef: React.MutableRefObject<number>;
  isInitialPositionedRef: React.MutableRefObject<boolean>;
}

/**
 * 채팅 스크롤 관리 커스텀 훅
 * - 자동 스크롤
 * - 무한 스크롤 (상단 도달 시 이전 메시지 로드)
 * - 스크롤 투 바텀 버튼
 * - 스크롤 위치 복원
 */
export function useChatScroll({
  messages,
  isLoadingMore,
  hasMoreMessages,
  onLoadMore,
  chattingId,
}: UseChatScrollProps): UseChatScrollReturn {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const previousScrollHeightRef = useRef<number>(0);
  const previousScrollTopRef = useRef<number>(0);
  const previousMessagesLengthRef = useRef<number>(0);
  const isUserAtBottomRef = useRef<boolean>(true);
  const isInitialPositionedRef = useRef<boolean>(false);
  const autoScrollEnabledRef = useRef<boolean>(false);

  // 맨 아래로 스크롤
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    });
  }, []);

  // 스크롤 위치 감지
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    const threshold = 200; // 200px 이상 올라가면 버튼 표시
    const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;

    isUserAtBottomRef.current = isAtBottom;
    setShowScrollToBottom(!isAtBottom && messages.length > 0);
  }, [messages.length]);

  // 스크롤 위치 관리
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const currentMessagesLength = messages.length;
    const previousMessagesLength = previousMessagesLengthRef.current;

    // 이전 메시지 로드 완료 후 새로 불러온 메시지의 맨 아래로 스크롤
    if (!isLoadingMore && previousScrollHeightRef.current > 0) {
      const currentScrollHeight = container.scrollHeight;
      const previousScrollHeight = previousScrollHeightRef.current;

      if (currentScrollHeight > previousScrollHeight) {
        // 새 메시지가 위에 추가되었으므로, 새로 불러온 메시지의 맨 아래로 스크롤
        const scrollDifference = currentScrollHeight - previousScrollHeight;
        container.scrollTop = scrollDifference;
        previousScrollHeightRef.current = 0;
        previousScrollTopRef.current = 0;
      }
    }
    // 새 메시지가 맨 아래에 추가된 경우 (메시지 수가 증가하고, 로딩 중이 아닐 때)
    else if (!isLoadingMore && currentMessagesLength > previousMessagesLength) {
      const isStreaming = messages.some((m) => m.isStreaming);

      // 자동 스크롤이 활성화되고 스트리밍 중이며 사용자가 맨 아래에 있을 때만 자동 스크롤
      if (autoScrollEnabledRef.current && isStreaming && isUserAtBottomRef.current) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth',
            });
          }
        });
      }
    }

    previousMessagesLengthRef.current = currentMessagesLength;
  }, [messages, isLoadingMore]);

  // 스크롤 이벤트 감지 (상단 도달 시 추가 로드 + 사용자가 맨 아래에 있는지 체크)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 초기 하단 위치 지정 전에는 무한 스크롤 로딩 금지 (초기 로드시 위 페이지로 당겨오는 현상 방지)
      if (!isInitialPositionedRef.current) return;
      const { scrollTop } = container;

      // 스크롤 위치 감지
      checkScrollPosition();

      // 맨 위에서 100px 이내일 때 추가 로드
      if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
        onLoadMore();
      }
    };

    // 스크롤 이벤트에 쓰로틀링 적용 (성능 최적화)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const throttledHandleScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 50);
    };

    container.addEventListener('scroll', throttledHandleScroll);
    return () => {
      container.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hasMoreMessages, isLoadingMore, onLoadMore, checkScrollPosition]);

  // 초기 메시지 로드 시 맨 아래로 스크롤 (백업 로직)
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMore) {
      // 채팅방이 변경되었을 때
      const isNewChat = previousMessagesLengthRef.current === 0;
      if (isNewChat) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const container = scrollContainerRef.current;
              container.scrollTop = container.scrollHeight;
              isInitialPositionedRef.current = true;
            } else if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
              isInitialPositionedRef.current = true;
            }
          });
        });
      }
    }
  }, [messages.length, chattingId, isLoadingMore]);

  return {
    scrollContainerRef,
    messagesEndRef,
    messagesStartRef,
    showScrollToBottom,
    scrollToBottom,
    autoScrollEnabledRef,
    isUserAtBottomRef,
    previousScrollHeightRef,
    previousScrollTopRef,
    previousMessagesLengthRef,
    isInitialPositionedRef,
  };
}
