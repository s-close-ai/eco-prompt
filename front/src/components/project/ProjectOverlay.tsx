import Sheet from '@/components/common/Sheet';
import ProjectOverview from '@/components/project/ProjectOverview';

type ProjectOverlayProps = {
  open: boolean;
  onClose: () => void;
  variant: 'modal' | 'bottom' | 'fullscreen' | 'inline';
  title: string;
};

export default function ProjectOverlay({ open, onClose, variant, title }: ProjectOverlayProps) {
  if (variant === 'inline') {
    return open ? (
      <div className="project-create-inline">
        <ProjectOverview title={title} onStart={onClose} />
      </div>
    ) : null;
  }

  const sheetVariant =
    variant === 'fullscreen' ? 'fullscreen' : variant === 'bottom' ? 'bottom' : 'modal';
  return (
    <Sheet open={open} onClose={onClose} variant={sheetVariant} ariaLabel="프로젝트">
      <ProjectOverview title={title} onStart={onClose} />
    </Sheet>
  );
}
