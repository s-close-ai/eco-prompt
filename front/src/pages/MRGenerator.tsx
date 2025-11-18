import { useState, useEffect } from 'react';
import useDeviceMode from '@/hooks/useDeviceMode';
import Button from '@/components/common/Button';
import { getMRGeneratorSettings, saveMRGeneratorSettings } from '@/services/api/mr-generator';
import { useToast } from '@/context/ToastContext';
import '@/styles/pages/mr-generator.css';

const WEBHOOK_URL = 'https://ecoprompt.duckdns.org/api/v1/gitlab/webhook';
const GUIDE_URL =
  'https://elfin-skiff-309.notion.site/Ecoprompt-MR-1-2af7f9a7ee128129859afbe34ccf2c30?source=copy_link';

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
  const { showToast } = useToast();
  const [gitlabApiAccessToken, setGitlabApiAccessToken] = useState('');
  const [webhookSecretToken, setWebhookSecretToken] = useState('');
  const [mrTemplate, setMrTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 초기 값 저장 (변경 감지용)
  const [initialGitlabApiAccessToken, setInitialGitlabApiAccessToken] = useState('');
  const [initialWebhookSecretToken, setInitialWebhookSecretToken] = useState('');
  const [initialMrTemplate, setInitialMrTemplate] = useState('');

  // 초기 설정 불러오기
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await getMRGeneratorSettings();
        const apiToken = response.data.gitlabApiAccessToken || '';
        const secretToken = response.data.webhookSecretToken || '';
        const template = response.data.mrTemplate || '';

        setGitlabApiAccessToken(apiToken);
        setWebhookSecretToken(secretToken);
        setMrTemplate(template);

        // 초기 값 저장
        setInitialGitlabApiAccessToken(apiToken);
        setInitialWebhookSecretToken(secretToken);
        setInitialMrTemplate(template);
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
        // 에러 시 빈 값으로 시작
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      showToast('웹훅 URL이 복사되었습니다.', 'success');
    } catch (error) {
      console.error('복사 실패:', error);
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  const handleGenerateSecretToken = () => {
    const uuid = crypto.randomUUID();
    setWebhookSecretToken(uuid);
    showToast('Secret Token이 생성되었습니다.', 'success');
  };

  const handleCopySecretToken = async () => {
    if (!webhookSecretToken) {
      showToast('먼저 Secret Token을 생성해주세요.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(webhookSecretToken);
      showToast('Secret Token이 복사되었습니다.', 'success');
    } catch (error) {
      console.error('복사 실패:', error);
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  const handleApplyDefaultTemplate = () => {
    setMrTemplate(DEFAULT_TEMPLATE);
    showToast('기본 템플릿이 적용되었습니다.', 'success');
  };

  const handleSave = async () => {
    if (!gitlabApiAccessToken.trim()) {
      showToast('API 토큰을 입력해주세요.', 'warning');
      return;
    }

    if (!webhookSecretToken.trim()) {
      showToast('Secret Token을 입력하거나 생성해주세요.', 'warning');
      return;
    }

    if (!mrTemplate.trim()) {
      showToast('템플릿을 입력해주세요.', 'warning');
      return;
    }

    try {
      await saveMRGeneratorSettings({
        gitlabApiAccessToken,
        webhookSecretToken,
        mrTemplate,
    });
      showToast('설정이 저장되었습니다.', 'success');

      // 저장 성공 후 초기값 업데이트 (변경 감지 초기화)
      setInitialGitlabApiAccessToken(gitlabApiAccessToken);
      setInitialWebhookSecretToken(webhookSecretToken);
      setInitialMrTemplate(mrTemplate);
    } catch (error) {
      console.error('저장 실패:', error);
      showToast('설정 저장에 실패했습니다.', 'error');
    }
  };

  // 변경 사항 확인
  const hasChanges =
    gitlabApiAccessToken !== initialGitlabApiAccessToken ||
    webhookSecretToken !== initialWebhookSecretToken ||
    mrTemplate !== initialMrTemplate;

  // 로딩 중
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
          사용자 메뉴얼
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
            id="gitlabApiAccessToken"
            type="password"
            className="mr-generator-input"
            placeholder="API 토큰을 입력하세요"
            value={gitlabApiAccessToken}
            onChange={(e) => setGitlabApiAccessToken(e.target.value)}
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
              id="webhookSecretToken"
              type="text"
              className="mr-generator-input"
              placeholder="Secret Token을 입력하거나 UUID를 생성하세요"
              value={webhookSecretToken}
              onChange={(e) => setWebhookSecretToken(e.target.value)}
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
            id="mrTemplate"
            className="mr-generator-textarea"
            placeholder="MR 템플릿을 입력하세요"
            value={mrTemplate}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setMrTemplate(e.target.value);
              }
            }}
            rows={12}
            maxLength={500}
          />
          <div className="mr-generator-char-count">{mrTemplate.length} / 500</div>
        </section>

        {/* 저장 버튼 */}
        <div className="mr-generator-actions">
          <Button variant="primary" size="mr-generator" onClick={handleSave} isDisabled={!hasChanges}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
