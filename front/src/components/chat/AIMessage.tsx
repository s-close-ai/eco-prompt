import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import '@/styles/components/chat/ai-message.css';
import type { MessageFileAttachment } from '@/types/api/file.types';
import CsvPreviewModal from '@/components/common/CsvPreviewModal';

interface AIMessageProps {
  message: string;
  timestamp?: Date;
  isStreaming?: boolean;
  attachments?: MessageFileAttachment[];
}

// 파일 타입별 색상 (PDF만 처리)
const getFileColor = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return '#3B82F6'; // 파랑
  }
  return '#3B82F6'; // 회색
};

export default function AIMessage({ message, isStreaming, attachments = [] }: AIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ url: string; name: string } | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCodeCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleFileClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string, filename: string) => {
    e.preventDefault();

    // CSV 파일인지 확인
    const isCsv = filename.toLowerCase().endsWith('.csv');

    if (isCsv) {
      // CSV 미리보기 모달 열기
      setCsvPreview({ url, name: filename });
    } else {
      // 다른 파일은 새 탭에서 열기
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // 메시지가 비어있고 스트리밍 중도 아니면 렌더링하지 않음
  if (message === '' && !isStreaming && attachments.length === 0) {
    return null;
  }

  return (
    <div className="ai-message-container">
      <div className="ai-message">
        <div className="ai-message-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false }]]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');

                // ``` 로 감싼 코드 블록 판단:
                // 1. className이 있으면 (language-xxx) → 언어 명시된 블록 코드
                // 2. className은 없지만 여러 줄이면 → 언어 없는 블록 코드
                const isCodeBlock = className || codeString.includes('\n');

                if (isCodeBlock) {
                  // 언어가 명시된 경우 해당 언어 사용, 없으면 plain text
                  const language = match ? match[1] : 'text';
                  const displayLanguage = match ? match[1] : 'plain text';

                  return (
                    <div className="code-block-wrapper">
                      <div className="code-block-header">
                        <span className="code-language">{displayLanguage}</span>
                        <button
                          className="code-copy-btn"
                          onClick={() => handleCodeCopy(codeString)}
                          aria-label="코드 복사"
                        >
                          <img src="/icons/copy.svg" alt="복사" />
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneLight}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0 0 8px 8px',
                          background: '#fafafa',
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                // 인라인 코드 (`` ` `` 로 감싼 것)
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message}
          </ReactMarkdown>
        </div>

        {/* 파일 첨부 섹션 */}
        {attachments && attachments.length > 0 && (
          <div className="ai-message-file-download-section">
            {attachments.map((file, index) => (
              <a
                key={index}
                href={file.fileUrl}
                onClick={(e) => handleFileClick(e, file.fileUrl, file.originalFileName)}
                className="ai-message-download-link"
              >
                <div
                  className="ai-message-download-icon"
                  style={{ backgroundColor: getFileColor(file.originalFileName) }}
                >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                </div>
                <div className="ai-message-download-info">
                <span className="ai-message-download-name">{file.originalFileName}</span>
                <span className="ai-message-download-hint">클릭하여 확인</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {isStreaming && <span className="streaming-cursor">▍</span>}
        {!isStreaming && message && (
          <button onClick={handleCopy} className="ai-message-copy-btn" title="복사">
            <img src="/icons/copy.svg" alt="복사" />
            {copied && <span className="ai-message-copied">복사됨!</span>}
          </button>
        )}
      </div>

      {/* CSV 미리보기 모달 */}
      {csvPreview && (
        <CsvPreviewModal
          open={!!csvPreview}
          onClose={() => setCsvPreview(null)}
          fileUrl={csvPreview.url}
          fileName={csvPreview.name}
        />
      )}
    </div>
  );
}
