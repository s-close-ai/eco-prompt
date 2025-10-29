export type DeviceMode = 'mobile' | 'tablet' | 'desktop';

export interface DeviceSnapshot {
	mode: DeviceMode;
	width: number;
	pointer: 'coarse' | 'fine' | 'none';
	hover: 'hover' | 'none';
	touch: boolean;
	ipad: boolean;
	uaMobile: boolean | undefined;
}

export interface Breakpoints {
	mobileMax: number; // vw < mobileMax => mobile
	tabletMax: number; // mobileMax <= vw < tabletMax => tablet, vw >= tabletMax => desktop
}

const defaultBreakpoints: Breakpoints = {
	mobileMax: 768,
	tabletMax: 1024,
};

let current: DeviceSnapshot | null = null;

function isIpadOS(): boolean {
	const maxTouch = navigator.maxTouchPoints || 0;
	const platform = (navigator as unknown as { platform?: string }).platform || '';
	const ua = navigator.userAgent || '';
	// iPadOS 13+: MacIntel + multi-touch, 또는 UA에 iPad 포함
	return (platform === 'MacIntel' && maxTouch > 1) || /iPad/.test(ua);
}

function getPointer(): 'coarse' | 'fine' | 'none' {
	if (matchMedia('(pointer: coarse)').matches) return 'coarse';
	if (matchMedia('(pointer: fine)').matches) return 'fine';
	return 'none';
}

function getHover(): 'hover' | 'none' {
	return matchMedia('(hover: hover)').matches ? 'hover' : 'none';
}

function computeMode(width: number, bp: Breakpoints): DeviceMode {
	if (width < bp.mobileMax) return 'mobile';
	if (width < bp.tabletMax) return 'tablet';
	return 'desktop';
}

function snapshot(bp: Breakpoints): DeviceSnapshot {
	const width = Math.round(window.innerWidth);
	const pointer = getPointer();
	const hover = getHover();
	const touch = (navigator.maxTouchPoints || 0) > 0;
	const ipad = isIpadOS();
	const uaMobile = (navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData
		?.mobile;
	const mode = computeMode(width, bp);
	return {
		mode: ipad && mode === 'desktop' ? 'tablet' : mode,
		width,
		pointer,
		hover,
		touch,
		ipad,
		uaMobile,
	};
}

function applyToRoot(s: DeviceSnapshot) {
	const root = document.documentElement;
	root.dataset.mode = s.mode;
	root.dataset.pointer = s.pointer;
	root.dataset.hover = s.hover;
	root.dataset.touch = String(!!s.touch);
	root.dataset.ipad = String(!!s.ipad);
	if (typeof s.uaMobile !== 'undefined') root.dataset.uaMobile = String(s.uaMobile);
}

function dispatchChange(s: DeviceSnapshot) {
	window.dispatchEvent(new CustomEvent('device-mode-change', { detail: s }));
}

export function getDeviceSnapshot(): DeviceSnapshot {
	if (!current) current = snapshot(defaultBreakpoints);
	return current;
}

export function installDeviceMode(bp: Partial<Breakpoints> = {}): () => void {
	const breakpoints: Breakpoints = { ...defaultBreakpoints, ...bp };
	const update = () => {
		const next = snapshot(breakpoints);
		const changed = !current || JSON.stringify(current) !== JSON.stringify(next);
		current = next;
		applyToRoot(next);
		if (changed) dispatchChange(next);
	};

	update();

	const mqs = [
		matchMedia('(pointer: coarse)'),
		matchMedia('(pointer: fine)'),
		matchMedia('(hover: hover)'),
		matchMedia('(hover: none)'),
	];
	const onMq = () => update();
	mqs.forEach((mq) => mq.addEventListener('change', onMq));

	const onResize = () => update();
	window.addEventListener('resize', onResize);
	window.addEventListener('orientationchange', onResize);

	const vv = window.visualViewport;
	const onVv = () => update();
	if (vv) vv.addEventListener('resize', onVv);

	return () => {
		mqs.forEach((mq) => mq.removeEventListener('change', onMq));
		window.removeEventListener('resize', onResize);
		window.removeEventListener('orientationchange', onResize);
		if (vv) vv.removeEventListener('resize', onVv);
	};
}
