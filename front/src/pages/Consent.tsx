import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/common/Button';
import { toggleSharingInformation, logout } from '@/services/api/auth';
import { toggleSharingPrompt } from '@/services/api/user-info';
import '@/styles/pages/consent.css';

export default function Consent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [requiredConsent, setRequiredConsent] = useState(false); // 정보 제공 동의 (필수)
  const [optionalConsent, setOptionalConsent] = useState(false); // 프롬프트 제공 동의 (선택)
  const [showRequiredDetail, setShowRequiredDetail] = useState(false);
  const [showOptionalDetail, setShowOptionalDetail] = useState(false);

  // 모두 선택하기
  const handleSelectAll = () => {
    const newValue = !(requiredConsent && optionalConsent);
    setRequiredConsent(newValue);
    setOptionalConsent(newValue);
  };

  const isAllSelected = requiredConsent && optionalConsent;

  const handleSubmit = async () => {
    if (!requiredConsent) {
      alert('필수 항목에 동의해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 필수: 정보 제공 동의
      await toggleSharingInformation();
      
      // 선택: 프롬프트 공유 동의
      if (optionalConsent) {
        await toggleSharingPrompt();
      }
      
      // 동의 완료 후 홈으로 이동
      navigate('/chat');
    } catch (error) {
      console.error('동의 업데이트 실패:', error);
      alert('동의 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = confirm(
      '필수 항목에 동의하지 않으면 서비스를 이용할 수 없습니다.\n정말 취소하시겠습니까?',
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
          <h1 className="consent-title">정보 제공 동의</h1>
          <p className="consent-subtitle">
            에코프롬프트 서비스 이용을 위해 다음 항목에 대한 동의가 필요합니다.
          </p>

          {/* 모두 선택하기 */}
          <div className="consent-item consent-all">
            <label className="consent-checkbox-wrapper">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                disabled={isLoading}
              />
              <span className="consent-checkbox-custom"></span>
              <span className="consent-item-title">모두 동의하기</span>
            </label>
          </div>

          <div className="consent-divider"></div>

          {/* 정보 제공 동의 (필수) */}
          <div className="consent-item">
            <div className="consent-item-header">
              <label className="consent-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={requiredConsent}
                  onChange={(e) => setRequiredConsent(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="consent-checkbox-custom"></span>
                <span className="consent-item-title">
                  AI 학습을 위한 정보 제공 동의
                  <span className="consent-badge required">필수</span>
                </span>
              </label>
              <button
                className="consent-detail-btn"
                onClick={() => setShowRequiredDetail(!showRequiredDetail)}
              >
                {showRequiredDetail ? '▲' : '▼'}
              </button>
            </div>
            {showRequiredDetail && (
              <div className="consent-detail">
                <p className="consent-detail-title">수집 및 이용 목적</p>
                <ul>
                  <li>AI 모델의 성능 향상</li>
                  <li>서비스 품질 개선</li>
                  <li>사용자 경험 최적화</li>
                </ul>
                <p className="consent-detail-title">수집 항목</p>
                <ul>
                  <li>대화 내용 (채팅 기록)</li>
                  <li>사용자 행동 데이터</li>
                </ul>
                <p className="consent-detail-note">
                  * 수집된 정보는 개인정보가 제거된 형태로 처리되며, 제3자에게 제공되지 않습니다.
                </p>
              </div>
            )}
          </div>

          {/* 프롬프트 제공 동의 (선택) */}
          <div className="consent-item">
            <div className="consent-item-header">
              <label className="consent-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={optionalConsent}
                  onChange={(e) => setOptionalConsent(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="consent-checkbox-custom"></span>
                <span className="consent-item-title">
                  프롬프트 공유 동의
                  <span className="consent-badge optional">선택</span>
                </span>
              </label>
              <button
                className="consent-detail-btn"
                onClick={() => setShowOptionalDetail(!showOptionalDetail)}
              >
                {showOptionalDetail ? '▲' : '▼'}
              </button>
            </div>
            {showOptionalDetail && (
              <div className="consent-detail">
                <p className="consent-detail-title">수집 및 이용 목적</p>
                <ul>
                  <li>다른 사용자들에게 우수한 프롬프트 예시 제공</li>
                  <li>프롬프트 작성 가이드 개선</li>
                  <li>커뮤니티 기여</li>
                </ul>
                <p className="consent-detail-title">공유 범위</p>
                <ul>
                  <li>높은 평가를 받은 프롬프트</li>
                  <li>익명화된 프롬프트 내용</li>
                </ul>
                <p className="consent-detail-note">
                  * 개인정보는 모두 제거되어 공유되며, 언제든지 동의를 철회할 수 있습니다.
                </p>
              </div>
            )}
          </div>

          <div className="consent-actions">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              isDisabled={isLoading || !requiredConsent}
            >
              {isLoading ? '처리 중...' : '동의하고 시작하기'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleCancel}
              isDisabled={isLoading}
            >
              취소
            </Button>
          </div>

          <p className="consent-note">
            * 필수 항목에 동의하지 않을 경우 서비스 이용이 제한됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
