import Sheet from '@/components/common/Sheet';
import ProjectCreateForm from '@/components/project_create/ProjectCreateForm';

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
  if (variant === 'inline') {
    return open ? (
      <div className="project-create-inline" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>
          <ProjectCreateForm onSubmit={() => onClose()} onClose={onClose} />
        </div>
      </div>
    ) : null;
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
      <ProjectCreateForm onSubmit={() => onClose()} onClose={onClose} />
    </Sheet>
  );
}
