import { apiClient } from '@/services/axios';

/**
 * 북마크 조회
 * Endpoint: GET /api/v1/bookmarks
 * @returns 북마크 목록
 */
export const getBookmarks = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/bookmarks');
  return response.data;
};

/**
 * 북마크 생성
 * Endpoint: POST /api/v1/bookmarks
 * @param request - 북마크 정보 (title, url, description)
 * @returns 생성된 북마크 ID
 */
export const createBookmark = async (request: {
  title: string;
  url: string;
  description?: string;
}): Promise<any> => {
  const response = await apiClient.post('/api/v1/bookmarks', request);
  return response.data;
};

/**
 * 북마크 수정
 * Endpoint: PATCH /api/v1/bookmarks/{bookmarkId}
 * @param bookmarkId - 수정할 북마크 ID
 * @param request - 수정할 북마크 정보 (title, url, description)
 */
export const updateBookmark = async (
  bookmarkId: number,
  request: {
    title: string;
    url: string;
    description?: string;
  },
): Promise<void> => {
  await apiClient.patch(`/api/v1/bookmarks/${bookmarkId}`, request);
};

/**
 * 북마크 순서 수정
 * Endpoint: PATCH /api/v1/bookmarks/sequence
 * @param bookmarkIds - 새로운 순서대로 정렬된 북마크 ID 배열
 */
export const updateBookmarkSequence = async (bookmarkIds: number[]): Promise<void> => {
  await apiClient.patch('/api/v1/bookmarks/sequence', { bookmarkIds });
};

/**
 * 북마크 삭제
 * Endpoint: PATCH /api/v1/bookmarks/delete
 * @param bookmarkId - 삭제할 북마크 ID
 */
export const deleteBookmark = async (bookmarkId: number): Promise<void> => {
  await apiClient.patch('/api/v1/bookmarks/delete', { bookmarkId });
};
