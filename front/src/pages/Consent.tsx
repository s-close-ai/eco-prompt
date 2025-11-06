import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/common/Button';
import { updateConsent, logout } from '@/services/api/auth';
import '@/styles/pages/consent.css';

export default function Consent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleAgree = async () => {
    setIsLoading(true);
    try {
      await updateConsent();
      // 동의 완료 후 홈으로 이동
      navigate('/chat');
    } catch (error) {
      console.error('동의 업데이트 실패:', error);
      alert('동의 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisagree = async () => {
    const confirmed = confirm(
      'AI 학습에 정보를 제공하지 않으면 서비스를 이용할 수 없습니다.\n정말 거부하시겠습니까?'
    );

    if (confirmed) {
      setIsLoading(true);
      try {
        await logout();
        // 로그아웃 후 랜딩 페이지로 이동
        navigate('/');
      } catch (error) {
        console.error('로그아웃 실패:', error);
        alert('로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="consent-page">
      <div className="consent-container">
        <div className="consent-content">
          <div className="consent-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>

          <h1 className="consent-title">AI 학습 정보 제공 동의</h1>

          <div className="consent-description">
            <p>
              에코프롬프트는 더 나은 서비스를 제공하기 위해 사용자의 프롬프트 및 대화 내용을 AI 학습에
              활용합니다.
            </p>
            <p>제공된 정보는 다음과 같은 용도로만 사용됩니다:</p>
            <ul>
              <li>AI 모델의 성능 향상</li>
              <li>프롬프트 품질 평가 개선</li>
              <li>사용자 경험 최적화</li>
            </ul>
            <p>
              수집된 정보는 개인정보가 제거된 형태로 처리되며, 제3자에게 제공되지 않습니다.
            </p>
          </div>

          <div className="consent-actions">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleAgree}
              isDisabled={isLoading}
            >
              {isLoading ? '처리 중...' : '동의하고 시작하기'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleDisagree}
              isDisabled={isLoading}
            >
              동의하지 않음
            </Button>
          </div>

          <p className="consent-note">
            동의하지 않을 경우 서비스 이용이 제한됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
