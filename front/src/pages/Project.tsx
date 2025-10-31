import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatCard from '@/components/project/ChatCard';
import { mockProjectList } from '@/data/mockData';
import { generateChatId } from '@/utils/id';
import { ICON_SIZE } from '@/constants/ui';
import type { ProjectLocationState } from '@/types/navigation.types';
import '@/styles/pages/project.css';

export default function Project() {
  const location = useLocation();
  const navigate = useNavigate();

  // 타입 안전한 방식으로 location state 추출
  const locationState = location.state as ProjectLocationState | undefined;
  const projectId = locationState?.projectId ?? NaN;

  const project = useMemo(() => mockProjectList.find((p) => p.id === projectId), [projectId]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    if (!menuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  // 메뉴 액션 핸들러들
  const handleRenameProject = useCallback(() => {
    setMenuOpen(false);
    // TODO: 프로젝트 이름 변경 모달 열기
    // 실제 구현 시 onRenameProject prop 또는 상태 관리 사용
  }, []);

  const handleDeleteProject = useCallback(() => {
    setMenuOpen(false);
    // TODO: 삭제 확인 모달 열기
    // 실제 구현 시 onDeleteProject prop 또는 상태 관리 사용
  }, []);

  // 채팅 카드 클릭 핸들러
  const handleChatClick = useCallback(
    (chatId: number) => {
      navigate(`/chat/${chatId}`, { state: { chatId, projectId } });
    },
    [navigate, projectId],
  );

  // 프로젝트 화면에서 새 채팅 시작
  const handleSendFromProject = useCallback(
    (message: string) => {
      const newChatId = generateChatId();
      navigate(`/chat/${newChatId}`, {
        state: { chatId: newChatId, projectId, isNew: true, message },
      });
    },
    [navigate, projectId],
  );

  // 전역 ChatInput(바텀바)에서 보낸 메시지를 프로젝트 화면에서 새 채팅으로 연결
  useEffect(() => {
    const onChatSend = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (!detail?.message) return;
      handleSendFromProject(detail.message);
    };
    window.addEventListener('chat-send', onChatSend as EventListener);
    return () => window.removeEventListener('chat-send', onChatSend as EventListener);
  }, [handleSendFromProject]);

  if (!project) {
    return (
      <div className="project-page-container">
        <div className="project-page-hero">
          <div className="project-page-hero-inner">
            <h1 className="project-page-title">프로젝트를 선택하세요</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-page-container">
      <div className="project-page-hero">
        <div className="project-page-hero-inner">
          <div className="project-page-header-row">
            <h1 className="project-page-title">
              <img
                src="/icons/folder_open.svg"
                alt=""
                width={ICON_SIZE.MD}
                height={ICON_SIZE.MD}
                aria-hidden="true"
              />
              {project.title}
            </h1>
            <div className="project-page-actions" ref={menuRef}>
              <button
                className="project-page-more-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="더보기 메뉴"
                aria-expanded={menuOpen}
              >
                <img
                  src="/icons/menu.svg"
                  alt=""
                  width={ICON_SIZE.SM}
                  height={ICON_SIZE.SM}
                  aria-hidden="true"
                />
              </button>
              {menuOpen && (
                <div className="project-page-menu" role="menu">
                  <button
                    className="project-page-menu-item"
                    role="menuitem"
                    onClick={handleRenameProject}
                  >
                    <img
                      src="/icons/edit.svg"
                      alt=""
                      width={ICON_SIZE.SM}
                      height={ICON_SIZE.SM}
                      aria-hidden="true"
                    />
                    <span>이름 바꾸기</span>
                  </button>
                  <button
                    className="project-page-menu-item"
                    role="menuitem"
                    onClick={handleDeleteProject}
                  >
                    <img
                      src="/icons/error.svg"
                      alt=""
                      width={ICON_SIZE.SM}
                      height={ICON_SIZE.SM}
                      aria-hidden="true"
                    />
                    <span>프로젝트 삭제</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="project-page-subtitle">{project.chats.length}개의 채팅</p>
        </div>
      </div>

      <div className="project-page-content">
        {project.chats.length > 0 ? (
          <div className="project-page-chats">
            {project.chats.map((chat) => (
              <ChatCard
                key={chat.id}
                id={chat.id}
                title={chat.title}
                preview={chat.preview}
                timestamp={chat.timestamp}
                onClick={handleChatClick}
              />
            ))}
          </div>
        ) : (
          <div className="project-page-empty">
            <div className="project-page-empty-content">
              <img
                src="/icons/folder_open.svg"
                alt=""
                width={ICON_SIZE.XL}
                height={ICON_SIZE.XL}
                className="project-page-empty-icon"
                aria-hidden="true"
              />
              <h2 className="project-page-empty-title">아직 채팅이 없습니다</h2>
              <p className="project-page-empty-description">아래 입력창에서 새 채팅을 시작하세요</p>
            </div>
          </div>
        )}
      </div>

      {/* 입력창은 전역 Bottombar(ChatInput)를 사용하여 모든 페이지에서 동일한 UI 유지 */}
    </div>
  );
}
