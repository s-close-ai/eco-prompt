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

// PWA Service Worker 등록
registerSW({ immediate: true });

// VisualViewport 기반의 100vh 대체 단위 설정
installAppViewportUnit();

// 장치 모드 감지 설치 (mobile/tablet/desktop + 입력 특성)
installDeviceMode({ mobileMax: 768, tabletMax: 1024 });

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'chat', element: <Chat /> },
      { path: 'chat/:chatId', element: <Chat /> },
      { path: 'project', element: <Project /> },
      { path: 'settings', element: <Settings /> },
      { path: 'bookmark', element: <Bookmark /> },
    ],
  },
]);

const root = createRoot(document.getElementById('app')!);
root.render(
  React.createElement(React.StrictMode, null, React.createElement(RouterProvider, { router })),
);
