import React from 'react';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';
import PromptScore from './PromptScore';
import ErrorMessage from './ErrorMessage';
import ChatLoading from './ChatLoading';
import type { ChatMessage } from '@/types/chat.types';

interface MessageListProps {
  messages: ChatMessage[];
  lastUserMessageId: string;
  lastMessageId: string;
  onEditAndResendMessage: (messageId: string, newMessage: string) => void;
  onRetry: (errorMessageId: string) => void;
}

/**
 * 메시지 목록을 그룹화하여 렌더링하는 컴포넌트
 * User 메시지를 기준으로 그룹을 나누고, 각 그룹에는 User 메시지, 점수, AI 응답, 에러 등이 포함됨
 */
export function MessageList({
  messages,
  lastUserMessageId,
  lastMessageId,
  onEditAndResendMessage,
  onRetry,
}: MessageListProps) {
  const grouped: React.JSX.Element[] = [];
  let currentGroup: React.JSX.Element[] = [];
  let currentUserMsgId = '';
  let isCurrentGroupStreaming = false;

  messages.forEach((msg) => {
    if (msg.type === 'user') {
      // 이전 그룹이 있으면 저장
      if (currentGroup.length > 0) {
        grouped.push(
          <div
            key={currentUserMsgId}
            className={`chat-message-group ${isCurrentGroupStreaming ? 'streaming' : 'completed'}`}
            data-message-id={currentUserMsgId}
          >
            {currentGroup}
          </div>,
        );
      }
      // 새 그룹 시작
      currentUserMsgId = msg.id;
      isCurrentGroupStreaming = false;
      currentGroup = [
        <UserMessage
          key={`user-${msg.id}`}
          message={msg.message}
          onUpdate={(newMessage) => onEditAndResendMessage(msg.id, newMessage)}
          isLastUserMessage={msg.id === lastUserMessageId}
        />,
      ];
      if (msg.score) {
        currentGroup.push(
          <PromptScore
            key={`score-${msg.id}`}
            scores={msg.score}
            totalScore={msg.score?.totalScore}
          />,
        );
      }
    } else if (msg.type === 'ai') {
      if (msg.isStreaming) {
        isCurrentGroupStreaming = true;
      }
      currentGroup.push(
        <AIMessage
          key={`ai-${msg.id}`}
          message={msg.message}
          timestamp={msg.timestamp}
          isStreaming={msg.isStreaming}
        />,
      );
    } else if (msg.type === 'loading') {
      isCurrentGroupStreaming = true;
      currentGroup.push(<ChatLoading key={`loading-${msg.id}`} />);
    } else if (msg.type === 'error') {
      currentGroup.push(
        <ErrorMessage
          key={`error-${msg.id}`}
          message={msg.message}
          onRetry={() => onRetry(msg.id)}
          isLastError={msg.id === lastMessageId}
        />,
      );
    }
  });

  // 마지막 그룹 추가
  if (currentGroup.length > 0) {
    grouped.push(
      <div
        key={currentUserMsgId}
        className={`chat-message-group ${isCurrentGroupStreaming ? 'streaming' : 'completed'}`}
        data-message-id={currentUserMsgId}
      >
        {currentGroup}
      </div>,
    );
  }

  return <>{grouped}</>;
}
