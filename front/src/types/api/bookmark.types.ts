export interface BookmarkResponse {
  status: string;
  data: {
    bookmarkCount: number;
    bookmarks: BookmarkItem[];
  };
}

export interface BookmarkItem {
  bookmarkId: number;
  title: string;
  url: string;
  description?: string;
}

export interface BookmarkCreateRequest {
  title: string;
  url: string;
  description?: string;
}

export interface BookmarkCreateResponse {
  status: string;
  data: {
    bookmarkId: number;
  };
}

export interface BookmarkUpdateRequest {
  title: string;
  url: string;
  description?: string;
}

export interface BookmarkUpdateResponse {
  status: string;
  data: {
    bookmarkId: number;
  };
}

export interface BookmarkSequenceRequest {
  bookmarkIds: number[];
}

export interface BookmarkSequenceResponse {
  status: string;
  data: void;
}

export interface BookmarkDeleteRequest {
  bookmarkId: number;
}

export interface BookmarkDeleteResponse {
  status: string;
  data: void;
}

export interface MockBookmark {
  id: number;
  title: string;
  url: string;
  description?: string;
  icon?: string;
}
