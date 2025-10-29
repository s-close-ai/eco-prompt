import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface AppShellContextValue {
	isSidebarOpen: boolean;
	openSidebar: () => void;
	closeSidebar: () => void;
	toggleSidebar: () => void;

	isSidebarCollapsed: boolean;
	collapseSidebar: () => void;
	expandSidebar: () => void;
	toggleSidebarCollapsed: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
	const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
	const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);

	const collapseSidebar = useCallback(() => setIsSidebarCollapsed(true), []);
	const expandSidebar = useCallback(() => setIsSidebarCollapsed(false), []);
	const toggleSidebarCollapsed = useCallback(() => setIsSidebarCollapsed((v) => !v), []);

	const value = useMemo(
		() => ({
			isSidebarOpen,
			openSidebar,
			closeSidebar,
			toggleSidebar,
			isSidebarCollapsed,
			collapseSidebar,
			expandSidebar,
			toggleSidebarCollapsed,
		}),
		[
			isSidebarOpen,
			openSidebar,
			closeSidebar,
			toggleSidebar,
			isSidebarCollapsed,
			collapseSidebar,
			expandSidebar,
			toggleSidebarCollapsed,
		],
	);

	return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
	const ctx = useContext(AppShellContext);
	if (!ctx) throw new Error('useAppShell must be used within AppShellProvider');
	return ctx;
}
