import { useState } from 'react';
import '@/styles/components/chat/user-message.css';

interface UserMessageProps {
  message: string;
  onUpdate: (newMessage: string) => void;
  isLastUserMessage?: boolean;
}

export default function UserMessage({ message, onUpdate, isLastUserMessage = false }: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      // You can add a visual confirmation here if you want
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleUpdate = () => {
    onUpdate(editedMessage);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="user-message-container">
        <div className="user-message-editor">
          <textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            className="user-message-textarea"
          />
          <div className="user-message-edit-actions">
            <button onClick={handleUpdate}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-message-container">
      <div className="user-message">
        <p className="user-message-text">{message}</p>
      </div>
      <div className="user-message-actions">
        {isLastUserMessage && (
          <button onClick={() => setIsEditing(true)} title="수정">
            <img src="/icons/edit.svg" alt="수정" width={16} height={16} />
          </button>
        )}
        <button onClick={handleCopy} title="복사">
          <img src="/icons/copy.svg" alt="복사" width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
