import Button from '@/components/common/Button';
import '@/styles/components/project/project-create.css';

type ProjectOverviewProps = {
  title: string;
  onStart?: () => void;
};

export default function ProjectOverview({ title, onStart }: ProjectOverviewProps) {
  return (
    <section className="project-create container">
      <header className="project-create__header">
        <div className="project-create__title">
          <img src="/icons/folder_open.svg" alt="" aria-hidden width={20} height={20} />
          <h2>{title}</h2>
        </div>
        <Button size="sm" onClick={onStart} ariaLabel="새 채팅 시작">
          새 채팅
        </Button>
      </header>
      <div className="project-create__body">
        <p className="project-create__assist">
          프로젝트 컨텍스트에서 대화를 시작하거나, 이전 채팅으로 이동하세요.
        </p>
      </div>
    </section>
  );
}
