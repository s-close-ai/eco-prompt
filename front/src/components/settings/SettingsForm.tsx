import { useState } from 'react';
import Button from '@/components/common/Button';
import TextArea from '@/components/common/TextArea';
import Toggle from '@/components/common/Toggle';
import Tooltip from '@/components/common/Tooltip';
import '@/styles/components/settings/settings-form.css';

export type SettingsFormData = {
  privacyConsent: {
    agreed: boolean;
    date?: string;
  };
  promptPublic: boolean;
  personalizedPrompt: string;
};

type SettingsFormProps = {
  initialData?: SettingsFormData;
  onSubmit?: (data: SettingsFormData) => void;
  onAutoSave?: (data: SettingsFormData) => void;
  onClose?: () => void;
};

export default function SettingsForm({
  initialData,
  onSubmit,
  onAutoSave,
  onClose,
}: SettingsFormProps) {
  const [promptPublic, setPromptPublic] = useState(initialData?.promptPublic ?? false);
  const [personalizedPrompt, setPersonalizedPrompt] = useState(
    initialData?.personalizedPrompt ?? '',
  );

  const privacyConsent = initialData?.privacyConsent ?? { agreed: false };
  const isPrivacyConsented = privacyConsent.agreed;

  const handleToggleChange = (value: boolean) => {
    setPromptPublic(value);
    // 토글 변경 시 자동 저장 (페이지 닫지 않음)
    onAutoSave?.({
      privacyConsent,
      promptPublic: value,
      personalizedPrompt: personalizedPrompt.trim(),
    });
  };

  const handleSubmit = () => {
    onSubmit?.({
      privacyConsent,
      promptPublic,
      personalizedPrompt: personalizedPrompt.trim(),
    });
  };

  const hasChanges = personalizedPrompt.trim() !== (initialData?.personalizedPrompt ?? '');

  return (
    <section className="settings-form container">
      <header className="settings-form__header">
        <div className="settings-form__title">
          <img src="/icons/settings.svg" alt="" aria-hidden width={24} height={24} />
          <h2>개인 설정</h2>
        </div>
        {onClose && (
          <button
            className="settings-form__close"
            onClick={onClose}
            aria-label="닫기"
            type="button"
          >
            <img src="/icons/close.svg" alt="close" width={20} height={20} />
          </button>
        )}
      </header>

      <div className="settings-form__body">
        {/* 개인정보 활용 동의 */}
        <div className="settings-form__section">
          <div className="settings-form__section-header">
            <div className="settings-form__section-label-wrapper">
              <span className="settings-form__section-label">개인정보 활용 동의</span>
              <Tooltip content="프롬프트 내용과 답변을 AI 학습에 활용하는 것에 동의합니다." />
            </div>
            <div className="settings-form__section-value">
              {isPrivacyConsented ? (
                <>
                  <span className="settings-form__date">{privacyConsent.date || '2025.10.18'}</span>
                  <span className="settings-form__badge">동의함</span>
                </>
              ) : (
                <span className="settings-form__no-consent">
                  개인 정보 활용에 동의를 해주어야 사용가능합니다.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 개인정보 활용 동의가 없는 경우, 동의 안내만 표시 */}
        {!isPrivacyConsented ? (
          <div className="settings-form__no-consent-message">
            <p>개인 정보 활용에 동의를 해주어야 사용가능합니다.</p>
          </div>
        ) : (
          <>
            {/* 프롬프트 공개 여부 */}
            <div className="settings-form__section">
              <div className="settings-form__section-header">
                <div className="settings-form__section-label-wrapper">
                  <span className="settings-form__section-label">프롬프트 공개 여부</span>
                  <Tooltip content="Eco 픽에 좋은 프롬프트로 공개될 수 있습니다." />
                </div>
                <Toggle
                  value={promptPublic}
                  onChange={handleToggleChange}
                  leftLabel="비공개"
                  rightLabel="공개"
                />
              </div>
            </div>

            {/* 개인화 프롬프트 */}
            <div className="settings-form__section">
              <div className="settings-form__section-content">
                <div className="settings-form__section-label-wrapper">
                  <span className="settings-form__section-label">개인화 프롬프트</span>
                  <Tooltip content="기본 프롬프트는 모든 대화의 시작 부분에 자동으로 포함됩니다. 구체적이고 명확한 지침을 작성하면 더 나은 결과를 얻을 수 있습니다." />
                </div>
                <TextArea
                  value={personalizedPrompt}
                  onChange={(e) => setPersonalizedPrompt(e.target.value)}
                  placeholder="AI가 모든 대화에서 참고할 기본 지침을 설정하세요. 예를 들어, 답변 스타일, 선호하는 형식, 특정 관점 등을 지정할 수 있습니다."
                  maxLength={1000}
                  showCharCount
                  fullWidth
                  rows={6}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="settings-form__footer">
        <Button
          variant="primary"
          onClick={handleSubmit}
          size="md"
          isDisabled={!hasChanges || !isPrivacyConsented}
          ariaLabel="변경사항 저장"
          className="settings-form__save-btn"
        >
          저장
        </Button>
      </footer>
    </section>
  );
}
