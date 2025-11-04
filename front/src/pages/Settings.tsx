import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useDeviceMode from '@/hooks/useDeviceMode';
import SettingsOverlay from '@/components/settings/SettingsOverlay';
import SettingsForm from '@/components/settings/SettingsForm';
import type { SettingsFormData } from '@/components/settings/SettingsForm';
import '@/styles/pages/settings.css';

// TODO: 실제 API에서 데이터를 가져오도록 수정
const mockSettingsData: SettingsFormData = {
  privacyConsent: {
    agreed: true,
    date: '2025.10.18',
  },
  promptPublic: false,
  personalizedPrompt: '',
};

export default function Settings() {
  const navigate = useNavigate();
  const mode = useDeviceMode();
  const [isOpen, setIsOpen] = useState(true);
  const [settingsData, setSettingsData] = useState<SettingsFormData>(mockSettingsData);

  useEffect(() => {
    // TODO: 실제 API에서 설정 데이터 로드
    // loadSettings().then(setSettingsData);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  const handleAutoSave = (data: SettingsFormData) => {
    // TODO: 실제 API에 자동 저장 (페이지 닫지 않음)
    console.log('Settings auto-saved:', data);
    setSettingsData(data);
  };

  const handleSubmit = (data: SettingsFormData) => {
    // TODO: 실제 API에 저장
    console.log('Settings saved:', data);
    setSettingsData(data);
    if (mode === 'mobile' || mode === 'tablet') {
      navigate(-1);
    } else {
      handleClose();
    }
  };

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
