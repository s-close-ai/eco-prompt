import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * 요소 외부 클릭을 감지하는 훅
 * @param refs - 외부 클릭을 감지할 ref 배열
 * @param handler - 외부 클릭 시 실행할 핸들러
 * @param isEnabled - 훅 활성화 여부
 */
export function useClickOutside<T extends HTMLElement>(
  refs: RefObject<T>[],
  handler: (event: MouseEvent | TouchEvent) => void,
  isEnabled = true,
) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const isOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(event.target as Node),
      );

      if (isOutside) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [refs, handler, isEnabled]);
}
