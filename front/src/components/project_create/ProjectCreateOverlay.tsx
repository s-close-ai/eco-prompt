import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/common/Sheet';
import ProjectCreateForm from '@/components/project_create/ProjectCreateForm';
import { saveProject } from '@/services/api/project';
import { useProjectStore } from '@/store/projectStore';
import type { ProjectCreateRequest } from '@/types/api/project.types';

type ProjectCreateOverlayProps = {
  open: boolean;
  onClose: () => void;
  variant: 'modal' | 'bottom' | 'fullscreen' | 'inline';
  initialName?: string;
};

export default function ProjectCreateOverlay({
  open,
  onClose,
  variant,
}: ProjectCreateOverlayProps) {
  const { addProject } = useProjectStore();
  const navigate = useNavigate();

  const handleProjectCreate = async (request: ProjectCreateRequest) => {
    try {
      const response = await saveProject(request);
      const newProjectId = response.data.projectId;
      addProject({
        projectId: newProjectId,
        title: request.title,
      });
      onClose();
      // 프로젝트 생성 후 해당 프로젝트 페이지로 이동
      navigate('/project', { state: { projectId: newProjectId } });
    } catch (error) {
      console.error('Failed to create project:', error);
      // TODO: Add user-facing error handling
    }
  };

  if (variant === 'inline') {
    return open
      ? createPortal(
          <div className="project-create-inline" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}>
              <ProjectCreateForm onSubmit={handleProjectCreate} onClose={onClose} />
            </div>
          </div>,
          document.body,
        )
      : null;
  }

  const sheetVariant =
    variant === 'fullscreen' ? 'fullscreen' : variant === 'bottom' ? 'bottom' : 'modal';
  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={sheetVariant}
      ariaLabel="프로젝트 생성"
      className="project-create-sheet"
    >
      <ProjectCreateForm onSubmit={handleProjectCreate} onClose={onClose} />
    </Sheet>
  );
}
