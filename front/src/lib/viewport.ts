type ViewportCleanup = () => void;

export function installAppViewportUnit(): ViewportCleanup {
	const root = document.documentElement;

	function setAppVh() {
		const vv = window.visualViewport;
		const height = vv ? vv.height : window.innerHeight;
		root.style.setProperty('--app-vh', `${height * 0.01}px`);
	}

	setAppVh();

	const vv = window.visualViewport;
	const listeners: Array<() => void> = [];

	if (vv) {
		const onResize = () => setAppVh();
		const onScroll = () => setAppVh();
		vv.addEventListener('resize', onResize);
		vv.addEventListener('scroll', onScroll);
		listeners.push(() => vv.removeEventListener('resize', onResize));
		listeners.push(() => vv.removeEventListener('scroll', onScroll));
	}

	const onWinResize = () => setAppVh();
	window.addEventListener('resize', onWinResize);
	window.addEventListener('orientationchange', onWinResize);
	listeners.push(() => window.removeEventListener('resize', onWinResize));
	listeners.push(() => window.removeEventListener('orientationchange', onWinResize));

	return () => listeners.forEach((fn) => fn());
}
