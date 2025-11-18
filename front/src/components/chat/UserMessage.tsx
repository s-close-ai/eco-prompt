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
      <div className="user-message">
        {/* 첨부 파일 표시 */}
        {attachments && attachments.length > 0 && (
          <div className="user-message-attachments">
            {attachments.map((file, index) => {
              const isImage = file.contentType?.startsWith('image/');
              return (
                <div key={index} className="user-message-attachment">
                  {isImage ? (
                    <div className="user-message-image">
                      <img src={file.fileUrl} alt={file.filename} />
                    </div>
                  ) : (
                    <div className="user-message-file">
                      <div className="user-message-file-icon">
                        📄
                      </div>
                      <div className="user-message-file-info">
                        <span className="user-message-file-name">{file.filename}</span>
                        <span className="user-message-file-type">
                          {file.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
