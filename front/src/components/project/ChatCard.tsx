import { memo } from 'react';
import { formatShortDate } from '@/utils/date';
import '@/styles/pages/project.css';

interface ChatCardProps {
  id: number;
  title: string;
  preview?: string;
  timestamp?: string | number | Date;
  onClick: (chatId: number) => void;
}

function ChatCard({ id, title, preview, timestamp, onClick }: ChatCardProps) {
  const formattedDate = formatShortDate(timestamp);

  const handleClick = () => {
    onClick(id);
  };

  return (
    <button className="project-chat-card" onClick={handleClick} aria-label={`${title} 채팅 열기`}>
      <div className="project-chat-card__title-row">
        <span className="project-chat-card__title">{title}</span>
        {formattedDate && <span className="project-chat-card__date">{formattedDate}</span>}
      </div>
      {preview && <p className="project-chat-card__preview">{preview}</p>}
    </button>
  );
}

// React.memo로 불필요한 리렌더링 방지
export default memo(ChatCard);
