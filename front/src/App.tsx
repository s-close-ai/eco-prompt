import { Outlet } from 'react-router-dom'
import Header from '@/components/common/Topbar'
import Bottombar from '@/components/common/Bottombar'
import Sidebar from '@/components/common/Sidebar'

function App() {
  return (
    <div className="flex h-screen">
      {/* Sidebar는 모바일/태블릿에서 오버레이, 데스크탑에서 레이아웃에 포함 */}
      <Sidebar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* TopBar: 모바일 + 태블릿에만 표시 */}
        <Header />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-auto p-6 pt-[10vh] pb-[12vh] md:pt-[10vh] md:pb-6 lg:pt-6 lg:pb-6">
          <Outlet />
        </main>

        {/* BottomBar: 모바일에만 표시 */}
        <Bottombar />
      </div>
    </div>
  )
}

export default App
