import { useCallback } from 'react';
import { ContextMenu } from './ContextMenu';
import { MenuItem } from '@/components/common/MenuItem';
import { deleteProject } from '@/services/api/project';
import { useProjectStore } from '@/store/projectStore';

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
  const { removeProject, setEditingProjectId } = useProjectStore();

  const handleRename = useCallback(() => {
    menuProps.onClose?.();
    // 인라인 편집 모드 활성화
    setEditingProjectId(projectId);
  }, [projectId, menuProps, setEditingProjectId]);

  const handleDelete = useCallback(() => {
    menuProps.onClose?.();

    if (!confirm('프로젝트를 삭제하시겠습니까? 내부의 모든 채팅도 함께 삭제됩니다.')) {
      return;
    }

    // 로컬 상태 즉시 업데이트
    removeProject(projectId);

    // 백그라운드에서 API 호출
    deleteProject(projectId).catch((error) => {
      console.error('프로젝트 삭제 API 실패:', error);
    });
  }, [projectId, menuProps, removeProject]);

  return (
    <ContextMenu position={position} menuProps={menuProps}>
      <MenuItem icon="/icons/edit.svg" label="이름 바꾸기" onClick={handleRename} />
      <MenuItem icon="/icons/delete.svg" label="프로젝트 삭제" onClick={handleDelete} />
    </ContextMenu>
  );
}
