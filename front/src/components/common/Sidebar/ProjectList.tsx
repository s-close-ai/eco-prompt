import { ProjectListItem } from './ProjectListItem';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { SidebarProjectItem } from '@/types/sidebar.types';

interface ProjectListProps {
  projects: SidebarProjectItem[];
  scrollContainer: HTMLElement | null;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onMenuToggle: (projectId: number, e: React.MouseEvent | React.TouchEvent) => void;
  onNestedMenuToggle: (chatId: number, e: React.MouseEvent | React.TouchEvent) => void;
  onLoadMoreChats: (projectId: number) => void;
}

/**
 * 프로젝트 목록 전체를 렌더링하는 컴포넌트
 */
export function ProjectList({
  projects,
  scrollContainer,
  hasMore,
  isLoading,
  onLoadMore,
  onMenuToggle,
  onNestedMenuToggle,
  onLoadMoreChats,
}: ProjectListProps) {
  // 프로젝트 목록 무한 스크롤을 위한 센티널
  // 로딩 중이거나 더 이상 불러올 항목이 없으면 감시하지 않음
  const sentinelRef = useInfiniteScroll({
    onLoadMore,
    hasMore: hasMore && !isLoading, // 로딩 중이면 더 이상 요청하지 않음
    isLoading,
    root: scrollContainer,
  });

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
            scrollContainer={scrollContainer}
            onMenuToggle={(e) => onMenuToggle(project.projectId, e)}
            onNestedMenuToggle={onNestedMenuToggle}
            onLoadMoreChats={onLoadMoreChats}
          />
        ))}
        {hasMore && !isLoading && <div ref={sentinelRef} style={{ height: '1px' }} />}
      </ul>
    </div>
  );
}
