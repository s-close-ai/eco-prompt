import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import '@/styles/components/chat/ai-message.css';

interface AIMessageProps {
  message: string;
  timestamp?: Date;
  isStreaming?: boolean;
}

export default function AIMessage({ message, isStreaming }: AIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCodeCopy = async (code: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(codeId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // 메시지가 비어있고 스트리밍 중도 아니면 렌더링하지 않음
  if (message === '' && !isStreaming) {
    return null;
  }

  return (
    <div className="ai-message-container">
      <div className="ai-message">
        <div className="ai-message-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

                if (!inline && match) {
                  return (
                    <div className="code-block-wrapper">
                      <div className="code-block-header">
                        <span className="code-language">{match[1]}</span>
                        <button
                          className="code-copy-btn"
                          onClick={() => handleCodeCopy(codeString, codeId)}
                          aria-label="코드 복사"
                        >
                          {copiedCodeId === codeId ? (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M20 6L9 17L4 12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <img src="/icons/copy.svg" alt="복사" />
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneLight}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0 0 8px 8px',
                          background: '#fafafa',
                        }}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

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
        {isStreaming && <span className="streaming-cursor">▍</span>}
        {!isStreaming && message && (
          <button onClick={handleCopy} className="ai-message-copy-btn" title="복사">
            <img src="/icons/copy.svg" alt="복사" />
            {copied && <span className="ai-message-copied">복사됨!</span>}
          </button>
        )}
      </div>
    </div>
  );
}
