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
  firstNewMessageId: string | null;
  onEditAndResendMessage: (messageId: string, newMessage: string) => void;
  onRetry: (errorMessageId: string) => void;
  onScoreRetry?: (userMessageId: string) => void;
}

/**
 * 메시지 목록을 그룹화하여 렌더링하는 컴포넌트
 * User 메시지를 기준으로 그룹을 나누고, 각 그룹에는 User 메시지, 점수, AI 응답, 에러 등이 포함됨
 */
export function MessageList({
  messages,
  lastUserMessageId,
  firstNewMessageId,
  onEditAndResendMessage,
  onRetry,
  onScoreRetry,
}: MessageListProps) {
  const grouped: Array<{ 
    element: React.JSX.Element; 
    isStreaming: boolean; 
    userMessageId: string;
  }> = [];
  let currentGroup: React.JSX.Element[] = [];
  let currentUserMsgId = '';
  let isCurrentGroupStreaming = false;

  messages.forEach((msg) => {
    if (msg.type === 'user') {
      // 이전 그룹이 있으면 저장
      if (currentGroup.length > 0) {
        grouped.push({
          element: (
            <div
              key={currentUserMsgId}
              className={`chat-message-group ${isCurrentGroupStreaming ? 'streaming' : 'completed'}`}
              data-message-id={currentUserMsgId}
            >
              {currentGroup}
            </div>
          ),
          isStreaming: isCurrentGroupStreaming,
          userMessageId: currentUserMsgId,
        });
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

      // 항상 PromptScore를 렌더링 (scoreState 또는 score가 있을 때)
      if (msg.scoreState) {
        // scoreState가 있으면 우선 사용
        currentGroup.push(
          <PromptScore
            key={`score-${msg.id}`}
            scoreState={msg.scoreState}
            onRetry={onScoreRetry ? () => onScoreRetry(msg.id) : undefined}
          />,
        );
      } else if (msg.score) {
        // 기존 방식: score만 있는 경우
        currentGroup.push(
          <PromptScore
            key={`score-${msg.id}`}
            scores={msg.score}
            sc_ec_0={msg.score?.sc_ec_0}
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
      // 현재 그룹의 유저 메시지가 마지막 유저 메시지인지 확인
      const isLastUserGroup = currentUserMsgId === lastUserMessageId;
      currentGroup.push(
        <ErrorMessage
          key={`error-${msg.id}`}
          message={msg.message}
          onRetry={() => onRetry(msg.id)}
          isLastError={isLastUserGroup}
        />,
      );
    }
  });

  // 마지막 그룹 추가
  if (currentGroup.length > 0) {
    grouped.push({
      element: (
        <div
          key={currentUserMsgId}
          className={`chat-message-group ${isCurrentGroupStreaming ? 'streaming' : 'completed'}`}
          data-message-id={currentUserMsgId}
        >
          {currentGroup}
        </div>
      ),
      isStreaming: isCurrentGroupStreaming,
      userMessageId: currentUserMsgId,
    });
  }

  // 마지막 completed 그룹 찾기
  let lastCompletedIndex = -1;
  for (let i = grouped.length - 1; i >= 0; i--) {
    if (!grouped[i].isStreaming) {
      lastCompletedIndex = i;
      break;
    }
  }

  // firstNewMessageId 이후의 마지막 그룹 인덱스 찾기
  let lastNewGroupIndex = -1;
  if (firstNewMessageId) {
    const firstNewMessageIndex = messages.findIndex(m => m.id === firstNewMessageId);
    if (firstNewMessageIndex !== -1) {
      // firstNewMessageId 이후의 그룹들만 찾기
      for (let i = grouped.length - 1; i >= 0; i--) {
        const groupUserMsgIndex = messages.findIndex(m => m.id === grouped[i].userMessageId);
        if (groupUserMsgIndex >= firstNewMessageIndex) {
          lastNewGroupIndex = i;
          break;
        }
      }
    }
  }

  // 절대적인 마지막 그룹 인덱스
  // const lastGroupIndex = grouped.length - 1;

  // 마지막 그룹과 마지막 completed 그룹에 클래스 추가
  const finalGrouped = grouped.map((item, index) => {
    const originalElement = item.element;
    const classes: string[] = [originalElement.props.className];
    
    // firstNewMessageId가 있고, 그 이후의 마지막 그룹에만 last-group 추가
    if (firstNewMessageId && index === lastNewGroupIndex && lastNewGroupIndex !== -1) {
      classes.push('last-group');
    }
    
    // 마지막 completed 그룹에는 last-completed 추가
    if (index === lastCompletedIndex) {
      classes.push('last-completed');
    }
    
    if (classes.length > 1) {
      return React.cloneElement(originalElement, {
        className: classes.join(' '),
      });
    }
    
    return item.element;
  });

  return <>{finalGrouped}</>;
}
