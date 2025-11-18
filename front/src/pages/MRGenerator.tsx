import { useState, useEffect } from 'react';
import useDeviceMode from '@/hooks/useDeviceMode';
import Button from '@/components/common/Button';
import '@/styles/pages/mr-generator.css';

const WEBHOOK_URL = 'https://ecoprompt.duckdns.org/api/v1/gitlab/webhook';
const GUIDE_URL =
  'https://eight-swoop-4a5.notion.site/MR-2af5477005b080b69672c5e7dd4467c1?source=copy_link';

const DEFAULT_TEMPLATE = `## 🔘Part

- [ ] FE

- [ ] BE

- [ ] AI

- [ ] INFRA

- [ ] Other

  <br/>

## 🔎 작업 내용

- 기능에서 어떤 부분이

- 구현되었는지 설명해주세요

<br/>

## ➕ 지라 링크

- [지라번호-숫자](지라주소)

<br/>

Closes 지라번호-숫자`;

export default function MRGenerator() {
  const mode = useDeviceMode();
  const [apiToken, setApiToken] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [template, setTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      alert('웹훅 URL이 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const handleGenerateSecretToken = () => {
    const uuid = crypto.randomUUID();
    setSecretToken(uuid);
  };

  const handleCopySecretToken = async () => {
    if (!secretToken) {
      alert('먼저 Secret Token을 생성해주세요.');
      return;
    }
    try {
      await navigator.clipboard.writeText(secretToken);
      alert('Secret Token이 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  const handleApplyDefaultTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
  };

  const handleSave = async () => {
    if (!apiToken.trim()) {
      alert('API 토큰을 입력해주세요.');
      return;
    }

    if (!secretToken.trim()) {
      alert('Secret Token을 입력하거나 생성해주세요.');
      return;
    }

    if (!template.trim()) {
      alert('템플릿을 입력해주세요.');
      return;
    }

    try {
      // TODO: 백엔드 API 호출
      // await saveMRGeneratorSettings({ apiToken, secretToken, template });
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="mr-generator-page">
        <div className="mr-generator-page__header">
          <div className="mr-generator-page__title">
            <img src="/icons/mr_create.svg" alt="" aria-hidden width={24} height={24} />
            <h2>MR 자동 생성기</h2>
          </div>
        </div>
        <div className="mr-generator-loading">로딩 중...</div>
      </div>
    );
  }

  // 모바일에서는 접근 불가
  if (mode === 'mobile') {
    return (
      <div className="mr-generator-page">
        <div className="mr-generator-page__header">
          <div className="mr-generator-page__title">
            <img src="/icons/mr_create.svg" alt="" aria-hidden width={24} height={24} />
            <h2>MR 자동 생성기</h2>
          </div>
        </div>
        <div className="mr-generator-unavailable">
          <img src="/icons/info.svg" alt="" aria-hidden width={48} height={48} />
          <p>MR 자동 생성기는 태블릿 및 데스크탑에서만 사용 가능합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mr-generator-page">
      <div className="mr-generator-page__header">
        <div className="mr-generator-page__title">
          <img src="/icons/mr_create.svg" alt="" aria-hidden width={24} height={24} />
          <h2>MR 자동 생성기</h2>
        </div>
        <a
          href={GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mr-generator-guide-link"
        >
          <img src="/icons/help.svg" alt="" aria-hidden width={20} height={20} />
          사용 설명서
        </a>
      </div>

      <div className="mr-generator-page__content">
        {/* API 토큰 섹션 */}
        <section className="mr-generator-section">
          <label htmlFor="api-token" className="mr-generator-label">
            1. GitLab API 토큰
            <span className="mr-generator-label-required">*</span>
          </label>
          <p className="mr-generator-description">
            GitLab에서 발급받은 Personal Access Token을 입력하세요.
          </p>
          <input
            id="api-token"
            type="password"
            className="mr-generator-input"
            placeholder="API 토큰을 입력하세요"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
          />
        </section>

        {/* Webhook URL 섹션 */}
        <section className="mr-generator-section">
          <label htmlFor="webhook-url" className="mr-generator-label">
            2. Webhook URL
          </label>
          <p className="mr-generator-description">
            GitLab Webhook 설정에 아래 URL을 추가하세요.
          </p>
          <div className="mr-generator-input-group">
            <input
              id="webhook-url"
              type="text"
              className="mr-generator-input mr-generator-input--readonly"
              value={WEBHOOK_URL}
              readOnly
            />
            <button
              className="mr-generator-copy-btn"
              onClick={handleCopyWebhookUrl}
              aria-label="Webhook URL 복사"
            >
              <img src="/icons/copy.svg" alt="복사" width={20} height={20} />
            </button>
          </div>
        </section>

        {/* Secret Token 섹션 */}
        <section className="mr-generator-section">
          <label htmlFor="secret-token" className="mr-generator-label">
            3. Secret Token
            <span className="mr-generator-label-required">*</span>
          </label>
          <p className="mr-generator-description">
            UUID를 자동 생성하거나 직접 입력할 수 있습니다. GitLab Webhook 설정의 Secret Token
            필드에 이 값을 입력하세요.
          </p>
          <div className="mr-generator-button-group">
            <Button variant="secondary" size="sm" onClick={handleGenerateSecretToken}>
              UUID 생성
            </Button>
          </div>
          <div className="mr-generator-input-group">
            <input
              id="secret-token"
              type="text"
              className="mr-generator-input"
              placeholder="Secret Token을 입력하거나 UUID를 생성하세요"
              value={secretToken}
              onChange={(e) => setSecretToken(e.target.value)}
            />
            <button
              className="mr-generator-copy-btn"
              onClick={handleCopySecretToken}
              aria-label="Secret Token 복사"
            >
              <img src="/icons/copy.svg" alt="복사" width={20} height={20} />
            </button>
          </div>
        </section>

        {/* 템플릿 섹션 */}
        <section className="mr-generator-section">
          <label htmlFor="template" className="mr-generator-label">
            4. MR 템플릿
            <span className="mr-generator-label-required">*</span>
          </label>
          <p className="mr-generator-description">
            자동으로 생성될 MR의 기본 템플릿을 작성하세요. 기본 템플릿을 사용하거나 직접 작성할 수
            있습니다. (최대 500자)
          </p>
          <div className="mr-generator-button-group">
            <Button variant="secondary" size="sm" onClick={handleApplyDefaultTemplate}>
              기본 템플릿 적용
            </Button>
          </div>
          <textarea
            id="template"
            className="mr-generator-textarea"
            placeholder="MR 템플릿을 입력하세요"
            value={template}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setTemplate(e.target.value);
              }
            }}
            rows={12}
            maxLength={500}
          />
          <div className="mr-generator-char-count">{template.length} / 500</div>
        </section>

        {/* 저장 버튼 */}
        <div className="mr-generator-actions">
          <Button variant="primary" size="md" onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
