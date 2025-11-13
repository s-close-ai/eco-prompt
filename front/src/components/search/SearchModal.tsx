import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/common/Sheet';
import { useAppShell } from '@/context/AppShellContext';
import { searchMessages } from '@/services/api/message';
import type { MessageSearchResponse } from '@/types/api/message.types';
import { formatMonthDay } from '@/utils/date';
import '@/styles/components/search/search-modal.css';

export default function SearchModal() {
  const { isSearchOpen, closeSearch } = useAppShell();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageSearchResponse['data']>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [isSearchOpen]);

  // 검색 실행
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await searchMessages({ string: query });
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('검색 실패:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어 입력 시 디바운스 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 검색 결과 클릭 시 해당 채팅으로 이동
  const handleResultClick = (chattingId: number) => {
    closeSearch();
    navigate('/chat', { state: { chatId: chattingId } });
  };

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
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="search-results">
          {isSearching ? (
            <div className="search-results-empty">
              <p>검색 중...</p>
            </div>
          ) : hasSearched && searchResults.length === 0 ? (
            <div className="search-results-empty">
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="search-results-list">
              {searchResults.map((result) => (
                <button
                  key={`${result.chattingId}-${result.content.substring(0, 20)}`}
                  className="search-result-item"
                  onClick={() => handleResultClick(result.chattingId)}
                >
                  <div className="search-result-header">
                    <h3 className="search-result-title">{result.chattingTitle}</h3>
                    <span className="search-result-date">
                      {formatMonthDay(result.chattingUpdatedAt)}
                    </span>
                  </div>
                  <p className="search-result-content">{result.content}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="search-results-empty">
              <p>검색어를 입력하세요.</p>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
