/**
 * Date를 "Jan 25" 형식으로 포맷팅
 */
export function formatShortDate(date: Date | string | number | undefined): string {
  if (!date) return '';

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    return dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * 상대 시간 포맷팅 (예: "2분 전", "3일 전")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}주 전`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}개월 전`;
  return `${Math.floor(diffInDays / 365)}년 전`;
}

/**
 * Date를 "00월 00일" 형식으로 포맷팅
 * @param dateString - 날짜 문자열 (예: "2025.11.13.13.15.10")
 */
export function formatMonthDay(dateString: string | Date | undefined): string {
  if (!dateString) return '';

  try {
    let dateObj: Date;
    
    if (typeof dateString === 'string') {
      // "2025.11.13.13.15.10" 형식을 파싱
      const parts = dateString.split('.');
      if (parts.length >= 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 월은 0부터 시작
        const day = parseInt(parts[2], 10);
        dateObj = new Date(year, month, day);
      } else {
        dateObj = new Date(dateString);
      }
    } else {
      dateObj = dateString;
    }

    if (isNaN(dateObj.getTime())) return '';

    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${month}월 ${day}일`;
  } catch {
    return '';
  }
}
