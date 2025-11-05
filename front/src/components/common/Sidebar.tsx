import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import '@/styles/components/common/sidebar.css';
import { mockProjectList, mockChatList } from '@/data/mockData';
import { ICON_SIZE } from '@/constants/ui';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = useDeviceMode();
  const {
    isSidebarOpen,
    closeSidebar,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    toggleSidebar,
    toggleSettings,
    toggleSearch,
  } = useAppShell();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [openProjectMenus, setOpenProjectMenus] = useState<Set<number>>(new Set());
  const [openChatMenus, setOpenChatMenus] = useState<Set<number>>(new Set());
  const [openNestedChatMenus, setOpenNestedChatMenus] = useState<Set<number>>(new Set());
  const [projectMoveMenu, setProjectMoveMenu] = useState<{
    chatId: number;
    top: number;
    left: number;
    filterProjectId?: number;
  } | null>(null);
  const projectMoveMenuRef = useRef<HTMLDivElement | null>(null);

  // 포털로 렌더링할 메뉴 위치 정보
  const [projectMenus, setProjectMenus] = useState<Map<number, { top: number; left: number }>>(
    new Map(),
  );
  const [chatMenus, setChatMenus] = useState<Map<number, { top: number; left: number }>>(new Map());
  const [nestedChatMenus, setNestedChatMenus] = useState<
    Map<number, { top: number; left: number }>
  >(new Map());
  const projectMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const chatMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const nestedChatMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [longPressTimer, setLongPressTimer] = useState<Map<number, number>>(new Map());
  const menuRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 모든 오버레이 닫기 헬퍼 함수
  const closeAllOverlays = () => {
    window.dispatchEvent(new CustomEvent('project-create-close'));
    window.dispatchEvent(new CustomEvent('settings-close'));
  };

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // 포털 내부 클릭은 무시
      if (projectMoveMenuRef.current && projectMoveMenuRef.current.contains(target)) {
        return;
      }

      // 프로젝트 메뉴 닫기 - 메뉴 외부 클릭 시 닫기
      openProjectMenus.forEach((projectId) => {
        const menuRef = projectMenuRefs.current.get(projectId);
        const triggerRef = menuRefs.current.get(projectId);
        // 메뉴 외부를 클릭했고, 트리거 버튼도 아닌 경우
        if (
          menuRef &&
          !menuRef.contains(target) &&
          triggerRef &&
          !triggerRef.contains(target)
        ) {
          setOpenProjectMenus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(projectId);
            return newSet;
          });
          setProjectMenus((prevMenus) => {
            const newMenus = new Map(prevMenus);
            newMenus.delete(projectId);
            return newMenus;
          });
        }
      });

      // 채팅 메뉴 닫기 - 메뉴 외부 클릭 시 닫기
      openChatMenus.forEach((chatId) => {
        const menuRef = chatMenuRefs.current.get(chatId);
        const triggerRef = menuRefs.current.get(chatId + 10000);
        // 메뉴 외부를 클릭했고, 트리거 버튼도 아닌 경우
        if (
          menuRef &&
          !menuRef.contains(target) &&
          triggerRef &&
          !triggerRef.contains(target)
        ) {
          setOpenChatMenus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
          setChatMenus((prevMenus) => {
            const newMenus = new Map(prevMenus);
            newMenus.delete(chatId);
            return newMenus;
          });
          setProjectMoveMenu(null);
        }
      });

      // 중첩 채팅 메뉴 닫기 - 메뉴 외부 클릭 시 닫기
      openNestedChatMenus.forEach((chatId) => {
        const menuRef = nestedChatMenuRefs.current.get(chatId);
        const triggerRef = menuRefs.current.get(chatId + 20000);
        // 메뉴 외부를 클릭했고, 트리거 버튼도 아닌 경우
        if (
          menuRef &&
          !menuRef.contains(target) &&
          triggerRef &&
          !triggerRef.contains(target)
        ) {
          setOpenNestedChatMenus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
          setNestedChatMenus((prevMenus) => {
            const newMenus = new Map(prevMenus);
            newMenus.delete(chatId);
            return newMenus;
          });
          setProjectMoveMenu(null);
        }
      });

      // 프로젝트 이동 포털 닫기 - 포털 외부 클릭 시 닫기
      if (projectMoveMenu && projectMoveMenuRef.current && !projectMoveMenuRef.current.contains(target)) {
        setProjectMoveMenu(null);
      }
    };

    if (
      openProjectMenus.size > 0 ||
      openChatMenus.size > 0 ||
      openNestedChatMenus.size > 0 ||
      projectMoveMenu
    ) {
      // capture phase에서 이벤트를 먼저 처리하여 메뉴가 확실히 닫히도록 함
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('touchstart', handleClickOutside, true);
      };
    }
  }, [openProjectMenus, openChatMenus, openNestedChatMenus, projectMoveMenu]);

  // 스크롤/리사이즈 시 포털 닫기
  useEffect(() => {
    const closeAllMenus = () => {
      setProjectMoveMenu(null);
      setOpenProjectMenus(new Set());
      setOpenChatMenus(new Set());
      setOpenNestedChatMenus(new Set());
      setProjectMenus(new Map());
      setChatMenus(new Map());
      setNestedChatMenus(new Map());
    };
    window.addEventListener('scroll', closeAllMenus, true);
    window.addEventListener('resize', closeAllMenus);
    return () => {
      window.removeEventListener('scroll', closeAllMenus, true);
      window.removeEventListener('resize', closeAllMenus);
    };
  }, []);

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

  const handleProjectNameClick = (projectId: number) => {
    if (mode === 'mobile') {
      closeSidebar();
    }
    closeAllOverlays();
    navigate('/project', { state: { projectId } });
  };

  const toggleProjectMenu = (projectId: number, anchorEl?: HTMLElement) => {
    setOpenProjectMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
        setProjectMenus((prevMenus) => {
          const newMenus = new Map(prevMenus);
          newMenus.delete(projectId);
          return newMenus;
        });
      } else {
        newSet.add(projectId);
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect();
          const top = rect.bottom + 8;
          const left = rect.right - 170; // 메뉴 너비만큼 왼쪽으로
          setProjectMenus((prevMenus) => {
            const newMenus = new Map(prevMenus);
            newMenus.set(projectId, { top, left });
            return newMenus;
          });
        }
      }
      return newSet;
    });
  };

  const toggleChatMenu = (chatId: number, anchorEl?: HTMLElement) => {
    setOpenChatMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
        setChatMenus((prevMenus) => {
          const newMenus = new Map(prevMenus);
          newMenus.delete(chatId);
          return newMenus;
        });
      } else {
        newSet.add(chatId);
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect();
          const top = rect.bottom + 8;
          const left = rect.right - 170; // 메뉴 너비만큼 왼쪽으로
          setChatMenus((prevMenus) => {
            const newMenus = new Map(prevMenus);
            newMenus.set(chatId, { top, left });
            return newMenus;
          });
        }
      }
      return newSet;
    });
  };

  const handleProjectMenuLongPress = (
    projectId: number,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    if (mode === 'desktop') return;

    const timer = setTimeout(() => {
      toggleProjectMenu(projectId);
    }, 500);

    const currentTimer = longPressTimer.get(projectId);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    setLongPressTimer((prev) => {
      const newMap = new Map(prev);
      newMap.set(projectId, timer);
      return newMap;
    });

    const cancelLongPress = () => {
      const timer = longPressTimer.get(projectId);
      if (timer) {
        clearTimeout(timer);
        setLongPressTimer((prev) => {
          const newMap = new Map(prev);
          newMap.delete(projectId);
          return newMap;
        });
      }
    };

    if (e.type === 'mousedown') {
      document.addEventListener('mouseup', cancelLongPress, { once: true });
      document.addEventListener('mousemove', cancelLongPress, { once: true });
    } else if (e.type === 'touchstart') {
      document.addEventListener('touchend', cancelLongPress, { once: true });
      document.addEventListener('touchmove', cancelLongPress, { once: true });
    }
  };

  const handleChatMenuLongPress = (chatId: number, e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'desktop') return;

    const timer = setTimeout(() => {
      toggleChatMenu(chatId);
    }, 500);

    const currentTimer = longPressTimer.get(chatId);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    setLongPressTimer((prev) => {
      const newMap = new Map(prev);
      newMap.set(chatId, timer);
      return newMap;
    });

    const cancelLongPress = () => {
      const timer = longPressTimer.get(chatId);
      if (timer) {
        clearTimeout(timer);
        setLongPressTimer((prev) => {
          const newMap = new Map(prev);
          newMap.delete(chatId);
          return newMap;
        });
      }
    };

    if (e.type === 'mousedown') {
      document.addEventListener('mouseup', cancelLongPress, { once: true });
      document.addEventListener('mousemove', cancelLongPress, { once: true });
    } else if (e.type === 'touchstart') {
      document.addEventListener('touchend', cancelLongPress, { once: true });
      document.addEventListener('touchmove', cancelLongPress, { once: true });
    }
  };

  const handleProjectMenuAction = (projectId: number, action: 'rename' | 'delete') => {
    // 메뉴 닫기 - 모든 상태 정리
    setOpenProjectMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(projectId);
      return newSet;
    });
    setProjectMenus((prevMenus) => {
      const newMenus = new Map(prevMenus);
      newMenus.delete(projectId);
      return newMenus;
    });
    // TODO: 실제 액션 구현
    console.log(`Project ${projectId} ${action}`);
  };

  const toggleNestedChatMenu = (chatId: number, anchorEl?: HTMLElement) => {
    setOpenNestedChatMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
        setNestedChatMenus((prevMenus) => {
          const newMenus = new Map(prevMenus);
          newMenus.delete(chatId);
          return newMenus;
        });
      } else {
        newSet.add(chatId);
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect();
          const top = rect.bottom + 8;
          const left = rect.right - 170; // 메뉴 너비만큼 왼쪽으로
          setNestedChatMenus((prevMenus) => {
            const newMenus = new Map(prevMenus);
            newMenus.set(chatId, { top, left });
            return newMenus;
          });
        }
      }
      return newSet;
    });
  };

  const handleNestedChatMenuLongPress = (
    chatId: number,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    if (mode === 'desktop') return;

    const timer = setTimeout(() => {
      toggleNestedChatMenu(chatId);
    }, 500);

    const currentTimer = longPressTimer.get(chatId + 20000);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    setLongPressTimer((prev) => {
      const newMap = new Map(prev);
      newMap.set(chatId + 20000, timer);
      return newMap;
    });

    const cancelLongPress = () => {
      const timer = longPressTimer.get(chatId + 20000);
      if (timer) {
        clearTimeout(timer);
        setLongPressTimer((prev) => {
          const newMap = new Map(prev);
          newMap.delete(chatId + 20000);
          return newMap;
        });
      }
    };

    if (e.type === 'mousedown') {
      document.addEventListener('mouseup', cancelLongPress, { once: true });
      document.addEventListener('mousemove', cancelLongPress, { once: true });
    } else if (e.type === 'touchstart') {
      document.addEventListener('touchend', cancelLongPress, { once: true });
      document.addEventListener('touchmove', cancelLongPress, { once: true });
    }
  };

  const handleNestedChatMenuAction = (chatId: number, action: 'rename' | 'delete') => {
    // 메뉴 닫기 - 모든 상태 정리
    setOpenNestedChatMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    setNestedChatMenus((prevMenus) => {
      const newMenus = new Map(prevMenus);
      newMenus.delete(chatId);
      return newMenus;
    });
    setProjectMoveMenu(null); // 프로젝트 이동 포털도 닫기
    // TODO: 실제 액션 구현
    console.log(`Nested Chat ${chatId} ${action}`);
  };

  const handleChatMenuAction = (chatId: number, action: 'rename' | 'delete') => {
    // 메뉴 닫기 - 모든 상태 정리
    setOpenChatMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    setChatMenus((prevMenus) => {
      const newMenus = new Map(prevMenus);
      newMenus.delete(chatId);
      return newMenus;
    });
    setProjectMoveMenu(null); // 프로젝트 이동 포털도 닫기
    // TODO: 실제 액션 구현
    console.log(`Chat ${chatId} ${action}`);
  };

  const handleMoveToProject = (
    chatId: number,
    targetProjectId: number,
    currentProjectId?: number,
  ) => {
    setProjectMoveMenu(null);
    setOpenChatMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    setOpenNestedChatMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    // TODO: 실제 프로젝트 이동 구현
    console.log(
      `Chat ${chatId} moved to project ${targetProjectId} from ${currentProjectId || 'none'}`,
    );
  };

  const openProjectMovePortal = (
    chatId: number,
    anchorEl: HTMLElement,
    filterProjectId?: number,
  ) => {
    const rect = anchorEl.getBoundingClientRect();
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - 248)); // 8px padding, submenu max 240+8
    const left = rect.right + 8; // 사이드바 오른쪽으로 띄움
    setProjectMoveMenu({ chatId, top, left, filterProjectId });
  };

  const handleSidebarClick = () => {
    // 태블릿 모드에서 사이드바 클릭 시 모든 오버레이 닫기
    if (mode === 'tablet') {
      closeAllOverlays();
    }
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
      <aside
        className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        onClick={handleSidebarClick}
      >
        {/* 접힌 상태 - 데스크탑 전용 */}
        {isCollapsed && (
          <div className="sidebar-collapsed" onClick={(e) => e.stopPropagation()}>
            <button
              className="sidebar-logo-btn"
              onClick={() => {
                closeAllOverlays();
                toggleSidebarCollapsed();
              }}
              aria-label="사이드바 열기"
            >
              <img src="/logo/ngb_logo_png.png" alt="로고" className="sidebar-logo-icon" />
            </button>

            <div className="sidebar-collapsed-icons">
              <button
                className="sidebar-icon-btn"
                aria-label="검색"
                onClick={() => {
                  closeAllOverlays();
                  toggleSearch();
                }}
              >
                <img src="/icons/search.svg" alt="search" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="새 채팅"
                onClick={() => navigate('/')}
              >
                <img src="/icons/add_chat.svg" alt="add chat" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="새 프로젝트"
                onClick={() => window.dispatchEvent(new CustomEvent('project-create-toggle'))}
              >
                <img src="/icons/add_folder.svg" alt="add folder" width={20} height={20} />
              </button>
            </div>

            <div className="sidebar-collapsed-footer">
              <button
                className="sidebar-icon-btn"
                aria-label="대시보드"
                onClick={() => {
                  closeAllOverlays();
                  navigate('/dashboard/ranking');
                }}
              >
                <img src="/icons/dashboard.svg" alt="dashboard" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="북마크"
                onClick={() => {
                  closeAllOverlays();
                  navigate('/bookmark');
                }}
              >
                <img src="/icons/bookmark.svg" alt="bookmark" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="설정"
                onClick={() => {
                  if (mode === 'desktop') {
                    toggleSettings();
                  } else {
                    closeAllOverlays();
                    const targetPath = '/settings';
                    if (location.pathname !== targetPath) {
                      navigate(targetPath);
                    }
                  }
                }}
              >
                <img src="/icons/settings.svg" alt="settings" width={20} height={20} />
              </button>
            </div>
          </div>
        )}

        {/* 펼쳐진 상태 */}
        {!isCollapsed && (
          <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
            {/* 상단 고정 영역 */}
            <div className="sidebar-header">
              <div className="sidebar-header-top">
                <div className="sidebar-logo" onClick={() => navigate('/')}>
                  <img
                    src="/logo/header_img.png"
                    alt="Eco Prompt"
                    style={{ width: '150px', height: 'auto' }}
                  />
                </div>
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

              {/* 검색창 - 데스크탑은 버튼, 모바일/태블릿은 입력창 */}
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

              <label className="sidebar-search sidebar-search-mobile">
                <img src="/icons/search.svg" alt="search" width={18} height={18} />
                <input
                  type="text"
                  placeholder="검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    closeAllOverlays();
                  }}
                />
              </label>

              {/* 새 채팅/새 프로젝트 버튼 */}
              <div className="sidebar-actions">
                <button
                  className="sidebar-action-btn"
                  onClick={() => {
                    if (mode === 'mobile') {
                      closeSidebar();
                    }
                    navigate('/');
                  }}
                >
                  <img src="/icons/add_chat.svg" alt="add chat" width={18} height={18} />
                  <span>새 채팅</span>
                </button>
                <button
                  className="sidebar-action-btn"
                  onClick={() => {
                    if (mode === 'mobile') {
                      closeSidebar();
                    }
                    window.dispatchEvent(new CustomEvent('project-create-toggle'));
                  }}
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
                    const isMenuOpen = openProjectMenus.has(project.id);

                    return (
                      <li key={project.id}>
                        <div className="sidebar-list-item sidebar-list-item-project">
                          <button
                            className="sidebar-list-item-icon-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleProject(project.id);
                            }}
                            aria-label={isExpanded ? '채팅 목록 접기' : '채팅 목록 열기'}
                          >
                            <img
                              src={isExpanded ? '/icons/folder_open.svg' : '/icons/folder.svg'}
                              alt="folder"
                              width={18}
                              height={18}
                            />
                          </button>
                          <button
                            className="sidebar-list-item-text-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleProjectNameClick(project.id);
                            }}
                            onMouseDown={(e) =>
                              mode !== 'desktop' && handleProjectMenuLongPress(project.id, e)
                            }
                            onTouchStart={(e) =>
                              mode !== 'desktop' && handleProjectMenuLongPress(project.id, e)
                            }
                          >
                            <span className="sidebar-list-item-text">{project.title}</span>
                          </button>
                          <div
                            className="sidebar-list-item-menu-wrapper"
                            ref={(el) => {
                              if (el) {
                                menuRefs.current.set(project.id, el);
                              } else {
                                menuRefs.current.delete(project.id);
                              }
                            }}
                          >
                            <button
                              className="sidebar-list-item-menu-btn"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleProjectMenu(project.id, e.currentTarget);
                              }}
                              aria-label="프로젝트 메뉴"
                              aria-expanded={isMenuOpen}
                            >
                              <img
                                src="/icons/more_detail.svg"
                                alt=""
                                width={ICON_SIZE.SM}
                                height={ICON_SIZE.SM}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <ul className="sidebar-nested-list">
                            {project.chats.map((chat) => {
                              const isNestedMenuOpen = openNestedChatMenus.has(chat.id);

                              return (
                                <li key={chat.id}>
                                  <div className="sidebar-list-item sidebar-list-item-chat sidebar-nested-item">
                                    <button
                                      className="sidebar-list-item-text-btn sidebar-list-item-text-btn-chat"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (mode === 'mobile') {
                                          closeSidebar();
                                        }
                                        navigate(`/chat/mock/${chat.id}`);
                                      }}
                                      onMouseDown={(e) =>
                                        mode !== 'desktop' &&
                                        handleNestedChatMenuLongPress(chat.id, e)
                                      }
                                      onTouchStart={(e) =>
                                        mode !== 'desktop' &&
                                        handleNestedChatMenuLongPress(chat.id, e)
                                      }
                                    >
                                      <span className="sidebar-list-item-text">{chat.title}</span>
                                    </button>
                                    <div
                                      className="sidebar-list-item-menu-wrapper"
                                      ref={(el) => {
                                        if (el) {
                                          menuRefs.current.set(chat.id + 20000, el);
                                        } else {
                                          menuRefs.current.delete(chat.id + 20000);
                                        }
                                      }}
                                    >
                                      <button
                                        className="sidebar-list-item-menu-btn"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          toggleNestedChatMenu(chat.id, e.currentTarget);
                                        }}
                                        aria-label="채팅 메뉴"
                                        aria-expanded={isNestedMenuOpen}
                                      >
                                        <img
                                          src="/icons/more_detail.svg"
                                          alt=""
                                          width={ICON_SIZE.SM}
                                          height={ICON_SIZE.SM}
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
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
                  {mockChatList.map((chat) => {
                    const isMenuOpen = openChatMenus.has(chat.id);

                    return (
                      <li key={chat.id}>
                        <div className="sidebar-list-item sidebar-list-item-chat">
                          <button
                            className="sidebar-list-item-text-btn sidebar-list-item-text-btn-chat"
                            onClick={() => {
                              if (mode === 'mobile') {
                                closeSidebar();
                              }
                              navigate(`/chat/mock/${chat.id}`);
                            }}
                            onMouseDown={(e) =>
                              mode !== 'desktop' && handleChatMenuLongPress(chat.id, e)
                            }
                            onTouchStart={(e) =>
                              mode !== 'desktop' && handleChatMenuLongPress(chat.id, e)
                            }
                          >
                            <span className="sidebar-list-item-text">{chat.title}</span>
                          </button>
                          <div
                            className="sidebar-list-item-menu-wrapper"
                            ref={(el) => {
                              if (el) {
                                menuRefs.current.set(chat.id + 10000, el); // 채팅 ID와 구분하기 위해 오프셋 사용
                              } else {
                                menuRefs.current.delete(chat.id + 10000);
                              }
                            }}
                          >
                            <button
                              className="sidebar-list-item-menu-btn"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleChatMenu(chat.id, e.currentTarget);
                              }}
                              aria-label="채팅 메뉴"
                              aria-expanded={isMenuOpen}
                            >
                              <img
                                src="/icons/more_detail.svg"
                                alt=""
                                width={ICON_SIZE.SM}
                                height={ICON_SIZE.SM}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* 하단 고정 영역 */}
            <div className="sidebar-footer">
              <button
                className="sidebar-explore-btn"
                onClick={() => {
                  if (mode === 'mobile') {
                    closeSidebar();
                  }
                  closeAllOverlays();
                  navigate('/dashboard/ranking');
                }}
              >
                <img src="/icons/dashboard.svg" alt="dashboard" width={18} height={18} />
                <span>대시보드</span>
              </button>
              <button
                className="sidebar-explore-btn"
                onClick={() => {
                  if (mode === 'mobile') {
                    closeSidebar();
                  }
                  closeAllOverlays();
                  navigate('/bookmark');
                }}
              >
                <img src="/icons/bookmark.svg" alt="bookmark" width={18} height={18} />
                <span>북마크</span>
              </button>
              <button
                className="sidebar-explore-btn"
                onClick={() => {
                  if (mode === 'mobile') {
                    closeSidebar();
                  }
                  if (mode === 'desktop') {
                    toggleSettings();
                  } else {
                    closeAllOverlays();
                    const targetPath = '/settings';
                    if (location.pathname !== targetPath) {
                      navigate(targetPath);
                    }
                  }
                }}
              >
                <img src="/icons/settings.svg" alt="settings" width={18} height={18} />
                <span>설정</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* 프로젝트 메뉴 포털 */}
      {Array.from(projectMenus.entries()).map(([projectId, position]) => {
        const project = mockProjectList.find((p) => p.id === projectId);
        if (!project) return null;
        return createPortal(
          <div
            key={projectId}
            className="sidebar-list-item-menu"
            ref={(el) => {
              if (el) {
                projectMenuRefs.current.set(projectId, el);
              } else {
                projectMenuRefs.current.delete(projectId);
              }
            }}
            role="menu"
            style={{ top: position.top, left: position.left }}
          >
            <button
              className="sidebar-list-item-menu-item"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleProjectMenuAction(projectId, 'rename');
              }}
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
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleProjectMenuAction(projectId, 'delete');
              }}
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
          </div>,
          document.body,
        );
      })}

      {/* 채팅 메뉴 포털 */}
      {Array.from(chatMenus.entries()).map(([chatId, position]) => {
        const chat = mockChatList.find((c) => c.id === chatId);
        if (!chat) return null;
        return createPortal(
          <div
            key={chatId}
            className="sidebar-list-item-menu"
            ref={(el) => {
              if (el) {
                chatMenuRefs.current.set(chatId, el);
              } else {
                chatMenuRefs.current.delete(chatId);
              }
            }}
            role="menu"
            style={{ top: position.top, left: position.left }}
          >
            <button
              className="sidebar-list-item-menu-item"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleChatMenuAction(chatId, 'rename');
              }}
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
            <div className="sidebar-list-item-menu-item sidebar-list-item-menu-item-with-submenu">
              <button
                className="sidebar-list-item-menu-item-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openProjectMovePortal(chatId, e.currentTarget as HTMLElement);
                }}
              >
                <img
                  src="/icons/folder.svg"
                  alt=""
                  width={ICON_SIZE.SM}
                  height={ICON_SIZE.SM}
                  aria-hidden="true"
                />
                <span>프로젝트 이동</span>
                <img
                  src="/icons/chevron.svg"
                  alt=""
                  width={ICON_SIZE.SM}
                  height={ICON_SIZE.SM}
                  className="sidebar-list-item-menu-item-chevron"
                  aria-hidden="true"
                />
              </button>
            </div>
            <button
              className="sidebar-list-item-menu-item"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleChatMenuAction(chatId, 'delete');
              }}
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
          </div>,
          document.body,
        );
      })}

      {/* 중첩 채팅 메뉴 포털 */}
      {Array.from(nestedChatMenus.entries()).map(([chatId, position]) => {
        const allChats = mockProjectList.flatMap((p) => p.chats);
        const chat = allChats.find((c) => c.id === chatId);
        if (!chat) return null;
        const project = mockProjectList.find((p) => p.chats.some((c) => c.id === chatId));
        return createPortal(
          <div
            key={chatId}
            className="sidebar-list-item-menu"
            ref={(el) => {
              if (el) {
                nestedChatMenuRefs.current.set(chatId, el);
              } else {
                nestedChatMenuRefs.current.delete(chatId);
              }
            }}
            role="menu"
            style={{ top: position.top, left: position.left }}
          >
            <button
              className="sidebar-list-item-menu-item"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNestedChatMenuAction(chatId, 'rename');
              }}
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
            <div className="sidebar-list-item-menu-item sidebar-list-item-menu-item-with-submenu">
              <button
                className="sidebar-list-item-menu-item-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openProjectMovePortal(chatId, e.currentTarget as HTMLElement, project?.id);
                }}
              >
                <img
                  src="/icons/folder.svg"
                  alt=""
                  width={ICON_SIZE.SM}
                  height={ICON_SIZE.SM}
                  aria-hidden="true"
                />
                <span>프로젝트 이동</span>
                <img
                  src="/icons/chevron.svg"
                  alt=""
                  width={ICON_SIZE.SM}
                  height={ICON_SIZE.SM}
                  className="sidebar-list-item-menu-item-chevron"
                  aria-hidden="true"
                />
              </button>
            </div>
            <button
              className="sidebar-list-item-menu-item"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNestedChatMenuAction(chatId, 'delete');
              }}
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
          </div>,
          document.body,
        );
      })}

      {/* 프로젝트 이동 포털 */}
      {projectMoveMenu &&
        createPortal(
          <div
            className="sidebar-project-move-portal"
            ref={projectMoveMenuRef}
            role="menu"
            style={{ top: projectMoveMenu.top, left: projectMoveMenu.left }}
          >
            {(projectMoveMenu.filterProjectId
              ? mockProjectList.filter((p) => p.id !== projectMoveMenu.filterProjectId)
              : mockProjectList
            ).map((p) => (
              <button
                key={p.id}
                className="sidebar-project-move-portal-item"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleMoveToProject(
                    projectMoveMenu.chatId,
                    p.id,
                    projectMoveMenu.filterProjectId,
                  );
                }}
              >
                <span>{p.title}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
