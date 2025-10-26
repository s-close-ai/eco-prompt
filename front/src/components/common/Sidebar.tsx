import { useState } from 'react';
import '@/styles/components/common/sidebar.css';
import DashboardIcon from '@/assets/icons/dashboard.svg?react';
import { useSidebarStore } from '@/stores/useSidebarStore';
import AddChatIcon from '@/assets/icons/add_chat.svg?react';
import AddProjectIcon from '@/assets/icons/add_folder.svg?react';
import SidebarCloseIcon from '@/assets/icons/sidebar_close.svg?react';
import SidebarOpenIcon from '@/assets/icons/sidebar_open.svg?react';
import FindIcon from '@/assets/icons/find.svg?react';
import SearchIcon from '@/assets/icons/search.svg?react';
import FolderIcon from '@/assets/icons/folder.svg?react';
import { mockChatList, mockProjectList } from '@/data/mockData';

export default function Sidebar() {
  const { isOpen, isCollapsed, toggleOpen, toggleCollapsed } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      {/* 모바일/태블릿 배경 오버레이 */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={toggleOpen}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      >
        {/* 접힌 상태 - 데스크탑 전용 */}
        {isCollapsed && (
          <div className="sidebar-collapsed">
            <button 
              className="sidebar-logo-btn"
              onClick={toggleCollapsed}
              aria-label="사이드바 열기"
            >
              <img src="/logo/ngb_logo_png.png" alt="로고" className="sidebar-logo-icon" />
            </button>
            
            <div className="sidebar-collapsed-icons">
              <button
                className="sidebar-icon-btn"
                aria-label="새 채팅"
                onClick={() => console.log('새 채팅 생성')}
              >
                <AddChatIcon />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="새 프로젝트"
                onClick={() => console.log('새 프로젝트 생성')}
              >
                <AddProjectIcon />
              </button>
            </div>

            <button
              className="sidebar-icon-btn sidebar-explore-btn"
              aria-label="탐색하기"
              onClick={() => console.log('탐색하기 클릭')}
            >
              <DashboardIcon />
            </button>
          </div>
        )}

        {/* 펼쳐진 상태 */}
        {!isCollapsed && (
          <div className="sidebar-content">
            {/* 상단 고정 영역 */}
            <div className="sidebar-header">
              <div className="sidebar-header-top">
                <div className="sidebar-logo">
                  <img src="/logo/ngb_logo_png_name.png" alt="Eco Prompt" />
                </div>
                <button 
                  className="sidebar-toggle-btn sidebar-toggle-desktop"
                  onClick={toggleCollapsed}
                  aria-label="사이드바 접기"
                >
                  <SidebarOpenIcon />
                </button>
                <button
                  className="sidebar-toggle-btn sidebar-toggle-mobile"
                  onClick={toggleOpen}
                  aria-label="사이드바 닫기"
                >
                  <SidebarCloseIcon />
                </button>
              </div>

              {/* 검색창 */}
              <div className="sidebar-search">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* 새 채팅/새 프로젝트 버튼 - 가로로 배치 */}
              <div className="sidebar-actions">
                <button
                  className="sidebar-action-btn"
                  onClick={() => console.log('새 채팅 생성')}
                >
                  <AddChatIcon />
                  <span>새 채팅</span>
                </button>
                <button
                  className="sidebar-action-btn"
                  onClick={() => console.log('새 프로젝트 생성')}
                >
                  <AddProjectIcon />
                  <span>새 프로젝트</span>
                </button>
              </div>
            </div>

            {/* 스크롤 가능한 중간 영역 (프로젝트 + 채팅) */}
            <div className="sidebar-scroll">
              {/* 프로젝트 목록 */}
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">프로젝트</h3>
                <ul className="sidebar-list">
                  {mockProjectList.map(project => (
                    <li key={project.id}>
                      <button
                        className="sidebar-list-item"
                        onClick={() => console.log('프로젝트 선택:', project.title)}
                      >
                        <FolderIcon />
                        <span className="sidebar-list-item-text">{project.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 채팅 목록 */}
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">채팅</h3>
                <ul className="sidebar-list">
                  {mockChatList.map(chat => (
                    <li key={chat.id}>
                      <button
                        className="sidebar-list-item sidebar-list-item-no-icon"
                        onClick={() => console.log('채팅 선택:', chat.title)}
                      >
                        <span className="sidebar-list-item-text">{chat.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 하단 고정 영역 */}
            <div className="sidebar-footer">
              <button
                className="sidebar-explore-btn"
                onClick={() => console.log('탐색하기 클릭')}
              >
                <FindIcon />
                <span>탐색하기</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

