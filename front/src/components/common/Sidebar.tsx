import { useState } from 'react';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import '@/styles/components/common/sidebar.css';
import { mockProjectList, mockChatList } from '@/data/mockData';

export default function Sidebar() {
  const mode = useDeviceMode();
  const { isSidebarOpen, closeSidebar, isSidebarCollapsed, toggleSidebarCollapsed, toggleSidebar } =
    useAppShell();
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

  const isOpen = mode === 'desktop' || isSidebarOpen;
  const isCollapsed = mode === 'desktop' && isSidebarCollapsed;

  return (
    <>
      {/* 모바일/태블릿 배경 오버레이 */}
      {isSidebarOpen && mode === 'mobile' && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      {/* 사이드바 */}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* 접힌 상태 - 데스크탑 전용 */}
        {isCollapsed && (
          <div className="sidebar-collapsed">
            <button
              className="sidebar-logo-btn"
              onClick={toggleSidebarCollapsed}
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
                <img src="/icons/search.svg" alt="search" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="새 채팅"
                onClick={() => console.log('새 채팅 생성')}
              >
                <img src="/icons/add_chat.svg" alt="add chat" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="새 프로젝트"
                onClick={() => console.log('새 프로젝트 생성')}
              >
                <img src="/icons/add_folder.svg" alt="add folder" width={20} height={20} />
              </button>
            </div>

            <div className="sidebar-collapsed-footer">
              <button
                className="sidebar-icon-btn"
                aria-label="대시보드"
                onClick={() => console.log('대시보드 클릭')}
              >
                <img src="/icons/dashboard.svg" alt="dashboard" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="북마크"
                onClick={() => console.log('북마크 클릭')}
              >
                <img src="/icons/bookmark.svg" alt="bookmark" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="설정"
                onClick={() => console.log('설정 클릭')}
              >
                <img src="/icons/settings.svg" alt="settings" width={20} height={20} />
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
                  <img
                    src="/logo/header_img.png"
                    alt="Eco Prompt"
                    style={{ width: '150px', height: 'auto' }}
                  />
                </div>
                <button
                  className="sidebar-toggle-btn sidebar-toggle-desktop"
                  onClick={toggleSidebarCollapsed}
                  aria-label="사이드바 접기"
                >
                  <img src="/icons/sidebar_close.svg" alt="close" width={20} height={20} />
                </button>
                <button
                  className="sidebar-toggle-btn sidebar-toggle-mobile"
                  onClick={mode === 'mobile' ? closeSidebar : toggleSidebar}
                  aria-label="사이드바 닫기"
                >
                  <img src="/icons/sidebar_close.svg" alt="open" width={20} height={20} />
                </button>
              </div>

              {/* 검색창 - 데스크탑은 버튼, 모바일/태블릿은 입력창 */}
              <button
                className="sidebar-search sidebar-search-desktop"
                onClick={() => console.log('검색 버튼 클릭')}
              >
                <img src="/icons/search.svg" alt="search" width={18} height={18} />
                <span>검색</span>
              </button>

              <label className="sidebar-search sidebar-search-mobile">
                <img src="/icons/search.svg" alt="search" width={18} height={18} />
                <input
                  type="text"
                  placeholder="검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>

              {/* 새 채팅/새 프로젝트 버튼 */}
              <div className="sidebar-actions">
                <button className="sidebar-action-btn" onClick={() => console.log('새 채팅 생성')}>
                  <img src="/icons/add_chat.svg" alt="add chat" width={18} height={18} />
                  <span>새 채팅</span>
                </button>
                <button
                  className="sidebar-action-btn"
                  onClick={() => console.log('새 프로젝트 생성')}
                >
                  <img src="/icons/add_folder.svg" alt="add folder" width={18} height={18} />
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
                  {mockProjectList.map((project) => {
                    const isExpanded = expandedProjects.has(project.id);
                    return (
                      <li key={project.id}>
                        <button
                          className="sidebar-list-item"
                          onClick={() => toggleProject(project.id)}
                        >
                          <img
                            src={isExpanded ? '/icons/folder_open.svg' : '/icons/folder.svg'}
                            alt="folder"
                            width={18}
                            height={18}
                          />
                          <span className="sidebar-list-item-text">{project.title}</span>
                        </button>
                        {isExpanded && (
                          <ul className="sidebar-nested-list">
                            {project.chats.map((chat) => (
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
                  {mockChatList.map((chat) => (
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
              <button className="sidebar-explore-btn" onClick={() => console.log('대시보드 클릭')}>
                <img src="/icons/dashboard.svg" alt="dashboard" width={18} height={18} />
                <span>대시보드</span>
              </button>
              <button className="sidebar-explore-btn" onClick={() => console.log('북마크 클릭')}>
                <img src="/icons/bookmark.svg" alt="bookmark" width={18} height={18} />
                <span>북마크</span>
              </button>
              <button className="sidebar-explore-btn" onClick={() => console.log('설정 클릭')}>
                <img src="/icons/settings.svg" alt="settings" width={18} height={18} />
                <span>설정</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
