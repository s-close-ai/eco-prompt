import { useState, useMemo, useEffect, useRef } from 'react';
import '../../styles/components/chat/ai-message.css';
import CopyIcon from '@/assets/icons/copy.svg?react';

interface AIMessageProps {
  message: string;
  timestamp?: Date;
}

export default function AIMessage({ message }: AIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // 간단한 마크다운 파싱
  const parseMarkdown = (text: string) => {
    let html = text;
    let codeBlockIndex = 0;

    // 코드 블록 처리 (```language\ncode\n```)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, code) => {
      const trimmedCode = code.trim();
      const blockId = `code-block-${codeBlockIndex++}`;
      return `<pre data-code-id="${blockId}" data-code="${escapeHtml(trimmedCode).replace(/"/g, '&quot;')}"><code>${escapeHtml(trimmedCode)}</code></pre>`;
    });

    // 인라인 코드 처리 (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 굵은 글씨 처리 (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 줄바꿈 처리
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const formattedMessage = useMemo(() => parseMarkdown(message), [message]);

  // 코드 블록에 복사 버튼 추가
  useEffect(() => {
    if (!messageRef.current) return;

    const codeBlocks = messageRef.current.querySelectorAll('pre[data-code-id]');

    codeBlocks.forEach((pre) => {
      const codeId = pre.getAttribute('data-code-id');
      if (!codeId) return;

      // 이미 버튼이 있으면 스킵
      if (pre.querySelector('.code-copy-btn')) return;

      const button = document.createElement('button');
      button.className = 'code-copy-btn';
      button.setAttribute('aria-label', '코드 복사');
      button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
      </svg>`;

      button.addEventListener('click', async () => {
        const code = pre.getAttribute('data-code');
        if (!code) return;

        // HTML 엔티티 디코딩
        const textarea = document.createElement('textarea');
        textarea.innerHTML = code;
        const decodedCode = textarea.value;

        try {
          await navigator.clipboard.writeText(decodedCode);
          setCopiedCodeId(codeId);
          setTimeout(() => setCopiedCodeId(null), 2000);
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      });

      pre.appendChild(button);

      // 복사됨 표시
      if (copiedCodeId === codeId) {
        const copiedSpan = document.createElement('span');
        copiedSpan.className = 'code-copied';
        copiedSpan.textContent = '복사됨!';
        pre.appendChild(copiedSpan);
      }
    });
  }, [formattedMessage, copiedCodeId]);

  return (
    <div className="ai-message-container">
      <div className="ai-message">
        <div
          ref={messageRef}
          className="ai-message-text"
          dangerouslySetInnerHTML={{ __html: formattedMessage }}
        />
        <button
          onClick={handleCopy}
          className="ai-message-copy-btn"
          title="복사"
        >
          <CopyIcon />
          {copied && <span className="ai-message-copied">복사됨!</span>}
        </button>
      </div>
    </div>
  );
}

