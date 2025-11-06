import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { installAppViewportUnit } from './lib/viewport';
import { installDeviceMode } from './lib/deviceMode';
import './styles/app.css';
import AppShell from './layouts/AppShell';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Project from './pages/Project';
import Settings from './pages/Settings';
import Bookmark from './pages/Bookmark';
import DashboardPage from './pages/Dashboard';
import Dashboard from '@/components/dashboard/Dashboard';
import Ranking from '@/components/dashboard/Ranking';
import EcoPick from '@/components/dashboard/EcoPick';
import Landing from './pages/Landing';
import Consent from './pages/Consent';
import ConsentGuard from './components/auth/ConsentGuard';

// PWA Service Worker 등록 (개발 환경에서는 비활성화)
// if (!import.meta.env.PROD) {
//   registerSW({ immediate: true });
// }

// VisualViewport 기반의 100vh 대체 단위 설정
installAppViewportUnit();

// 장치 모드 감지 설치 (mobile/tablet/desktop + 입력 특성)
installDeviceMode({ mobileMax: 768, tabletMax: 1024 });

const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/consent',
    element: <Consent />,
  },
  {
    path: '/',
    element: (
      <ConsentGuard>
        <AppShell />
      </ConsentGuard>
    ),
    children: [
      { index: false, element: <Home /> },
      { path: 'chat', element: <Home /> },
      { path: 'chat/mock', element: <Chat /> },
      { path: 'chat/mock/:chatId', element: <Chat /> },
      { path: 'project', element: <Project /> },
      { path: 'settings', element: <Settings /> },
      { path: 'bookmark', element: <Bookmark /> },
      {
        path: 'dashboard',
        element: <DashboardPage />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'ranking', element: <Ranking /> },
          { path: 'eco-pick', element: <EcoPick /> },
        ],
      },
    ],
  },
]);

const root = createRoot(document.getElementById('app')!);
root.render(
  React.createElement(React.StrictMode, null, React.createElement(RouterProvider, { router })),
);
