import MenuIcon from '@/assets/icons/menu.svg?react';
import ProfileIcon from '@/assets/icons/profile.svg?react';
import HeaderImage from '@/assets/images/ep_header.png';
import '@/styles/components/common/topbar.css';
import { useSidebarStore } from '@/stores/useSidebarStore';

export default function Topbar() {
  const { toggleOpen } = useSidebarStore();

  const handleProfileClick = () => {
    // TODO: 프로필 페이지 네비게이션 구현
    console.log('프로필 클릭');
  };

  return (
    <header className="topbar">
      <div className="topbar-content">
        <button aria-label="메뉴 열기" className="icon-button" onClick={toggleOpen}>
          <MenuIcon />
        </button>

        <img src={HeaderImage} alt="Eco Prompt" className="topbar-logo" />

        <button aria-label="프로필" className="icon-button" onClick={handleProfileClick}>
          <ProfileIcon />
        </button>
      </div>
    </header>
  )
}