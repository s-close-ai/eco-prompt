import { apiClient } from '@/services/axios';
import type {
  BookmarkDeleteRequest,
  BookmarkDeleteResponse,
  BookmarkResponse,
  BookmarkCreateResponse,
  BookmarkCreateRequest,
  BookmarkUpdateRequest,
  BookmarkUpdateResponse,
  BookmarkSequenceRequest,
  BookmarkSequenceResponse,
} from '@/types/api/bookmark.types';

/**
 * 북마크 조회
 * Endpoint: GET  /bookmarks
 * @returns 북마크 목록
 */
export const getBookmarks = async (): Promise<BookmarkResponse> => {
  const response = await apiClient.get<BookmarkResponse>('/bookmarks');
  return response.data;
};

/**
 * 북마크 생성
 * Endpoint: POST  /bookmarks
 * @param request - 북마크 정보 (title, url, description)
 * @returns 생성된 북마크 ID
 */
export const createBookmark = async (
  request: BookmarkCreateRequest,
): Promise<BookmarkCreateResponse> => {
  const response = await apiClient.post<BookmarkCreateResponse>('/bookmarks', request);
  return response.data;
};

/**
 * 북마크 수정
 * Endpoint: PATCH  /bookmarks/{bookmarkId}
 * @param bookmarkId - 수정할 북마크 ID
 * @param request - 수정할 북마크 정보 (title, url, description)
 */
export const updateBookmark = async (
  bookmarkId: number,
  request: BookmarkUpdateRequest,
): Promise<BookmarkUpdateResponse> => {
  const response = await apiClient.patch<BookmarkUpdateResponse>(
    `/bookmarks/${bookmarkId}`,
    request,
  );
  return response.data;
};

/**
 * 북마크 순서 수정
 * Endpoint: PATCH  /bookmarks/sequence
 * @param bookmarkIds - 새로운 순서대로 정렬된 북마크 ID 배열
 */
export const updateBookmarkSequence = async (
  request: BookmarkSequenceRequest,
): Promise<BookmarkSequenceResponse> => {
  const response = await apiClient.patch<BookmarkSequenceResponse>('/bookmarks/sequence', request);
  return response.data;
};

/**
 * 북마크 삭제
 * Endpoint: PATCH  /bookmarks/delete
 * @param bookmarkId - 삭제할 북마크 ID
 */
export const deleteBookmark = async (
  request: BookmarkDeleteRequest,
): Promise<BookmarkDeleteResponse> => {
  const response = await apiClient.patch<BookmarkDeleteResponse>('/bookmarks/delete', request);
  return response.data;
};
