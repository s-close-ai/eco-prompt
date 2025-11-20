import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatCard from '@/components/project/ChatCard';
import { ICON_SIZE } from '@/constants/ui';
import type { ProjectLocationState } from '@/types/navigation.types';
import '@/styles/pages/project.css';
import { getProject, deleteProject, updateProject } from '@/services/api/project';
import { deleteChatting, updateChattingProject } from '@/services/api/chatting';
import type { ProjectResponse } from '@/types/api/project.types';
import { useProjectStore } from '@/store/projectStore';
import { MenuItem } from '@/components/common/MenuItem';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

export default function Project() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    projects,
    removeProject,
    updateProjectTitle,
    removeChat,
    moveChatToProject,
  } = useProjectStore();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const locationState = location.state as ProjectLocationState | undefined;
  const projectId = locationState?.projectId ?? NaN;
  const [project, setProject] = useState<ProjectResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 초기 프로젝트 데이터 로드
  useEffect(() => {
    if (isNaN(projectId)) {
      setError(new Error('Invalid project ID'));
      setIsLoading(false);
      return;
    }

    const fetchProject = async () => {
      try {
        const response = await getProject(projectId);
        setProject(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // projectStore 상태를 기반으로 로컬 project state 동기화
  useEffect(() => {
    if (isNaN(projectId)) return;

    const storeProject = projects.find((p) => p.projectId === projectId);
    if (storeProject) {
      setProject((prev) => {
        if (!prev) return null;

        // 기존 채팅 목록을 유지하면서, storeProject에 있는 채팅의 제목만 업데이트
        const updatedChats = prev.chattingResponses.map((chat) => {
          const storeChat = storeProject.chats.find((c) => c.chattingId === chat.chattingId);
          if (storeChat && chat.title !== storeChat.title) {
            // storeProject에 있는 채팅은 제목 업데이트
            return { ...chat, title: storeChat.title };
          }
          return chat;
        });

        // 실제 변경사항이 있을 때만 업데이트 (무한 루프 방지)
        const titleChanged = prev.title !== storeProject.title;
        const chatsChanged = updatedChats.some((chat, index) => {
          return chat.title !== prev.chattingResponses[index].title;
        });

        if (titleChanged || chatsChanged) {
          return {
            ...prev,
            title: storeProject.title,
            chattingResponses: updatedChats,
          };
        }

        return prev;
      });
    }
  }, [projects, projectId]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [openChatMenus, setOpenChatMenus] = useState<Set<number>>(new Set());
  const [showProjectMoveMenu, setShowProjectMoveMenu] = useState<number | null>(null);
  const chatMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 프로젝트 이름 편집 상태
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    if (!menuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  // 채팅 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      openChatMenus.forEach((chatId) => {
        const menuRef = chatMenuRefs.current.get(chatId);
        if (menuRef && !menuRef.contains(target)) {
          setOpenChatMenus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
          setShowProjectMoveMenu(null);
        }
      });
    };

    if (openChatMenus.size > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [openChatMenus]);

  // 메뉴 액션 핸들러들
  const handleRenameProjectClick = useCallback(() => {
    setMenuOpen(false);
    setEditedTitle(project?.title || '');
    setIsEditingTitle(true);
  }, [project?.title]);

  const handleSaveTitle = useCallback(async () => {
    if (!editedTitle.trim()) {
      showToast('프로젝트 이름을 입력해주세요.', 'warning');
      return;
    }

    // 로컬 상태 즉시 업데이트
    setProject((prev) => (prev ? { ...prev, title: editedTitle } : null));
    updateProjectTitle(projectId, editedTitle);
    setIsEditingTitle(false);

    // 백그라운드에서 API 호출
    updateProject(projectId, { title: editedTitle }).catch((error) => {
      console.error('프로젝트 이름 변경 API 실패:', error);
    });
  }, [editedTitle, projectId, updateProjectTitle, showToast]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingTitle(false);
    setEditedTitle('');
  }, []);

  const handleDeleteProject = useCallback(async () => {
    setMenuOpen(false);

    const chatCount = project?.chattingResponses?.length ?? 0;
    const confirmMessage =
      chatCount > 0
        ? '프로젝트 삭제 시 내부 채팅 목록도 삭제됩니다. 정말 삭제하시겠습니까?'
        : '정말 삭제하시겠습니까?';

    const confirmed = await confirm({
      title: '프로젝트 삭제',
      message: confirmMessage,
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    // 로컬 상태 즉시 업데이트
    removeProject(projectId);
    navigate('/chat');

    // 백그라운드에서 API 호출
    deleteProject(projectId).catch((error) => {
      console.error('프로젝트 삭제 API 실패:', error);
    });
  }, [navigate, projectId, project, removeProject, confirm]);

  // 채팅 카드 클릭 핸들러
  const handleChatClick = useCallback(
    (chatId: number) => {
      navigate('/chat', { state: { chatId, projectId } });
    },
    [navigate, projectId],
  );

  // 채팅 메뉴 토글
  const handleChatMenuToggle = useCallback((chatId: number) => {
    setOpenChatMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  }, []);

  // 프로젝트 이동 메뉴 토글
  const handleProjectMoveToggle = useCallback((chatId: number) => {
    setShowProjectMoveMenu((prev) => (prev === chatId ? null : chatId));
  }, []);

  // 채팅 메뉴 액션
  const handleChatMenuAction = useCallback(
    async (chatId: number, action: 'rename' | 'delete' | 'moveToProject', targetProjectId?: number) => {
      // 메뉴 닫기
      setOpenChatMenus((prev) => {
        const newSet = new Set(prev);
        newSet.delete(chatId);
        return newSet;
      });
      setShowProjectMoveMenu(null);

      if (action === 'rename') {
        // 프로젝트 페이지에서는 각 ChatCard가 자체적으로 편집 모드 관리
        // onMenuAction prop으로 전달되어 ChatCard 내부에서 처리됨
      } else if (action === 'delete') {
        const confirmed = await confirm({
          title: '채팅 삭제',
          message: '채팅을 삭제하시겠습니까?',
          confirmText: '삭제',
          cancelText: '취소',
          variant: 'danger',
        });

        if (confirmed) {
          // 로컬 상태 즉시 업데이트
          removeChat(chatId);
          // 로컬 project state도 즉시 업데이트
          setProject((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              chattingResponses: prev.chattingResponses.filter(
                (chat) => chat.chattingId !== chatId,
              ),
            };
          });
          // 백그라운드에서 API 호출
          deleteChatting(chatId).catch((error) => {
            console.error('채팅 삭제 API 실패:', error);
            // TODO: 실패 시 롤백 로직
          });
        }
      } else if (action === 'moveToProject' && targetProjectId) {
        // 로컬 상태 즉시 업데이트
        moveChatToProject(chatId, targetProjectId);
        // 로컬 project state도 즉시 업데이트
        setProject((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            chattingResponses: prev.chattingResponses.filter((chat) => chat.chattingId !== chatId),
          };
        });
        // 백그라운드에서 API 호출
        updateChattingProject(chatId, { projectId: targetProjectId }).catch((error) => {
          console.error('채팅 이동 API 실패:', error);
          // TODO: 실패 시 롤백 로직
        });
      }
    },
    [removeChat, moveChatToProject, confirm],
  );

  // 프로젝트 화면에서 새 채팅 시작
  const handleSendFromProject = useCallback(
    (message: string, uploadedFiles?: import('@/types/api/file.types').UploadedFileInfo[]) => {
      navigate('/chat', {
        state: { projectId, isNew: true, message, uploadedFiles },
      });
    },
    [navigate, projectId],
  );

  // 전역 ChatInput(바텀바)에서 보낸 메시지를 프로젝트 화면에서 새 채팅으로 연결
  useEffect(() => {
    const onChatSend = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; uploadedFiles?: import('@/types/api/file.types').UploadedFileInfo[] }>).detail;
      if (!detail?.message) return;

      e.stopImmediatePropagation();

      handleSendFromProject(detail.message, detail.uploadedFiles);
    };
    window.addEventListener('chat-send', onChatSend as EventListener);
    return () => window.removeEventListener('chat-send', onChatSend as EventListener);
  }, [handleSendFromProject]);

  if (isLoading) {
    return <div>로딩 중</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const chats = project.chattingResponses;

  return (
    <div className="project-page-container">
      <div className="project-page-hero">
        <div className="project-page-hero-inner">
          <div className="project-page-header-row">
            {isEditingTitle ? (
              <div className="project-page-title-edit">
                <img
                  src="/icons/folder_open.svg"
                  alt=""
                  width={ICON_SIZE.MD}
                  height={ICON_SIZE.MD}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="project-page-title-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <div className="project-page-title-actions">
                  <button onClick={handleSaveTitle} className="project-page-save-btn">
                    저장
                  </button>
                  <button onClick={handleCancelEdit} className="project-page-cancel-btn">
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <h1 className="project-page-title">
                <img
                  src="/icons/folder_open.svg"
                  alt=""
                  width={ICON_SIZE.MD}
                  height={ICON_SIZE.MD}
                  aria-hidden="true"
                />
                {project.title}
              </h1>
            )}
            <div className="project-page-actions" ref={menuRef}>
              <button
                className="project-page-more-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="더보기 메뉴"
                aria-expanded={menuOpen}
              >
                <img
                  src="/icons/more_detail.svg"
                  alt=""
                  width={ICON_SIZE.SM}
                  height={ICON_SIZE.SM}
                  aria-hidden="true"
                />
              </button>
              {menuOpen && (
                <div className="project-page-menu" role="menu">
                  <MenuItem
                    icon="/icons/edit.svg"
                    label="이름 바꾸기"
                    onClick={handleRenameProjectClick}
                    className="project-page-menu-item"
                    role="menuitem"
                  />
                  <MenuItem
                    icon="/icons/delete.svg"
                    label="프로젝트 삭제"
                    onClick={handleDeleteProject}
                    className="project-page-menu-item"
                    role="menuitem"
                  />
                </div>
              )}
            </div>
          </div>
          <p className="project-page-subtitle">{chats.length}개의 채팅</p>
        </div>
      </div>

      <div className="project-page-content">
        {chats.length > 0 ? (
          <div className="project-page-chats">
            {chats.map((chat) => (
              <ChatCard
                key={chat.chattingId}
                id={chat.chattingId}
                title={chat.title}
                preview={chat.lastMessage}
                // timestamp={new Date()}
                onClick={handleChatClick}
                onMenuToggle={handleChatMenuToggle}
                onMenuAction={handleChatMenuAction}
                isMenuOpen={openChatMenus.has(chat.chattingId)}
                projectId={projectId}
                allProjects={projects}
                showProjectMoveMenu={showProjectMoveMenu === chat.chattingId}
                onProjectMoveToggle={handleProjectMoveToggle}
                menuRef={(el) => {
                  if (el) {
                    chatMenuRefs.current.set(chat.chattingId, el);
                  } else {
                    chatMenuRefs.current.delete(chat.chattingId);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="project-page-empty">
            <div className="project-page-empty-content">
              <img
                src="/icons/folder_open.svg"
                alt=""
                width={ICON_SIZE.XL}
                height={ICON_SIZE.XL}
                className="project-page-empty-icon"
                aria-hidden="true"
              />
              <h2 className="project-page-empty-title">아직 채팅이 없습니다</h2>
              <p className="project-page-empty-description">아래 입력창에서 새 채팅을 시작하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
