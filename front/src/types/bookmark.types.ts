export type Bookmark = {
  status: string;
  data: {
    bookmarkCount: number;
    bookmarks: BookmarkItem[];
  };
};

export type BookmarkItem = {
  title: string;
  url: string;
  description?: string;
};

// UI/Mock용 북마크 타입
export type MockBookmark = {
  id: number;
  title: string;
  url: string;
  description?: string;
  icon?: string;
};
