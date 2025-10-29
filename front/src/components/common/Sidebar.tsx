import { useState } from 'react';
import '@/styles/components/common/sidebar.css';
import DashboardIcon from '@/assets/icons/dashboard.svg?react';
import { useSidebarStore } from '@/stores/useSidebarStore';
import AddChatIcon from '@/assets/icons/add_chat.svg?react';
import AddProjectIcon from '@/assets/icons/add_folder.svg?react';
import SidebarCloseIcon from '@/assets/icons/sidebar_close.svg?react';
import SidebarOpenIcon from '@/assets/icons/sidebar_open.svg?react';
import HeaderImage from '@/assets/images/ep_header.png';
import SearchIcon from '@/assets/icons/search.svg?react';
import FolderIcon from '@/assets/icons/folder.svg?react';
import FolderOpenIcon from '@/assets/icons/folder_open.svg?react';
import { mockChatList, mockProjectList } from '@/data/mockData';
import BookmarkIcon from '@/assets/icons/bookmark.svg?react';
import SettingIcon from '@/assets/icons/settings.svg?react';

export default function Sidebar() {
  const { isOpen, isCollapsed, toggleOpen, toggleCollapsed } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  const toggleProject = (projectId: number) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

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
                aria-label="검색"
                onClick={() => console.log('검색 버튼 클릭')}
              >
                <SearchIcon />
              </button>
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

            <div className="sidebar-collapsed-footer">
              <button
                className="sidebar-icon-btn"
                aria-label="대시보드"
                onClick={() => console.log('대시보드 클릭')}
              >
                <DashboardIcon />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="북마크"
                onClick={() => console.log('북마크 클릭')}
              >
                <BookmarkIcon />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="설정"
                onClick={() => console.log('설정 클릭')}
              >
                <SettingIcon />
              </button>
            </div>
          </div>
        )}

        {/* 펼쳐진 상태 */}
        {!isCollapsed && (
          <div className="sidebar-content">
            {/* 상단 고정 영역 */}
            <div className="sidebar-header">
              <div className="sidebar-header-top">
                <div className="sidebar-logo">
                  <img src={HeaderImage} alt="Eco Prompt" style={{ width: '170px', height: 'auto' }} />
                </div>
                <button 
                  className="sidebar-toggle-btn sidebar-toggle-desktop"
                  onClick={toggleCollapsed}
                  aria-label="사이드바 접기"
                >
                  <SidebarCloseIcon />
                </button>
                <button
                  className="sidebar-toggle-btn sidebar-toggle-mobile"
                  onClick={toggleOpen}
                  aria-label="사이드바 닫기"
                >
                  <SidebarOpenIcon />
                </button>
              </div>

              {/* 검색창 - 데스크탑은 버튼, 모바일은 입력창 */}
              <div className="sidebar-search sidebar-search-desktop" onClick={() => console.log('검색 버튼 클릭')}>
                <SearchIcon />
                <span>검색</span>
              </div>

              <div className="sidebar-search sidebar-search-mobile">
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
                  {mockProjectList.map(project => {
                    const isExpanded = expandedProjects.has(project.id);
                    return (
                      <li key={project.id}>
                        <button
                          className="sidebar-list-item"
                          onClick={() => toggleProject(project.id)}
                        >
                          {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
                          <span className="sidebar-list-item-text">{project.title}</span>
                        </button>
                        {isExpanded && (
                          <ul className="sidebar-nested-list">
                            {project.chats.map(chat => (
                              <li key={chat.id}>
                                <button
                                  className="sidebar-list-item sidebar-nested-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('채팅 선택:', chat.title);
                                  }}
                                >
                                  <span className="sidebar-list-item-text">{chat.title}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
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
                <DashboardIcon />
                <span>대시보드</span>
              </button>
              <button
                className="sidebar-explore-btn"
                onClick={() => console.log('북마크 클릭')}
              >
                <BookmarkIcon />
                <span>북마크</span>
              </button>
              <button
                className="sidebar-explore-btn"
                onClick={() => console.log('설정 클릭')}
              >
                <SettingIcon />
                <span>설정</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

