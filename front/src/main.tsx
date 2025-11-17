import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { installAppViewportUnit } from './lib/viewport';
import { installDeviceMode } from './lib/deviceMode';
import './styles/app.css';
import AppShell from './layouts/AppShell';
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
import { initLogLens } from 'soo1-loglens';

// React 앱의 경우 (main.tsx 또는 App.tsx)
initLogLens({
  domain: import.meta.env.VITE_LOGLENS_API_URL || 'http://localhost:8080',  // 백엔드 도메인 (api/logs/frontend로 로그 전송)
  maxLogs: 1000,                       // 최대 로그 보관 개수
  autoFlushEnabled: true,              // 자동 로그 전송 여부
  autoFlushInterval: 30000,            // 30초마다 전송
  captureErrors: true,                  // 에러 자동 수집
  isProduction: true
});

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
    element: (
      <ConsentGuard>
        <AppShell />
      </ConsentGuard>
    ),
    children: [
      { path: '/chat', element: <Chat /> },
      { path: '/project', element: <Project /> },
      { path: '/settings', element: <Settings /> },
      { path: '/bookmark', element: <Bookmark /> },
      {
        path: '/dashboard',
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
root.render(React.createElement(RouterProvider, { router }));
