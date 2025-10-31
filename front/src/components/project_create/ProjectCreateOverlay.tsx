import Sheet from '@/components/common/Sheet';
import ProjectCreateForm from '@/components/project_create/ProjectCreateForm';

type ProjectCreateOverlayProps = {
  open: boolean;
  onClose: () => void;
  variant: 'modal' | 'bottom' | 'fullscreen' | 'inline';
  initialName?: string;
};

export default function ProjectCreateOverlay({ open, onClose, variant, initialName }: ProjectCreateOverlayProps) {
  if (variant === 'inline') {
    return open ? (
      <div className="project-create-inline">
        <ProjectCreateForm onSubmit={() => onClose()} />
      </div>
    ) : null;
  }

  const sheetVariant = variant === 'fullscreen' ? 'fullscreen' : variant === 'bottom' ? 'bottom' : 'modal';
  return (
    <Sheet open={open} onClose={onClose} variant={sheetVariant} ariaLabel="프로젝트 생성">
      <ProjectCreateForm onSubmit={() => onClose()} />
    </Sheet>
  );
}


