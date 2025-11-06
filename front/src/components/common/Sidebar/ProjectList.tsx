import { ProjectListItem } from './ProjectListItem';
import type { SidebarProjectItem } from '@/types/sidebar.types';

interface ProjectListProps {
  projects: SidebarProjectItem[];
  onMenuToggle: (projectId: number, e: React.MouseEvent | React.TouchEvent) => void;
  onNestedMenuToggle: (chatId: number, e: React.MouseEvent | React.TouchEvent) => void;
  onLoadMoreChats: (projectId: number) => void;
}

/**
 * 프로젝트 목록 전체를 렌더링하는 컴포넌트
 */
export function ProjectList({
  projects,
  onMenuToggle,
  onNestedMenuToggle,
  onLoadMoreChats,
}: ProjectListProps) {
  // 프로젝트가 없으면 아무것도 렌더링하지 않음
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="sidebar-section">
      <h3 className="sidebar-section-title">프로젝트</h3>
      <ul className="sidebar-list">
        {projects.map((project) => (
          <ProjectListItem
            key={project.projectId}
            project={project}
            onMenuToggle={(e) => onMenuToggle(project.projectId, e)}
            onNestedMenuToggle={onNestedMenuToggle}
            onLoadMoreChats={onLoadMoreChats}
          />
        ))}
      </ul>
    </div>
  );
}
