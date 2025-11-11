import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';

/**
 * 펼쳐진 사이드바의 상단 영역을 담당하는 컴포넌트
 */
export function SidebarHeader() {
  const navigate = useNavigate();
  const { closeSidebar, toggleSidebar, toggleSidebarCollapsed, toggleSearch } = useAppShell();
  const mode = useDeviceMode();
  const [searchQuery, setSearchQuery] = useState('');

  const closeAllOverlays = () => {
    window.dispatchEvent(new CustomEvent('project-create-close'));
    window.dispatchEvent(new CustomEvent('settings-close'));
  };

  const handleCreateProject = () => {
    if (mode === 'mobile') {
      closeSidebar();
    }
    // 전역 이벤트를 사용하여 프로젝트 생성 오버레이를 토글
    window.dispatchEvent(new CustomEvent('project-create-toggle'));
  };

  const handleNewChat = () => {
    if (mode === 'mobile') {
      closeSidebar();
    }
    navigate('/chat');
  };

  return (
    <div className="sidebar-header">
      <div className="sidebar-header-top">
        <div className="sidebar-logo" onClick={() => navigate('/chat')}>
          <img
            src="/logo/header_img.png"
            alt="Eco Prompt"
            style={{ width: '150px', height: 'auto' }}
          />
        </div>
        {/* 데스크탑용 사이드바 접기 버튼 */}
        <button
          className="sidebar-toggle-btn sidebar-toggle-desktop"
          onClick={() => {
            closeAllOverlays();
            toggleSidebarCollapsed();
          }}
          aria-label="사이드바 접기"
        >
          <img src="/icons/sidebar_close.svg" alt="close" width={20} height={20} />
        </button>
        {/* 모바일/태블릿용 사이드바 닫기 버튼 */}
        <button
          className="sidebar-toggle-btn sidebar-toggle-mobile"
          onClick={() => {
            closeAllOverlays();
            if (mode === 'mobile') {
              closeSidebar();
            } else {
              toggleSidebar();
            }
          }}
          aria-label="사이드바 닫기"
        >
          <img src="/icons/sidebar_close.svg" alt="open" width={20} height={20} />
        </button>
      </div>

      {/* 데스크탑용 검색 버튼 */}
      <button
        className="sidebar-search sidebar-search-desktop"
        onClick={() => {
          closeAllOverlays();
          toggleSearch();
        }}
      >
        <img src="/icons/search.svg" alt="search" width={18} height={18} />
        <span>검색</span>
      </button>

      {/* 모바일용 검색 입력창 */}
      <label className="sidebar-search sidebar-search-mobile">
        <img src="/icons/search.svg" alt="search" width={18} height={18} />
        <input
          type="text"
          placeholder="검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={closeAllOverlays}
        />
      </label>

      {/* 새 채팅 / 새 프로젝트 버튼 */}
      <div className="sidebar-actions">
        <button className="sidebar-action-btn" onClick={handleNewChat}>
          <img src="/icons/add_chat.svg" alt="add chat" width={18} height={18} />
          <span>새 채팅</span>
        </button>
        <button className="sidebar-action-btn" onClick={handleCreateProject}>
          <img src="/icons/add_folder.svg" alt="add folder" width={18} height={18} />
          <span>새 프로젝트</span>
        </button>
      </div>
    </div>
  );
}
