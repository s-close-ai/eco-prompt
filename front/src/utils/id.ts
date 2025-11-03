/**
 * 고유한 채팅 ID 생성
 * crypto.randomUUID를 사용하여 충돌 없는 ID 생성
 */
export function generateChatId(): string {
  // crypto.randomUUID가 없는 환경 대비
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
