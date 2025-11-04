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

  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;

  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  onStopGeneration: () => void;
  setOnStopGeneration: (fn: () => void) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [onStopGeneration, setOnStopGeneration] = useState(() => () => {});

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    window.dispatchEvent(new CustomEvent('project-create-close'));
  }, []);
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((v) => !v);
    window.dispatchEvent(new CustomEvent('project-create-close'));
  }, []);

  const collapseSidebar = useCallback(() => {
    setIsSidebarCollapsed(true);
    window.dispatchEvent(new CustomEvent('project-create-close'));
  }, []);
  const expandSidebar = useCallback(() => {
    setIsSidebarCollapsed(false);
    window.dispatchEvent(new CustomEvent('project-create-close'));
  }, []);
  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((v) => !v);
    window.dispatchEvent(new CustomEvent('project-create-close'));
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen((v) => !v), []);

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
      isSettingsOpen,
      openSettings,
      closeSettings,
      toggleSettings,
      isLoading,
      setIsLoading,
      onStopGeneration,
      setOnStopGeneration,
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
      isSettingsOpen,
      openSettings,
      closeSettings,
      toggleSettings,
      isLoading,
      onStopGeneration,
    ],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider');
  return ctx;
}
