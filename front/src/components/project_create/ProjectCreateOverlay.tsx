import { createPortal } from 'react-dom';
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

  const handleProjectCreate = async (request: ProjectCreateRequest) => {
    try {
      const response = await saveProject(request);
      addProject({
        projectId: response.data.projectId,
        title: request.title,
      });
      onClose();
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
