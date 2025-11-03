/**
 * URL에 프로토콜이 없으면 자동으로 https://를 추가합니다.
 * @param url - 정규화할 URL
 * @returns 프로토콜이 포함된 URL
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  // 이미 프로토콜이 있으면 그대로 반환
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // 프로토콜이 없으면 https:// 추가
  return `https://${trimmed}`;
}

/**
 * URL이 유효한지 검사합니다.
 * @param url - 검사할 URL
 * @returns 유효하면 true, 아니면 false
 */
export function isValidUrl(url: string): boolean {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    // http 또는 https 프로토콜만 허용
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * URL에서 도메인을 추출합니다.
 * @param url - 도메인을 추출할 URL
 * @returns 도메인 문자열 (예: "example.com")
 */
export function extractDomain(url: string): string {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname;
  } catch {
    // URL 파싱 실패 시 빈 문자열 반환
    return '';
  }
}

/**
 * URL에서 파비콘 URL을 생성합니다.
 * Google의 파비콘 서비스를 사용합니다.
 * @param url - 파비콘을 가져올 웹사이트 URL
 * @param size - 파비콘 크기 (기본값: 64)
 * @returns 파비콘 URL
 */
export function getFaviconUrl(url: string, size: number = 64): string {
  const domain = extractDomain(url);
  if (!domain) {
    return '';
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}
