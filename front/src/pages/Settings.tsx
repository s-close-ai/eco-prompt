import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useDeviceMode from '@/hooks/useDeviceMode';
import SettingsOverlay from '@/components/settings/SettingsOverlay';
import SettingsForm from '@/components/settings/SettingsForm';
import type { SettingsFormData } from '@/components/settings/SettingsForm';
import { getSharingInformation } from '@/services/api/auth';
import { getSettings } from '@/services/api/user-info';
import '@/styles/pages/settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const [isOpen, setIsOpen] = useState(true);
  const [settingsData, setSettingsData] = useState<SettingsFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // 개인정보 활용 동의 정보와 설정 정보를 병렬로 가져오기
        const [sharingInfoResponse, settingsResponse] = await Promise.all([
          getSharingInformation(),
          getSettings(),
        ]);

        const formattedData: SettingsFormData = {
          privacyConsent: {
            agreed: sharingInfoResponse.data.sharingInformation === 'Y',
            date: sharingInfoResponse.data.sharingInformationUpdatedAt
              ? sharingInfoResponse.data.sharingInformationUpdatedAt.split('.').slice(0, 3).join('.')
              : undefined,
          },
          promptPublic: settingsResponse.data.sharingPrompt === 'Y',
          personalizedPrompt: settingsResponse.data.personalPrompt || '',
        };

        setSettingsData(formattedData);
      } catch (error) {
        // 오류 발생 시 기본값 설정
        setSettingsData({
          privacyConsent: {
            agreed: false,
          },
          promptPublic: false,
          personalizedPrompt: '',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  const handleAutoSave = (data: SettingsFormData) => {
    // 자동 저장 시 데이터 업데이트 (API 호출은 SettingsForm에서 처리)
    setSettingsData(data);
  };

  const handleSubmit = (data: SettingsFormData) => {
    // 저장 시 데이터 업데이트 (API 호출은 SettingsForm에서 처리)
    setSettingsData(data);
    if (mode === 'mobile' || mode === 'tablet') {
      navigate(-1);
    } else {
      handleClose();
    }
  };

  // 로딩 중일 때
  if (isLoading || !settingsData) {
    return (
      <div className="settings-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          로딩 중
        </div>
      </div>
    );
  }

  // 모바일/태블릿: 전체 페이지 (x 버튼 없음)
  if (mode === 'mobile' || mode === 'tablet') {
    return (
      <div className="settings-page">
        <SettingsForm
          initialData={settingsData}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
        />
      </div>
    );
  }

  // 데스크탑: 모달
  return (
    <SettingsOverlay
      open={isOpen}
      onClose={handleClose}
      variant="modal"
      initialData={settingsData}
      onSubmit={handleSubmit}
      onAutoSave={handleAutoSave}
    />
  );
}
