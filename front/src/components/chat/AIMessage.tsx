import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '@/styles/components/chat/ai-message.css';

interface AIMessageProps {
  message: string;
  timestamp?: Date;
}

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function CodeBlock({ inline, className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (!inline && language) {
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-block-language">{language}</span>
          <button className="code-copy-btn" onClick={handleCopy} aria-label="코드 복사" type="button">
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <img src="/icons/copy.svg" alt="복사" width={16} height={16} />
            )}
          </button>
        </div>
        <div className="code-block-header">
          <span className="code-block-language">{language}</span>
          <button className="code-copy-btn" onClick={handleCopy} aria-label="코드 복사" type="button">
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <img src="/icons/copy.svg" alt="복사" width={16} height={16} />
            )}
          </button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          style={oneLight}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 8px 8px',
            padding: '16px',
            backgroundColor: '#fafafa',
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  }

  return <code className={className}>{children}</code>;
}

export default function AIMessage({ message }: AIMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="ai-message-container">
      <div className="ai-message">
        <div className="ai-message-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,
            }}
          >
            {message}
          </ReactMarkdown>
        </div>
        <button onClick={handleCopy} className="ai-message-copy-btn" title="복사" type="button">
          <img src="/icons/copy.svg" alt="복사" width={16} height={16} />
          {copied && <span className="ai-message-copied">복사됨!</span>}
        </button>
      </div>
    </div>
  );
}
