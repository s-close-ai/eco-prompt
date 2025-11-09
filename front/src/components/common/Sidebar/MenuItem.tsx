import { ICON_SIZE } from '@/constants/ui';

interface MenuItemProps {
  icon: string;
  label: string;
  onClick: () => void;
}

export function MenuItem({ icon, label, onClick }: MenuItemProps) {
  return (
    <button className="sidebar-list-item-menu-item" onClick={onClick}>
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
