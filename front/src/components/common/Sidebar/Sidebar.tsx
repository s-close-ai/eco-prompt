import { useEffect, useRef } from 'react';
import '@/styles/components/common/sidebar/index.css';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import { useSidebarData } from '@/hooks/useSidebarData';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useProjectStore } from '@/store/projectStore';

// 분리된 자식 컴포넌트들 임포트
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import { SidebarCollapsed } from './SidebarCollapsed';
import { ProjectList } from './ProjectList';
import { ChatList } from './ChatList';
import { ProjectMenu } from './ProjectMenu';
import { ChatMenu } from './ChatMenu';

// 메뉴 ID를 위한 접두사
const PROJECT_MENU_PREFIX = 'project-';
const CHAT_MENU_PREFIX = 'chat-';
const NESTED_CHAT_MENU_PREFIX = 'nested-chat-';

/**
 * 리팩토링된 사이드바 메인 컴포넌트.
 * 데이터 로딩, 상태 관리, UI 조립의 책임을 가짐.
 */
export function Sidebar() {
  const { isSidebarOpen, closeSidebar, isSidebarCollapsed } = useAppShell();
  const mode = useDeviceMode();
  const { projects, generalChats, defaultProjectId } = useProjectStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 사이드바 데이터 로딩 훅
  const {
    data: sidebarData,
    isLoading: isDataLoading,
    loadInitialData,
    loadMoreProjectChats,
    loadMoreGeneralChats,
    loadMoreProjects,
    projectsHasMore,
  } = useSidebarData();

  // 컨텍스트 메뉴 관리 훅
  const { openMenus, toggleMenu, getMenuProps } = useContextMenu();

  // 초기 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const isOpen = mode === 'desktop' || isSidebarOpen;
  const isCollapsed = mode === 'desktop' && isSidebarCollapsed;

  // --- 메뉴 렌더링 로직 ---
  const renderProjectMenu = (id: number, position: { top: number; left: number }) => {
    const project = projects.find((p) => p.projectId === id);
    if (!project) return null;

    return (
      <ProjectMenu
        key={`${PROJECT_MENU_PREFIX}${id}`}
        projectId={id}
        projectTitle={project.title}
        position={position}
        menuProps={{
          onClose: () => toggleMenu(`${PROJECT_MENU_PREFIX}${id}`, null as unknown as HTMLElement),
          ...getMenuProps(`${PROJECT_MENU_PREFIX}${id}`),
        }}
      />
    );
  };

  const renderChatMenu = (
    id: number,
    position: { top: number; left: number },
    isNested = false,
  ) => {
    const menuId = `${isNested ? NESTED_CHAT_MENU_PREFIX : CHAT_MENU_PREFIX}${id}`;

    // 채팅 정보 찾기
    let chattingTitle = '';
    let currentProjectId = defaultProjectId ?? projects[projects.length - 1].projectId; // 기본값은 전역 상태의 기본 프로젝트 ID

    if (isNested) {
      // 프로젝트 내부의 채팅
      for (const project of projects) {
        const chat = project.chats.find((c) => c.chattingId === id);
        if (chat) {
          chattingTitle = chat.title;
          currentProjectId = project.projectId;
          break;
        }
      }
    } else {
      // 일반 채팅
      const generalChat = generalChats.find((c) => c.chattingId === id);
      if (generalChat) {
        chattingTitle = generalChat.title;
        currentProjectId = defaultProjectId ?? projects[projects.length - 1].projectId;
      }
    }

    return (
      <ChatMenu
        key={menuId}
        chattingId={id}
        chattingTitle={chattingTitle}
        currentProjectId={currentProjectId}
        position={position}
        menuProps={{
          onClose: () => toggleMenu(menuId, null as unknown as HTMLElement),
          ...getMenuProps(menuId),
        }}
      />
    );
  };

  return (
    <>
      {/* 모바일/태블릿 배경 오버레이 */}
      {isSidebarOpen && mode === 'mobile' && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {isCollapsed ? (
          <SidebarCollapsed />
        ) : (
          <div className="sidebar-content">
            <SidebarHeader />
            <div className="sidebar-scroll" ref={scrollContainerRef}>
              <ProjectList
                projects={projects}
                scrollContainer={scrollContainerRef.current}
                hasMore={projectsHasMore}
                isLoading={isDataLoading}
                onLoadMore={loadMoreProjects}
                onLoadMoreChats={loadMoreProjectChats}
                onMenuToggle={(projectId, e) =>
                  toggleMenu(`${PROJECT_MENU_PREFIX}${projectId}`, e.currentTarget as HTMLElement, {
                    direction: 'right',
                  })
                }
                onNestedMenuToggle={(chatId, e) =>
                  toggleMenu(
                    `${NESTED_CHAT_MENU_PREFIX}${chatId}`,
                    e.currentTarget as HTMLElement,
                    { direction: 'right' },
                  )
                }
              />
              <ChatList
                title="채팅"
                chats={generalChats}
                scrollContainer={scrollContainerRef.current}
                hasMore={sidebarData.generalChatsHasMore}
                isLoading={isDataLoading}
                onLoadMore={loadMoreGeneralChats}
                onMenuToggle={(chatId, e) =>
                  toggleMenu(`${CHAT_MENU_PREFIX}${chatId}`, e.currentTarget as HTMLElement, {
                    direction: 'right',
                  })
                }
              />
            </div>
            <SidebarFooter />
          </div>
        )}
      </aside>

      {/* 컨텍스트 메뉴 포털 렌더링 */}
      {Array.from(openMenus.entries()).map(([menuId, position]) => {
        if (typeof menuId === 'string') {
          if (menuId.startsWith(PROJECT_MENU_PREFIX)) {
            const id = Number(menuId.replace(PROJECT_MENU_PREFIX, ''));
            return renderProjectMenu(id, position);
          } else if (menuId.startsWith(CHAT_MENU_PREFIX)) {
            const id = Number(menuId.replace(CHAT_MENU_PREFIX, ''));
            return renderChatMenu(id, position, false);
          } else if (menuId.startsWith(NESTED_CHAT_MENU_PREFIX)) {
            const id = Number(menuId.replace(NESTED_CHAT_MENU_PREFIX, ''));
            return renderChatMenu(id, position, true);
          }
        }
        return null;
      })}
    </>
  );
}
