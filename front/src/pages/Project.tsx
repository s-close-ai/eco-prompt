import { useLocation, useMemo } from 'react';
import ChatInput from '@/components/chat/ChatInput';
import { mockProjectList } from '@/data/mockData';

export default function Project() {
  const location = useLocation() as unknown as { state?: { projectId?: number } };
  const projectId = typeof location.state?.projectId === 'number' ? location.state!.projectId : NaN;
  const project = useMemo(() => mockProjectList.find((p) => p.id === projectId), [projectId]);

  const handleSend = (message: string) => {
    console.log('프로젝트 컨텍스트 입력:', project?.title, message);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28, textAlign: 'center' }}>
            프로젝트: {project?.title ?? '프로젝트를 선택하세요'}
          </h1>
          {project ? (
            <p style={{ textAlign: 'center', opacity: 0.7, fontSize: 14 }}>
              이 프로젝트의 채팅 목록만 사이드바에 펼쳐집니다.
            </p>
          ) : null}
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <ChatInput onSend={handleSend} placeholder="메시지를 입력하세요..." />
        </div>
      </div>
    </div>
  );
}


