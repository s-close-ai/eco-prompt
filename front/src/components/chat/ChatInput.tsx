import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import '@/styles/components/chat/chat-input.css';
import { MAX_MESSAGE_LENGTH } from '@/constants/ui';
import { uploadFiles } from '@/services/api/file';
import type { UploadedFileInfo } from '@/types/api/file.types';
import { useToast } from '@/context/ToastContext';

interface ChatInputProps {
  onSend: (message: string, uploadedFiles?: UploadedFileInfo[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  onStop?: () => void;
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'txt', 'csv', 'pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_COUNT = 3;

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask Eco prompt',
  isLoading = false,
  onStop,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const validateFile = (file: File): boolean => {
    const extension = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      showToast(`허용되지 않는 파일 형식입니다. (허용: ${ALLOWED_EXTENSIONS.join(', ')})`, 'error');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast(`파일 크기는 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 가능합니다.`, 'error');
      return false;
    }

    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (uploadedFiles.length + files.length > MAX_FILE_COUNT) {
      showToast(`최대 ${MAX_FILE_COUNT}개의 파일만 선택할 수 있습니다.`, 'error');
      return;
    }

    const validFiles = files.filter(validateFile);

    if (validFiles.length === 0) {
      return;
    }

    // 파일 업로드 시작
    setIsUploading(true);

    try {
      const uploaded = await uploadFiles(validFiles);
      setUploadedFiles(prev => [...prev, ...uploaded]);
      showToast('파일 업로드가 완료되었습니다.', 'success');
    } catch (error) {
      showToast('파일 업로드에 실패했습니다.', 'error');
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];

    // Object URL 정리 (메모리 누수 방지)
    if (fileToRemove.thumbnailUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.thumbnailUrl);
    }
    if (fileToRemove.fileUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.fileUrl);
    }

    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (message.trim() && !disabled && !isUploading) {
      const trimmed = message.trim();
      onSend(trimmed, uploadedFiles.length > 0 ? uploadedFiles : undefined);
      setMessage('');

      // Object URL 정리
      uploadedFiles.forEach(file => {
        if (file.thumbnailUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(file.thumbnailUrl);
        }
        if (file.fileUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(file.fileUrl);
        }
      });

      setUploadedFiles([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length > MAX_MESSAGE_LENGTH) {
      showToast(`최대 ${MAX_MESSAGE_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.`, 'error');
      return;
    }
    setMessage(newValue);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // 모바일 키보드가 올라올 때 스크롤을 맨 아래로 이동
  const handleFocus = () => {
    // 키보드가 완전히 올라온 후 스크롤 처리
    requestAnimationFrame(() => {
      setTimeout(() => {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
          chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 300);
    });
  };

  // 키보드가 올라올 때 viewport 변화 감지 및 스크롤 처리
  useEffect(() => {
    let initialHeight = window.visualViewport?.height || window.innerHeight;
    
    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      
      // 키보드가 올라왔을 때 (높이가 줄어들었을 때)
      if (currentHeight < initialHeight) {
        requestAnimationFrame(() => {
          const chatMessages = document.querySelector('.chat-messages');
          if (chatMessages && textareaRef.current === document.activeElement) {
            chatMessages.scrollTo({
              top: chatMessages.scrollHeight,
              behavior: 'smooth',
            });
          }
        });
      }
      
      initialHeight = currentHeight;
    };

    // visualViewport API 지원하는 브라우저에서 사용
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  return (
    <div className="chat-input-container">
      {uploadedFiles.length > 0 && (
        <div className="chat-input-files-preview-horizontal">
          {uploadedFiles.map((file, index) => {
            // contentType 또는 파일명으로 이미지 여부 판단
            const isImage = file.contentType?.startsWith('image/') ||
                           file.filename?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/);
            // 이미지면 fileUrl 또는 thumbnailUrl 사용
            const imageUrl = file.thumbnailUrl || file.fileUrl;

            return (
              <div key={index} className="file-preview-item-horizontal">
                {isImage ? (
                  <div className="file-preview-thumbnail">
                    <img
                      src={imageUrl}
                      alt={file.filename}
                      onError={(e) => {
                        console.error('이미지 로드 실패:', imageUrl, file);
                        // 이미지 로드 실패 시 부모 요소를 문서 카드로 대체
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="file-preview-remove-overlay"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="file-preview-document">
                    <div className="file-preview-icon-large">
                      📄
                    </div>
                    <div className="file-preview-document-info">
                      <span className="file-preview-name-truncate">{file.filename}</span>
                      <span className="file-preview-type">
                        {file.contentType?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="file-preview-remove-overlay"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="chat-input-wrapper">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".jpg,.jpeg,.png,.txt,.csv,.pdf"
          multiple
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading || isUploading || uploadedFiles.length >= MAX_FILE_COUNT}
          className="chat-input-file-btn"
          title="파일 첨부"
        >
          <img src="/icons/attachment.svg" alt="파일 첨부" width={20} height={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled || isLoading || isUploading}
          className="chat-input-textarea"
          rows={1}
        />
        {isLoading ? (
          <button onClick={onStop} className="chat-input-send-btn" title="중지">
            <img src="/icons/stop.svg" alt="중지" width={16} height={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled || isUploading}
            className="chat-input-send-btn"
            title="전송"
          >
            <img src="/icons/send.svg" alt="전송" width={16} height={16} color="white" />
          </button>
        )}
      </div>
      <div className="chat-input-footer">
        <p className="chat-input-disclaimer">
          Eco Prompt는 실수를 할 수 있고, 공유될 수 있습니다. 중요한 정보는 확인하세요.
        </p>
      </div>
    </div>
  );
}
