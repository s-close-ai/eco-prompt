import { useEffect, useRef, useState, useMemo, type KeyboardEvent } from 'react';
import '@/styles/components/chat/chat-input.css';
import { MAX_MESSAGE_LENGTH } from '@/constants/ui';
import { uploadFile } from '@/services/api/file';
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

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask Eco prompt',
  isLoading = false,
  onStop,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // 선택된 파일들 (아직 업로드 안됨)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
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

  const handleFiles = (files: File[]) => {
    if (selectedFiles.length + files.length > MAX_FILE_COUNT) {
      showToast(`최대 ${MAX_FILE_COUNT}개의 파일만 선택할 수 있습니다.`, 'error');
      return;
    }

    const validFiles = files.filter(validateFile);

    if (validFiles.length === 0) {
      return;
    }

    // 파일을 선택만 하고 업로드는 하지 않음
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    if (disabled || isUploading) return;

    const trimmed = message.trim();

    // 파일이 있으면 먼저 업로드
    if (selectedFiles.length > 0) {
      setIsUploading(true);
      setUploadProgress({});

      try {
        // 각 파일별로 업로드 진행
        const uploadPromises = selectedFiles.map(async (file) => {
          const fileKey = file.name;
          return uploadFile(file, (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileKey]: progress,
            }));
          });
        });

        const uploaded = await Promise.all(uploadPromises);
        setUploadedFiles(uploaded);

        // 업로드 완료 후 메시지 전송
        onSend(trimmed, uploaded);
        setMessage('');
        setSelectedFiles([]);
        setUploadedFiles([]);
      } catch (error) {
        showToast('파일 업로드에 실패했습니다.', 'error');
        console.error('File upload error:', error);
      } finally {
        setIsUploading(false);
        setUploadProgress({});
      }
    } else {
      // 파일 없이 메시지만 전송
      onSend(trimmed, undefined);
      setMessage('');
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

  // 선택된 파일들의 Blob URL 생성 및 관리
  const filePreviews = useMemo(() => {
    return selectedFiles.map(file => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
  }, [selectedFiles]);

  // Blob URL 정리
  useEffect(() => {
    return () => {
      filePreviews.forEach(({ previewUrl }) => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      });
    };
  }, [filePreviews]);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if the leave target is outside the main container
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div
      className={`chat-input-container ${isDragging ? 'drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-drop-overlay">
          <p>파일을 여기에 드롭하세요</p>
        </div>
      )}
      {/* 선택된 파일 미리보기 */}
      {filePreviews.length > 0 && (
        <div className="chat-input-files-preview-horizontal">
          {filePreviews.map(({ file, previewUrl }, index) => {
            // 이미지 여부 판단
            const isImage = file.type.startsWith('image/') ||
                           file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/);

            // 업로드 진행률
            const progress = uploadProgress[file.name];
            const isFileUploading = progress !== undefined;

            return (
              <div key={index} className="file-preview-item-horizontal">
                {isImage ? (
                  <div className="file-preview-thumbnail">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt={file.name}
                      />
                    )}
                    {/* 업로드 중일 때 프로그레스 오버레이 */}
                    {isFileUploading && (
                      <div className="file-upload-overlay">
                        <div className="file-upload-progress-circle">
                          <span>{progress}%</span>
                        </div>
                      </div>
                    )}
                    {!isFileUploading && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="file-preview-remove-overlay"
                        title="삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="file-preview-document">
                    <div
                      className="file-preview-icon-large"
                      style={{ backgroundColor: getFileColor(file.name) }}
                    >
                      📄
                    </div>
                    <div className="file-preview-document-info">
                      <span className="file-preview-name-truncate">{file.name}</span>
                      <span className="file-preview-type">
                        {file.type.split('/')[1]?.toUpperCase() || getFileExtension(file.name).toUpperCase()}
                      </span>
                    </div>
                    {/* 업로드 중일 때 프로그레스 오버레이 */}
                    {isFileUploading && (
                      <div className="file-upload-overlay">
                        <div className="file-upload-spinner"></div>
                      </div>
                    )}
                    {!isFileUploading && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="file-preview-remove-overlay"
                        title="삭제"
                      >
                        ✕
                      </button>
                    )}
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
          disabled={disabled || isLoading || isUploading || selectedFiles.length >= MAX_FILE_COUNT}
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
            disabled={!message.trim() && selectedFiles.length === 0 || disabled || isUploading}
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
