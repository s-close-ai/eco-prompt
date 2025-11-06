import { useEffect } from 'react';
import '@/styles/components/common/sidebar/index.css';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import { useSidebarData } from '@/hooks/useSidebarData';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ICON_SIZE } from '@/constants/ui';

// 분리된 자식 컴포넌트들 임포트
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import { SidebarCollapsed } from './SidebarCollapsed';
import { ProjectList } from './ProjectList';
import { ChatList } from './ChatList';
import { ContextMenu } from './ContextMenu';

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

  // 사이드바 데이터 로딩 훅
  const {
    data: sidebarData,
    isLoading: isDataLoading,
    loadInitialData,
    loadMoreProjectChats,
    loadMoreGeneralChats,
  } = useSidebarData();

  // 컨텍스트 메뉴 관리 훅
  const { openMenus, toggleMenu, closeMenu, getMenuProps } = useContextMenu();

  // 초기 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 메뉴 액션 핸들러 (이름 바꾸기, 삭제 등)
  const handleMenuAction = (menuId: string, action: string) => {
    console.log(`Action: ${action} on ${menuId}`);
    closeMenu(menuId);
  };

  const isOpen = mode === 'desktop' || isSidebarOpen;
  const isCollapsed = mode === 'desktop' && isSidebarCollapsed;

  // --- 메뉴 렌더링 로직 ---
  const renderProjectMenu = (id: number, position: { top: number; left: number }) => (
    <ContextMenu
      key={`${PROJECT_MENU_PREFIX}${id}`}
      position={position}
      menuProps={getMenuProps(`${PROJECT_MENU_PREFIX}${id}`)}
    >
      <button
        className="sidebar-list-item-menu-item"
        onClick={() => handleMenuAction(`${PROJECT_MENU_PREFIX}${id}`, 'rename')}
      >
        <img
          src="/icons/edit.svg"
          alt=""
          width={ICON_SIZE.SM}
          height={ICON_SIZE.SM}
          aria-hidden="true"
        />
        <span>이름 바꾸기</span>
      </button>
      <button
        className="sidebar-list-item-menu-item"
        onClick={() => handleMenuAction(`${PROJECT_MENU_PREFIX}${id}`, 'delete')}
      >
        <img
          src="/icons/delete.svg"
          alt=""
          width={ICON_SIZE.SM}
          height={ICON_SIZE.SM}
          aria-hidden="true"
        />
        <span>프로젝트 삭제</span>
      </button>
    </ContextMenu>
  );

  const renderChatMenu = (
    id: number,
    position: { top: number; left: number },
    isNested = false,
  ) => {
    const menuId = `${isNested ? NESTED_CHAT_MENU_PREFIX : CHAT_MENU_PREFIX}${id}`;
    return (
      <ContextMenu key={menuId} position={position} menuProps={getMenuProps(menuId)}>
        <button
          className="sidebar-list-item-menu-item"
          onClick={() => handleMenuAction(menuId, 'rename')}
        >
          <img
            src="/icons/edit.svg"
            alt=""
            width={ICON_SIZE.SM}
            height={ICON_SIZE.SM}
            aria-hidden="true"
          />
          <span>이름 바꾸기</span>
        </button>
        {/* 프로젝트 이동 메뉴 (추후 구현) */}
        <button
          className="sidebar-list-item-menu-item"
          onClick={() => handleMenuAction(menuId, 'move')}
        >
          <img
            src="/icons/folder.svg"
            alt=""
            width={ICON_SIZE.SM}
            height={ICON_SIZE.SM}
            aria-hidden="true"
          />
          <span>프로젝트 이동</span>
        </button>
        <button
          className="sidebar-list-item-menu-item"
          onClick={() => handleMenuAction(menuId, 'delete')}
        >
          <img
            src="/icons/delete.svg"
            alt=""
            width={ICON_SIZE.SM}
            height={ICON_SIZE.SM}
            aria-hidden="true"
          />
          <span>채팅 삭제</span>
        </button>
      </ContextMenu>
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
            <div className="sidebar-scroll">
              <ProjectList
                projects={sidebarData.projects}
                onLoadMoreChats={loadMoreProjectChats}
                onMenuToggle={(projectId, e) =>
                  toggleMenu(`${PROJECT_MENU_PREFIX}${projectId}`, e.currentTarget as HTMLElement)
                }
                onNestedMenuToggle={(chatId, e) =>
                  toggleMenu(`${NESTED_CHAT_MENU_PREFIX}${chatId}`, e.currentTarget as HTMLElement)
                }
              />
              <ChatList
                title="채팅"
                chats={sidebarData.generalChats}
                hasMore={sidebarData.generalChatsHasMore}
                isLoading={isDataLoading}
                onLoadMore={loadMoreGeneralChats}
                onMenuToggle={(chatId, e) =>
                  toggleMenu(`${CHAT_MENU_PREFIX}${chatId}`, e.currentTarget as HTMLElement)
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
