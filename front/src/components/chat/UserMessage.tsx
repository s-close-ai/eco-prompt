import { useEffect, useRef, useState } from 'react';
import '@/styles/components/chat/user-message.css';
import { MAX_MESSAGE_LENGTH } from '@/constants/ui';
import type { MessageFileAttachment } from '@/types/api/file.types';

interface UserMessageProps {
  message: string;
  onUpdate: (newMessage: string) => void;
  isLastUserMessage?: boolean;
  attachments?: MessageFileAttachment[];
}

// 파일 타입별 색상
const getFileColor = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return '#EF4444'; // 빨강
    case 'txt':
      return '#3B82F6'; // 파랑
    case 'csv':
      return '#10B981'; // 초록
    case 'jpg':
    case 'jpeg':
    case 'png':
      return '#8B5CF6'; // 보라
    default:
      return '#6B7280'; // 회색
  }
};

export default function UserMessage({
  message,
  onUpdate,
  isLastUserMessage = false,
  attachments = [],
}: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);
  const [copied, setCopied] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleUpdate = () => {
    if (editedMessage.trim()) {
      onUpdate(editedMessage.trim());
      setIsEditing(false);
      setShowAlert(false);
    }
  };

  const handleEditInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length > MAX_MESSAGE_LENGTH) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }
    setEditedMessage(newValue);
    setShowAlert(false);
  };

  // textarea 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedMessage, isEditing]);

  if (isEditing) {
    const isUnchanged = editedMessage.trim() === message.trim();

    return (
      <div className="user-message-container">
        <div className="user-message-editor">
          <textarea
            ref={textareaRef}
            value={editedMessage}
            onChange={handleEditInput}
            className="user-message-textarea"
          />
          <div className="user-message-edit-actions">
            <button onClick={handleUpdate} disabled={isUnchanged || !editedMessage.trim()}>Save</button>
            <button onClick={() => {
              setIsEditing(false);
              setShowAlert(false);
            }}>Cancel</button>
          </div>
          {showAlert && (
            <div className="user-message-alert">
              최대 {MAX_MESSAGE_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="user-message-container">
      {/* 첨부 파일 섹션 */}
      {attachments && attachments.length > 0 && (
        <div className="user-message-attachments-section">
          {attachments.map((file, index) => {
            // contentType 또는 파일명으로 이미지 여부 판단
            const isImage = file.contentType?.startsWith('image/') ||
                           file.originalFileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/);
            // 이미지는 thumbnailUrl(로컬 Blob) 우선, 없으면 fileUrl 사용
            const imageUrl = file.thumbnailUrl || file.fileUrl;
            // 다운로드는 thumbnailUrl 우선 (방금 업로드한 파일은 Blob URL 또는 presigned URL)
            const downloadUrl = file.thumbnailUrl || file.fileUrl;

            return (
              <div key={index} className="user-message-attachment">
                {isImage ? (
                  <a
                    href={downloadUrl}
                    download={file.originalFileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="user-message-image-link"
                  >
                    <div className="user-message-image">
                      <img src={imageUrl} alt={file.originalFileName} />
                    </div>
                  </a>
                ) : (
                  <a
                    href={downloadUrl}
                    download={file.originalFileName}
                    className="user-message-file"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div
                      className="user-message-file-icon"
                      style={{ backgroundColor: getFileColor(file.originalFileName) }}
                    >
                      📄
                    </div>
                    <div className="user-message-file-info">
                      <span className="user-message-file-name">{file.originalFileName}</span>
                      <span className="user-message-file-type">
                        {file.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 메시지 섹션 */}
      <div className="user-message">
        <p className="user-message-text">{message}</p>
      </div>
      <div className="user-message-actions">
        {isLastUserMessage && (
          <button onClick={() => setIsEditing(true)} title="수정">
            <img src="/icons/edit.svg" alt="수정" width={16} height={16} />
          </button>
        )}
        <button onClick={handleCopy} title="복사" className="user-message-copy-btn">
          <img src="/icons/copy.svg" alt="복사" width={16} height={16} />
          {copied && <span className="user-message-copied">복사됨!</span>}
        </button>
      </div>
    </div>
  );
}
