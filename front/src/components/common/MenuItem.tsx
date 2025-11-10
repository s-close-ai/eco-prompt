import { ICON_SIZE } from '@/constants/ui';

export interface MenuItemProps {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
  role?: string;
}

/**
 * 재사용 가능한 메뉴 아이템 컴포넌트
 * 사이드바, 프로젝트 페이지 등에서 공통으로 사용
 */
export function MenuItem({ icon, label, onClick, className = '', role }: MenuItemProps) {
  const baseClass = className || 'sidebar-list-item-menu-item';

  return (
    <button className={baseClass} onClick={onClick} role={role}>
      <img
        src={icon}
        alt=""
        width={ICON_SIZE.SM}
        height={ICON_SIZE.SM}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  );
}
