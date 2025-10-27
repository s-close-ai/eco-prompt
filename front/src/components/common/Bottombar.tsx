import '@/styles/components/common/bottombar.css';
import BookmarkIcon from '@/assets/icons/bookmark.svg?react';
import DashboardIcon from '@/assets/icons/dashboard.svg?react';
import PromptIcon from '@/assets/icons/prompt.svg?react';
import RankIcon from '@/assets/icons/rank.svg?react';
import SettingIcon from '@/assets/icons/settings.svg?react';

export default function Bottombar() {
  return (
    <footer className="bottombar">
      <div className="bottombar-content">
        <button
          aria-label="랭크"
          className="icon-button"
          onClick={() => console.log('랭크 페이지로 이동')}
        >
          <RankIcon />
        </button>
        <button
          aria-label="프롬프트"
          className="icon-button"
          onClick={() => console.log('프롬프트 페이지로 이동')}
        >
          <PromptIcon />
        </button>
        <button
          aria-label="대시보드"
          className="icon-button"
          onClick={() => console.log('대시보드 페이지로 이동')}
        >
          <DashboardIcon />
        </button>
        <button
          aria-label="북마크"
          className="icon-button"
          onClick={() => console.log('북마크 페이지로 이동')}
        >
          <BookmarkIcon />
        </button>
        <button
          aria-label="설정"
          className="icon-button"
          onClick={() => console.log('설정 페이지로 이동')}
        >
          <SettingIcon />
        </button>
      </div>
    </footer>
  )
}