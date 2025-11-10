import { useCallback, useRef } from 'react';

/**
 * 길게 누르기 이벤트를 처리하는 커스텀 훅
 * @param callback - 길게 눌렀을 때 실행될 콜백 함수
 * @param ms - 길게 누르기로 간주할 시간 (밀리초)
 */
export function useLongPress(
  callback: (event: React.TouchEvent | React.MouseEvent) => void,
  ms = 500,
) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventRef = useRef<React.TouchEvent | React.MouseEvent | undefined>(undefined);

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      eventRef.current = event;

      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      timeout.current = setTimeout(() => {
        if (eventRef.current) {
          callback(eventRef.current);
        }
        timeout.current = null;
      }, ms);
    },
    [callback, ms],
  );

  const stop = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
  }, []);

  // 길게 누르기 이벤트를 트리거할 수 있는 이벤트 핸들러들
  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchEnd: stop,
    onTouchMove: stop, // 이동 시 길게 누르기 취소
  };
}
