import { useState } from 'react';
import Button from '@/components/common/Button';
import TextField from '@/components/common/TextField';
import '@/styles/pages/project-create.css';

type ProjectCreateFormProps = {
  onSubmit?: (name: string) => void;
};

export default function ProjectCreateForm({ onSubmit }: ProjectCreateFormProps) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <section className="project-create container">
      <header className="project-create__header">
        <div className="project-create__title">
          <img src="/icons/add_folder.svg" alt="" aria-hidden width={24} height={24} />
          <h2>새 프로젝트</h2>
        </div>
      </header>

      <div className="project-create__body">
        <div className="project-create__field">
          <label htmlFor="project-name" className="project-create__label">
            프로젝트 이름
          </label>
          <TextField
            id="project-name"
            placeholder="예: 파티 플랜 짜기"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <p className="project-create__description">
          프로젝트를 통해 여러 채팅 간 컨텍스트를 공유하고 체계적으로 관리할 수 있습니다.
        </p>
      </div>

      <footer className="project-create__footer">
        <Button size="md" onClick={handleCreate} ariaLabel="프로젝트 만들기" isDisabled={!name.trim() || !onSubmit}>
          프로젝트 만들기
        </Button>
      </footer>
    </section>
  );
}



