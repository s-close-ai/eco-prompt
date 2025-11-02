import { useState, useRef, useEffect } from 'react';
import useDeviceMode from '@/hooks/useDeviceMode';
import Button from '@/components/common/Button';
import TextField from '@/components/common/TextField';
import TextArea from '@/components/common/TextArea';
import { isValidUrl } from '@/utils/bookmark';
import '@/styles/components/bookmark/bookmark-create-form.css';

export type BookmarkFormData = {
  title: string;
  url: string;
  description: string;
};

type BookmarkCreateFormProps = {
  onSubmit?: (data: BookmarkFormData) => void;
  onClose?: () => void;
  initialData?: BookmarkFormData;
};

export default function BookmarkCreateForm({
  onSubmit,
  onClose,
  initialData,
}: BookmarkCreateFormProps) {
  const mode = useDeviceMode();
  const [title, setTitle] = useState(initialData?.title || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [urlError, setUrlError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // initialData가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setUrl(initialData.url || '');
      setDescription(initialData.description || '');
      setUrlError('');
    }
  }, [initialData]);

  const handleFocus = (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>) => {
    if (mode === 'tablet') {
      // 태블릿에서는 포커스된 필드를 부드럽게 스크롤
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    // URL이 비어있으면 에러 메시지 제거
    if (!value.trim()) {
      setUrlError('');
      return;
    }
    // URL 유효성 검사
    if (!isValidUrl(value)) {
      setUrlError('올바른 URL을 입력해주세요');
    } else {
      setUrlError('');
    }
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    if (!trimmedTitle || !trimmedUrl) return;

    // 최종 제출 시 URL 유효성 재검사
    if (!isValidUrl(trimmedUrl)) {
      setUrlError('올바른 URL을 입력해주세요');
      return;
    }

    onSubmit?.({
      title: trimmedTitle,
      url: trimmedUrl,
      description: description.trim(),
    });
  };

  const isValid = title.trim() && url.trim() && !urlError;

  return (
    <section className="bookmark-create-form container">
      <header className="bookmark-create-form__header">
        <div className="bookmark-create-form__title">
          {mode !== 'mobile' && (
            <img src="/icons/bookmark.svg" alt="" aria-hidden width={24} height={24} />
          )}
          <h2>{initialData ? '북마크 수정' : '북마크 생성'}</h2>
        </div>
        {onClose && (
          <button
            className="bookmark-create-form__close"
            onClick={onClose}
            aria-label="닫기"
            type="button"
          >
            <img src="/icons/close.svg" alt="close" width={20} height={20} />
          </button>
        )}
      </header>

      <div className="bookmark-create-form__body">
        <div className="bookmark-create-form__field">
          <TextField
            ref={titleRef}
            label="제목*"
            placeholder="예: edu ssafy"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => handleFocus(titleRef)}
            fullWidth
            autoFocus
          />
        </div>

        <div className="bookmark-create-form__field">
          <TextField
            ref={urlRef}
            label="링크*"
            placeholder="예: edu.ssafy.com 또는 https://edu.ssafy.com"
            value={url}
            onChange={handleUrlChange}
            onFocus={() => handleFocus(urlRef)}
            fullWidth
            type="url"
          />
          {urlError && <p className="bookmark-create-form__error">{urlError}</p>}
        </div>

        <div className="bookmark-create-form__field">
          <TextArea
            ref={descriptionRef}
            label="설명"
            placeholder="예: 싸피 홈페이지"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onFocus={() => handleFocus(descriptionRef)}
            fullWidth
            rows={4}
          />
        </div>
      </div>

      <footer className="bookmark-create-form__footer">
        <Button
          variant="primary"
          onClick={handleSubmit}
          size="md"
          isDisabled={!isValid}
          ariaLabel="추가"
          fullWidth
        >
          {initialData ? '수정' : '추가'}
        </Button>
      </footer>
    </section>
  );
}
