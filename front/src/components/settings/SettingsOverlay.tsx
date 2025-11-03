import Sheet from '@/components/common/Sheet';
import SettingsForm from '@/components/settings/SettingsForm';
import type { SettingsFormData } from '@/components/settings/SettingsForm';

type SettingsOverlayProps = {
  open: boolean;
  onClose: () => void;
  variant: 'modal' | 'fullscreen';
  initialData?: SettingsFormData;
  onSubmit?: (data: SettingsFormData) => void;
  onAutoSave?: (data: SettingsFormData) => void;
};

export default function SettingsOverlay({
  open,
  onClose,
  variant,
  initialData,
  onSubmit,
  onAutoSave,
}: SettingsOverlayProps) {
  const sheetVariant = variant === 'fullscreen' ? 'fullscreen' : 'modal';
  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={sheetVariant}
      ariaLabel="개인 설정"
      className="settings-overlay-sheet"
    >
      <SettingsForm
        initialData={initialData}
        onSubmit={onSubmit}
        onAutoSave={onAutoSave}
        onClose={onClose}
      />
    </Sheet>
  );
}
