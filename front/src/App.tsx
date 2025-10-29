import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/components/common/Topbar'
import Bottombar from '@/components/common/Bottombar'
import Sidebar from '@/components/common/Sidebar'

function App() {
  const location = useLocation()

  // Bottombar를 표시할 경로들 (dashboard, ranking, ecopicks)
  const showBottombar = ['/', '/dashboard', '/ranking', '/ecopicks', '/bookmark', '/settings'].includes(location.pathname)

  return (
    <div className="flex h-screen">
      {/* Sidebar는 모바일/태블릿에서 오버레이, 데스크탑에서 레이아웃에 포함 */}
      <Sidebar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 relative">
        {/* TopBar: 모바일 + 태블릿에만 표시 */}
        <Header />

        {/* 메인 콘텐츠 - Topbar와 Bottombar 사이 영역만 차지 */}
        <main className={`absolute inset-0 top-[8vh] overflow-auto md:top-[8vh] md:bottom-0 lg:top-0 lg:bottom-0 ${showBottombar ? 'bottom-[10vh]' : 'bottom-0'}`}>
          <Outlet />
        </main>

        {showBottombar && <Bottombar />}
      </div>
    </div>
  )
}

export default App
