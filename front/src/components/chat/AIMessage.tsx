import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
				<SyntaxHighlighter
					language={language}
					style={vscDarkPlus}
					customStyle={{
						margin: '12px 0',
						borderRadius: '8px',
						fontSize: '14px',
						padding: '16px',
						paddingTop: '40px',
					}}
				>
					{codeString}
				</SyntaxHighlighter>
				<button className="code-copy-btn" onClick={handleCopy} aria-label="코드 복사" type="button">
					<img src="/icons/copy.svg" alt="복사" width={16} height={16} />
				</button>
				{copied && <span className="code-copied">복사됨!</span>}
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
