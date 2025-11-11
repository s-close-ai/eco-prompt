import { useCallback, useState, useRef, useEffect } from 'react';
import { ContextMenu } from './ContextMenu';
import { updateChattingProject, deleteChatting } from '@/services/api/chatting';
import { useProjectStore } from '@/store/projectStore';
import { ICON_SIZE } from '@/constants/ui';

interface ChatMenuProps {
  chattingId: number;
  chattingTitle?: string; // 더 이상 필요하지 않지만 호환성을 위해 optional로 유지
  currentProjectId: number;
  position: { top: number; left: number };
  menuProps: {
    ref: (el: HTMLDivElement | null) => void;
    onClose?: () => void;
  };
  onDelete?: () => void; // 삭제 후 추가 작업이 필요한 경우
}

/**
 * 채팅 컨텍스트 메뉴
 * - 이름 바꾸기
 * - 프로젝트 이동 (하위 메뉴)
 * - 채팅 삭제
 */
export function ChatMenu({
  chattingId,
  currentProjectId,
  position,
  menuProps,
  onDelete,
}: ChatMenuProps) {
  const {
    projects,
    generalChats,
    defaultProjectId,
    setEditingChatId,
    removeChat,
    moveChatToProject,
  } = useProjectStore();
  const [showProjectMoveMenu, setShowProjectMoveMenu] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);

  // 서브메뉴 위치 조정
  useEffect(() => {
    if (showProjectMoveMenu && submenuRef.current) {
      const submenu = submenuRef.current;
      try {
        const rect = submenu.getBoundingClientRect();

        // 화면 오른쪽 끝을 넘어가면 왼쪽에 표시
        if (rect.right > window.innerWidth) {
          submenu.style.left = 'auto';
          submenu.style.right = '100%';
          submenu.style.marginLeft = '0';
          submenu.style.marginRight = '4px';
        }
      } catch (error) {
        // getBoundingClientRect 호출 실패 시 무시
        console.warn('Failed to get bounding rect:', error);
      }
    }
  }, [showProjectMoveMenu]);

  const handleRename = useCallback(() => {
    // 인라인 편집 모드 활성화 (메뉴 닫기 전에 먼저 실행)
    setEditingChatId(chattingId);
    // 약간의 지연 후 메뉴 닫기 (상태 업데이트가 먼저 적용되도록)
    setTimeout(() => {
      menuProps.onClose?.();
    }, 0);
  }, [chattingId, menuProps, setEditingChatId]);

  const handleMoveToProject = useCallback(
    (targetProjectId: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      menuProps.onClose?.();

      if (targetProjectId === currentProjectId) {
        return;
      }

      // 로컬 상태 즉시 업데이트
      moveChatToProject(chattingId, targetProjectId);

      // 백그라운드에서 API 호출
      updateChattingProject(chattingId, { projectId: targetProjectId }).catch((error) => {
        console.error('채팅 이동 API 실패:', error);
      });
    },
    [chattingId, currentProjectId, menuProps, moveChatToProject],
  );

  const handleProjectMoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowProjectMoveMenu(!showProjectMoveMenu);
  };

  const handleDelete = useCallback(() => {
    menuProps.onClose?.();

    if (!confirm('채팅을 삭제하시겠습니까?')) {
      return;
    }

    // 로컬 상태 즉시 업데이트
    removeChat(chattingId);
    onDelete?.();

    // 백그라운드에서 API 호출
    deleteChatting(chattingId).catch((error) => {
      console.error('채팅 삭제 API 실패:', error);
    });
  }, [chattingId, menuProps, onDelete, removeChat]);

  // 프로젝트 목록: currentProjectId가 기본 프로젝트이면 "일반 채팅" 제외하고 다른 프로젝트들만
  // currentProjectId가 기본 프로젝트가 아니면 "일반 채팅" 포함하고 자기 프로젝트만 제외
  const availableProjects =
    currentProjectId === defaultProjectId
      ? projects // 기본 프로젝트에서는 다른 프로젝트들만
      : [
          { projectId: defaultProjectId, title: '일반 채팅', chats: generalChats } as any,
          ...projects,
        ].filter((p) => p.projectId !== currentProjectId);

  return (
    <ContextMenu position={position} menuProps={menuProps}>
      <button
        className="project-chat-card-menu-item"
        role="menuitem"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleRename();
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

      <div className="project-chat-card-menu-item project-chat-card-menu-item-with-submenu">
        <button className="project-chat-card-menu-item-btn" onClick={handleProjectMoveClick}>
          <img
            src="/icons/folder.svg"
            alt=""
            width={ICON_SIZE.SM}
            height={ICON_SIZE.SM}
            aria-hidden="true"
          />
          <span>프로젝트 이동</span>
          <img
            src={'/icons/chevron.svg'}
            alt=""
            width={ICON_SIZE.SM}
            height={ICON_SIZE.SM}
            className="project-chat-card-menu-item-chevron"
            aria-hidden="true"
          />
        </button>
        {showProjectMoveMenu && (
          <div className="project-chat-card-menu-submenu" ref={submenuRef}>
            {availableProjects.map((project) => (
              <button
                key={project.projectId}
                className="project-chat-card-menu-submenu-item"
                onClick={(e) => handleMoveToProject(project.projectId, e)}
              >
                <span>{project.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="project-chat-card-menu-item"
        role="menuitem"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDelete();
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
    </ContextMenu>
  );
}
