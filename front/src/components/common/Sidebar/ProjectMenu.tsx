import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ContextMenu } from './ContextMenu';
import { MenuItem } from '@/components/common/MenuItem';
import { deleteProject } from '@/services/api/project';
import { useProjectStore } from '@/store/projectStore';
import { useConfirm } from '@/context/ConfirmContext';

interface ProjectMenuProps {
  projectId: number;
  projectTitle?: string; // 더 이상 필요하지 않지만 호환성을 위해 optional로 유지
  position: { top: number; left: number };
  menuProps: {
    ref: (el: HTMLDivElement | null) => void;
    onClose?: () => void;
  };
}

/**
 * 프로젝트 컨텍스트 메뉴
 * - 이름 바꾸기
 * - 프로젝트 삭제
 */
export function ProjectMenu({ projectId, position, menuProps }: ProjectMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { removeProject, setEditingProjectId } = useProjectStore();
  const confirm = useConfirm();

  const handleRename = useCallback(() => {
    // 인라인 편집 모드 활성화 (메뉴 닫기 전에 먼저 실행)
    setEditingProjectId(projectId);
    // 약간의 지연 후 메뉴 닫기 (상태 업데이트가 먼저 적용되도록)
    setTimeout(() => {
      menuProps.onClose?.();
    }, 0);
  }, [projectId, menuProps, setEditingProjectId]);

  const handleDelete = useCallback(async () => {
    menuProps.onClose?.();

    const confirmed = await confirm({
      title: '프로젝트 삭제',
      message: '프로젝트를 삭제하시겠습니까? 내부의 모든 채팅도 함께 삭제됩니다.',
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    // 로컬 상태 즉시 업데이트
    removeProject(projectId);

    // 현재 프로젝트 페이지에 있다면 /chat으로 이동
    const locationState = location.state as { projectId?: number } | undefined;
    if (location.pathname === '/project' && locationState?.projectId === projectId) {
      navigate('/chat');
    }

    // 백그라운드에서 API 호출
    deleteProject(projectId).catch((error) => {
      console.error('프로젝트 삭제 API 실패:', error);
    });
  }, [projectId, menuProps, removeProject, navigate, location, confirm]);

  return (
    <ContextMenu position={position} menuProps={menuProps}>
      <MenuItem icon="/icons/edit.svg" label="이름 바꾸기" onClick={handleRename} />
      <MenuItem icon="/icons/delete.svg" label="프로젝트 삭제" onClick={handleDelete} />
    </ContextMenu>
  );
}
