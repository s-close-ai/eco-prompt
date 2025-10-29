import { Outlet, useLocation } from 'react-router-dom';
import { AppShellProvider, useAppShell } from '../context/AppShellContext';
import Topbar from '../components/common/Topbar';
import Sidebar from '../components/common/Sidebar';
import Bottombar from '../components/common/Bottombar';
import useDeviceMode from '../hooks/useDeviceMode';

function ShellBody() {
	const location = useLocation();
	const mode = useDeviceMode();
	const { isSidebarCollapsed, isSidebarOpen } = useAppShell();
	const isChat = location.pathname.startsWith('/chat');
	const bottomVariant: 'chat' | 'menu' | null = isChat ? 'chat' : mode === 'mobile' ? 'menu' : null;

	const shellClass = [
		'app-shell',
		mode === 'desktop' ? 'has-desktop-sidebar' : '',
		mode === 'desktop' && isSidebarCollapsed ? 'is-sidebar-collapsed' : '',
		mode === 'tablet' && isSidebarOpen ? 'has-tablet-sidebar-open' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={shellClass}>
			<Topbar />
			<Sidebar />
			<main className="app-main">
				<Outlet />
			</main>
			{bottomVariant ? <Bottombar variant={bottomVariant} /> : null}
		</div>
	);
}

export function AppShell() {
	return (
		<AppShellProvider>
			<ShellBody />
		</AppShellProvider>
	);
}

export default AppShell;
