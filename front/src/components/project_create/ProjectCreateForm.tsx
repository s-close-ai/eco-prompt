import { useState } from 'react';
import Button from '@/components/common/Button';
import TextField from '@/components/common/TextField';
import '@/styles/components/project/project-create.css';
import type { ProjectCreateRequest } from '@/types/api/project.types';

type ProjectCreateFormProps = {
  onSubmit?: (request: ProjectCreateRequest) => void;
  onClose?: () => void;
};

export default function ProjectCreateForm({ onSubmit, onClose }: ProjectCreateFormProps) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit?.({ title: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.length > 100) {
      alert('최대 100자까지 입력 가능합니다.');
      return;
    }
    setName(value);
  };

  return (
    <section className="project-create container">
      <header className="project-create__header">
        <div className="project-create__title">
          <img src="/icons/add_folder.svg" alt="" aria-hidden width={24} height={24} />
          <h2>새 프로젝트</h2>
        </div>
        <div className="project-create__actions">
          {onClose && (
            <button
              className="project-create__close"
              onClick={onClose}
              aria-label="닫기"
              type="button"
            >
              <img src="/icons/close.svg" alt="close" width={20} height={20} />
            </button>
          )}
        </div>
      </header>

      <div className="project-create__body">
        <div className="project-create__field">
          <label htmlFor="project-name" className="project-create__label">
            프로젝트 이름
          </label>
          <TextField
            id="project-name"
            placeholder="예: 일타싸피 공부"
            fullWidth
            value={name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <p className="project-create__description">
          프로젝트를 통해 여러 채팅 간 컨텍스트를 공유하고 체계적으로 관리할 수 있습니다.
        </p>
      </div>

      <footer className="project-create__footer">
        <Button
          size="mobile"
          onClick={handleCreate}
          ariaLabel="프로젝트 만들기"
          isDisabled={!name.trim() || !onSubmit}
        >
          프로젝트 만들기
        </Button>
      </footer>
    </section>
  );
}
