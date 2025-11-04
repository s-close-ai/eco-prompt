import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppShell } from '@/context/AppShellContext';
import useDeviceMode from '@/hooks/useDeviceMode';
import '@/styles/components/common/sidebar.css';
import { mockProjectList, mockChatList } from '@/data/mockData';
import { ICON_SIZE } from '@/constants/ui';

export default function Sidebar() {
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const { isSidebarOpen, closeSidebar, isSidebarCollapsed, toggleSidebarCollapsed, toggleSidebar } =
    useAppShell();
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
  const [longPressTimer, setLongPressTimer] = useState<Map<number, number>>(new Map());
  const menuRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // 포털 내부 클릭은 무시
      if (projectMoveMenuRef.current && projectMoveMenuRef.current.contains(target)) {
        return;
      }
      
      // 프로젝트 메뉴 닫기
      openProjectMenus.forEach((projectId) => {
        const menuRef = menuRefs.current.get(projectId);
        if (menuRef && !menuRef.contains(target)) {
          setOpenProjectMenus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(projectId);
            return newSet;
          });
        }
      });

      // 채팅 메뉴 닫기
      openChatMenus.forEach((chatId) => {
        const menuRef = menuRefs.current.get(chatId + 10000);
        if (menuRef && !menuRef.contains(target)) {
          setOpenChatMenus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
          setProjectMoveMenu(null);
        }
      });

      // 중첩 채팅 메뉴 닫기
      openNestedChatMenus.forEach((chatId) => {
        const menuRef = menuRefs.current.get(chatId + 20000);
        if (menuRef && !menuRef.contains(target)) {
          setOpenNestedChatMenus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
          setProjectMoveMenu(null);
        }
      });
      // 포털 자체 닫기 (사이드바 외부 클릭 포함)
      if (projectMoveMenu) {
        setProjectMoveMenu(null);
      }
    };

    if (
      openProjectMenus.size > 0 ||
      openChatMenus.size > 0 ||
      openNestedChatMenus.size > 0 ||
      projectMoveMenu
    ) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [openProjectMenus, openChatMenus, openNestedChatMenus, projectMoveMenu]);

  // 스크롤/리사이즈 시 포털 닫기
  useEffect(() => {
    if (!projectMoveMenu) return;
    const close = () => setProjectMoveMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [projectMoveMenu]);
  
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
    window.dispatchEvent(new CustomEvent('project-create-close'));
    navigate('/project', { state: { projectId } });
  };

  const toggleProjectMenu = (projectId: number) => {
    setOpenProjectMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleChatMenu = (chatId: number) => {
    setOpenChatMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const handleProjectMenuLongPress = (projectId: number, e: React.MouseEvent | React.TouchEvent) => {
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
    setOpenProjectMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(projectId);
      return newSet;
    });
    // TODO: 실제 액션 구현
    console.log(`Project ${projectId} ${action}`);
  };

  const toggleNestedChatMenu = (chatId: number) => {
    setOpenNestedChatMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const handleNestedChatMenuLongPress = (chatId: number, e: React.MouseEvent | React.TouchEvent) => {
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
    setOpenNestedChatMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    // TODO: 실제 액션 구현
    console.log(`Nested Chat ${chatId} ${action}`);
  };

  const handleChatMenuAction = (chatId: number, action: 'rename' | 'delete') => {
    setOpenChatMenus((prev) => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
    // TODO: 실제 액션 구현
    console.log(`Chat ${chatId} ${action}`);
  };

  const handleMoveToProject = (chatId: number, targetProjectId: number, currentProjectId?: number) => {
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
    console.log(`Chat ${chatId} moved to project ${targetProjectId} from ${currentProjectId || 'none'}`);
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
    // 태블릿 모드에서 사이드바 클릭 시 프로젝트 생성 카드 닫기
    if (mode === 'tablet') {
      window.dispatchEvent(new CustomEvent('project-create-close'));
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
              onClick={toggleSidebarCollapsed}
              aria-label="사이드바 열기"
            >
              <img src="/logo/ngb_logo_png.png" alt="로고" className="sidebar-logo-icon" />
            </button>

            <div className="sidebar-collapsed-icons">
              <button
                className="sidebar-icon-btn"
                aria-label="검색"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('project-create-close'));
                  console.log('검색 버튼 클릭');
                }}
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
                onClick={() => window.dispatchEvent(new CustomEvent('project-create-open'))}
              >
                <img src="/icons/add_folder.svg" alt="add folder" width={20} height={20} />
              </button>
            </div>

            <div className="sidebar-collapsed-footer">
              <button
                className="sidebar-icon-btn"
                aria-label="대시보드"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('project-create-close'));
                  navigate('/?tab=dashboard');
                }}
              >
                <img src="/icons/dashboard.svg" alt="dashboard" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="북마크"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('project-create-close'));
                  console.log('북마크 클릭');
                }}
              >
                <img src="/icons/bookmark.svg" alt="bookmark" width={20} height={20} />
              </button>
              <button
                className="sidebar-icon-btn"
                aria-label="설정"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('project-create-close'));
                  navigate('/settings');
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
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('project-create-close'));
                  if (mode === 'mobile') {
                    closeSidebar();
                  }
                  console.log('검색 버튼 클릭');
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
                    window.dispatchEvent(new CustomEvent('project-create-close'));
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
                    console.log('새 채팅 생성');
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
                    window.dispatchEvent(new CustomEvent('project-create-open'));
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
                            onMouseDown={(e) => mode !== 'desktop' && handleProjectMenuLongPress(project.id, e)}
                            onTouchStart={(e) => mode !== 'desktop' && handleProjectMenuLongPress(project.id, e)}
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
                                toggleProjectMenu(project.id);
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
                            {isMenuOpen && (
                              <div className="sidebar-list-item-menu" role="menu">
                                <button
                                  className="sidebar-list-item-menu-item"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleProjectMenuAction(project.id, 'rename');
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
                                    handleProjectMenuAction(project.id, 'delete');
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
                              </div>
                            )}
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
                                        console.log('채팅 선택:', chat.title);
                                      }}
                                      onMouseDown={(e) => mode !== 'desktop' && handleNestedChatMenuLongPress(chat.id, e)}
                                      onTouchStart={(e) => mode !== 'desktop' && handleNestedChatMenuLongPress(chat.id, e)}
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
                                          toggleNestedChatMenu(chat.id);
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
                                      {isNestedMenuOpen && (
                                        <div className="sidebar-list-item-menu" role="menu">
                                          <button
                                            className="sidebar-list-item-menu-item"
                                            role="menuitem"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleNestedChatMenuAction(chat.id, 'rename');
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
                                                openProjectMovePortal(chat.id, e.currentTarget as HTMLElement, project.id);
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
                                              handleNestedChatMenuAction(chat.id, 'delete');
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
                                        </div>
                                      )}
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
                              console.log('채팅 선택:', chat.title);
                            }}
                            onMouseDown={(e) => mode !== 'desktop' && handleChatMenuLongPress(chat.id, e)}
                            onTouchStart={(e) => mode !== 'desktop' && handleChatMenuLongPress(chat.id, e)}
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
                                toggleChatMenu(chat.id);
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
                            {isMenuOpen && (
                              <div className="sidebar-list-item-menu" role="menu">
                                <button
                                  className="sidebar-list-item-menu-item"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleChatMenuAction(chat.id, 'rename');
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
                                      openProjectMovePortal(chat.id, e.currentTarget as HTMLElement);
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
                                    handleChatMenuAction(chat.id, 'delete');
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
                              </div>
                            )}
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
                  window.dispatchEvent(new CustomEvent('project-create-close'));
                  navigate('/?tab=dashboard');
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
                  window.dispatchEvent(new CustomEvent('project-create-close'));
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
                  window.dispatchEvent(new CustomEvent('project-create-close'));
                  navigate('/settings');
                }}
              >
                <img src="/icons/settings.svg" alt="settings" width={18} height={18} />
                <span>설정</span>
              </button>
            </div>
          </div>
        )}
      </aside>
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
                  handleMoveToProject(projectMoveMenu.chatId, p.id, projectMoveMenu.filterProjectId);
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
