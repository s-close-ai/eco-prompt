import { useEffect, useState } from 'react';

export type DeviceMode = 'mobile' | 'tablet' | 'desktop';

export default function useDeviceMode() {
	const getMode = () => (document.documentElement.dataset.mode as DeviceMode) || 'mobile';
	const [mode, setMode] = useState<DeviceMode>(getMode());

	useEffect(() => {
		const onChange = (e: Event) => {
			const detail = (e as CustomEvent).detail as { mode?: DeviceMode } | undefined;
			if (detail?.mode) setMode(detail.mode);
			else setMode(getMode());
		};
		window.addEventListener('device-mode-change', onChange as EventListener);
		return () => window.removeEventListener('device-mode-change', onChange as EventListener);
	}, []);

	return mode;
}
