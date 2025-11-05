import Sheet from '@/components/common/Sheet';
import { useAppShell } from '@/context/AppShellContext';
import '@/styles/components/search/search-modal.css';

export default function SearchModal() {
  const { isSearchOpen, closeSearch } = useAppShell();

  return (
    <Sheet
      open={isSearchOpen}
      onClose={closeSearch}
      variant="modal"
      ariaLabel="검색"
      className="search-modal"
    >
      <div className="search-modal-content">
        <div className="search-input-wrapper">
          <img src="/icons/search.svg" alt="search" width={24} height={24} />
          <input type="text" placeholder="검색어를 입력하세요..." className="search-input" />
        </div>
        <div className="search-results">
          {/* 검색 결과가 여기에 표시됩니다. */}
          <p>검색 결과가 없습니다.</p>
        </div>
      </div>
    </Sheet>
  );
}
