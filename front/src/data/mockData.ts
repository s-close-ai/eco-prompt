// 임시 Mock 데이터 - 추후 API 연동 시 제거 예정

import type { ChatItem, ProjectItem } from '@/types/sidebar.types';
import type { ChatMessage } from '@/types/chat.types';
import type { RankingData, EcoPickPrompt, DashboardMetric, DashboardStats } from '@/types/dashboard.types';
export type { ChatItem, ProjectItem } from '@/types/sidebar.types';
export type { ChatMessage, PromptScore } from '@/types/chat.types';
export type { RankingData, EcoPickPrompt, DashboardMetric, DashboardStats } from '@/types/dashboard.types';

export const mockChatList: ChatItem[] = [
  { id: 1, title: '일일체팅' },
  { id: 2, title: '파일 추가' },
  { id: 3, title: '테스트 확인 완료' },
  { id: 4, title: '프로젝트 만들기 설명' },
];

export const mockProjectList: ProjectItem[] = [
  {
    id: 1,
    title: '지지스캐서 피드백',
    chats: [
      {
        id: 101,
        title: '첫 번째 피드백',
        preview: '프로젝트 초기 버전에 대한 피드백을 받았습니다...',
        timestamp: new Date(2024, 0, 25, 14, 30),
      },
      {
        id: 102,
        title: '개선 사항 논의',
        preview: 'UI/UX 개선 방향에 대해 논의했습니다...',
        timestamp: new Date(2024, 0, 26, 10, 15),
      },
      {
        id: 103,
        title: '최종 검토',
        preview: '최종 수정 사항을 확인하고 마무리했습니다...',
        timestamp: new Date(2024, 0, 27, 16, 45),
      },
    ],
  },
  {
    id: 2,
    title: '자기소개서 초안 작성',
    chats: [
      {
        id: 201,
        title: '초안 작성',
        preview: '자기소개서 초안을 작성하고 검토했습니다...',
        timestamp: new Date(2024, 0, 20, 9, 0),
      },
      {
        id: 202,
        title: '경력 기술서',
        preview: '경력 사항을 상세히 기술했습니다...',
        timestamp: new Date(2024, 0, 22, 11, 30),
      },
    ],
  },
  {
    id: 3,
    title: 'PRM 프로젝트 설계',
    chats: [
      {
        id: 301,
        title: '요구사항 분석',
        preview: '프로젝트의 주요 요구사항을 정리했습니다...',
        timestamp: new Date(2024, 0, 15, 13, 0),
      },
      {
        id: 302,
        title: 'DB 설계',
        preview: '데이터베이스 스키마를 설계했습니다...',
        timestamp: new Date(2024, 0, 16, 14, 20),
      },
      {
        id: 303,
        title: 'API 명세',
        preview: 'RESTful API 엔드포인트를 정의했습니다...',
        timestamp: new Date(2024, 0, 17, 15, 40),
      },
      {
        id: 304,
        title: 'UI/UX 설계',
        preview: '사용자 인터페이스 디자인을 완성했습니다...',
        timestamp: new Date(2024, 0, 18, 10, 10),
      },
    ],
  },
  {
    id: 4,
    title: '지지스캐서 피드백 2',
    chats: [
      {
        id: 401,
        title: '2차 피드백',
        preview: '추가 개선사항에 대한 피드백을 받았습니다...',
        timestamp: new Date(2024, 0, 28, 13, 20),
      },
    ],
  },
];

// 채팅 메시지 목 데이터
export const mockChatMessages: ChatMessage[] = [
  {
    id: 1,
    type: 'user',
    message: 'React에서 상태 관리를 위한 좋은 라이브러리를 추천해줄 수 있나요?',
    timestamp: new Date(2024, 0, 27, 14, 30),
    score: {
      clarity: 22,
      specificity: 20,
      format: 21,
      completeness: 24,
      totalScore: 87,
    },
  },
  {
    id: 2,
    type: 'ai',
    message:
      'React 상태 관리를 위한 라이브러리는 여러 가지가 있습니다:\n\n1. **Redux** - 가장 널리 사용되는 상태 관리 라이브러리로, 예측 가능한 상태 관리를 제공합니다.\n\n2. **Zustand** - 간단하고 가벼운 상태 관리 솔루션으로, Redux보다 보일러플레이트가 적습니다.\n\n3. **Recoil** - Facebook에서 만든 라이브러리로, React의 hooks와 잘 통합됩니다.\n\n4. **MobX** - 반응형 프로그래밍 방식을 사용하며, 간단한 API를 제공합니다.\n\n프로젝트 규모와 팀의 선호도에 따라 선택하시면 됩니다.',
    timestamp: new Date(2024, 0, 27, 14, 30, 15),
  },
  {
    id: 3,
    type: 'user',
    message: 'Zustand를 사용하는 간단한 예제를 보여줄 수 있나요?',
    timestamp: new Date(2024, 0, 27, 14, 32),
    score: {
      clarity: 24,
      specificity: 23,
      format: 25,
      completeness: 22,
      totalScore: 94,
    },
  },
  {
    id: 4,
    type: 'ai',
    message:
      "물론입니다! Zustand를 사용한 간단한 예제입니다:\n\n```typescript\nimport { create } from 'zustand';\n\ninterface CounterState {\n  count: number;\n  increment: () => void;\n  decrement: () => void;\n}\n\nconst useCounterStore = create<CounterState>((set) => ({\n  count: 0,\n  increment: () => set((state) => ({ count: state.count + 1 })),\n  decrement: () => set((state) => ({ count: state.count - 1 })),\n}));\n\n// 컴포넌트에서 사용\nfunction Counter() {\n  const { count, increment, decrement } = useCounterStore();\n  \n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={increment}>+</button>\n      <button onClick={decrement}>-</button>\n    </div>\n  );\n}\n```\n\n이렇게 간단하게 전역 상태를 관리할 수 있습니다!",
    timestamp: new Date(2024, 0, 27, 14, 32, 20),
  },
  {
    id: 5,
    type: 'user',
    message: 'TypeScript와 함께 사용할 때 주의할 점이 있나요?',
    timestamp: new Date(2024, 0, 27, 14, 35),
    score: {
      clarity: 21,
      specificity: 24,
      format: 23,
      completeness: 21,
      totalScore: 89,
    },
  },
  {
    id: 6,
    type: 'ai',
    message:
      'TypeScript와 함께 Zustand를 사용할 때 주의할 점들입니다:\n\n1. **인터페이스 정의**: 스토어의 상태와 액션에 대한 타입을 명확히 정의하세요.\n\n2. **Generic 사용**: create 함수에 제네릭 타입을 전달하여 타입 안정성을 확보하세요.\n\n3. **불변성**: TypeScript를 사용하더라도 상태를 직접 변경하지 말고, set 함수를 통해 업데이트하세요.\n\n4. **선택적 구독**: 필요한 상태만 구독하여 불필요한 리렌더링을 방지할 수 있습니다:\n\n```typescript\nconst count = useCounterStore((state) => state.count);\n```\n\n이렇게 하면 count만 변경될 때만 컴포넌트가 리렌더링됩니다.',
    timestamp: new Date(2024, 0, 27, 14, 35, 30),
  },
  {
    id: 7,
    type: 'user',
    message: '성능 최적화 방법도 알려주세요',
    timestamp: new Date(2024, 0, 27, 14, 37),
  },
  {
    id: 8,
    type: 'loading',
    message: '',
    timestamp: new Date(2024, 0, 27, 14, 37, 5),
  },
  {
    id: 9,
    type: 'user',
    message: '에러 처리는 어떻게 하나요?',
    timestamp: new Date(2024, 0, 27, 14, 40),
  },
  {
    id: 10,
    type: 'error',
    message: '메시지를 전송하는 중 오류가 발생했습니다.',
    timestamp: new Date(2024, 0, 27, 14, 40, 5),
  },
];

// 랭킹 Mock 데이터
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export const mockRankingData: RankingData[] = [
  {
    date: getDaysAgo(0), // 오늘 (월요일)
    rankings: [
      { rank: 1, name: '서성수', highScore: 88.1, mileage: 3546, rankChange: 'up' },
      { rank: 2, name: '공예슬', highScore: 78.6, mileage: 3226, rankChange: 'stay' },
      { rank: 3, name: '서경덕', highScore: 77.5, mileage: 4753, rankChange: 'down' },
      { rank: 4, name: '김영은', highScore: 68.6, mileage: 2796, rankChange: 'up' },
      { rank: 5, name: '김재희', highScore: 65.4, mileage: 2368, rankChange: 'down' },
      { rank: 6, name: '이권민', highScore: 64.8, mileage: 3853, rankChange: 'stay' },
      { rank: 7, name: '조현지', highScore: 62.6, mileage: 3412, rankChange: 'new' },
      { rank: 8, name: '오승연', highScore: 54.3, mileage: 2431, rankChange: 'down' },
      { rank: 9, name: '성수린', highScore: 54.3, mileage: 2439, rankChange: 'down' },
      { rank: 10, name: '김주혜', highScore: 54.3, mileage: 2439, rankChange: 'down' },
    ],
  },
  {
    date: getDaysAgo(1), // 어제 (일요일)
    rankings: [
      { rank: 1, name: '서성수', highScore: 87.5, mileage: 3500, rankChange: 'stay' },
      { rank: 2, name: '공예슬', highScore: 78.0, mileage: 3200, rankChange: 'stay' },
      { rank: 3, name: '서경덕', highScore: 77.0, mileage: 4700, rankChange: 'stay' },
      { rank: 4, name: '김영은', highScore: 68.0, mileage: 2750, rankChange: 'stay' },
      { rank: 5, name: '김재희', highScore: 65.0, mileage: 2350, rankChange: 'stay' },
      { rank: 6, name: '이권민', highScore: 64.5, mileage: 3800, rankChange: 'stay' },
      { rank: 7, name: '조현지', highScore: 62.0, mileage: 3400, rankChange: 'stay' },
      { rank: 8, name: '오승연', highScore: 54.0, mileage: 2400, rankChange: 'stay' },
      { rank: 9, name: '성수린', highScore: 54.0, mileage: 2400, rankChange: 'stay' },
      { rank: 10, name: '김주혜', highScore: 54.0, mileage: 2400, rankChange: 'stay' },
    ],
  },
  {
    date: getDaysAgo(2), // 토요일
    rankings: [
      { rank: 1, name: '서성수', highScore: 87.0, mileage: 3450, rankChange: 'stay' },
      { rank: 2, name: '공예슬', highScore: 77.5, mileage: 3180, rankChange: 'stay' },
      { rank: 3, name: '서경덕', highScore: 76.5, mileage: 4650, rankChange: 'stay' },
      { rank: 4, name: '김영은', highScore: 67.5, mileage: 2700, rankChange: 'stay' },
      { rank: 5, name: '김재희', highScore: 64.5, mileage: 2300, rankChange: 'stay' },
      { rank: 6, name: '이권민', highScore: 64.0, mileage: 3750, rankChange: 'stay' },
      { rank: 7, name: '조현지', highScore: 61.5, mileage: 3350, rankChange: 'stay' },
      { rank: 8, name: '오승연', highScore: 53.5, mileage: 2375, rankChange: 'stay' },
      { rank: 9, name: '성수린', highScore: 53.5, mileage: 2375, rankChange: 'stay' },
      { rank: 10, name: '김주혜', highScore: 53.5, mileage: 2375, rankChange: 'stay' },
    ],
  },
  {
    date: getDaysAgo(3), // 금요일
    rankings: [
      { rank: 1, name: '서성수', highScore: 86.5, mileage: 3400, rankChange: 'stay' },
      { rank: 2, name: '공예슬', highScore: 77.0, mileage: 3150, rankChange: 'stay' },
      { rank: 3, name: '서경덕', highScore: 76.0, mileage: 4600, rankChange: 'stay' },
      { rank: 4, name: '김영은', highScore: 67.0, mileage: 2650, rankChange: 'stay' },
      { rank: 5, name: '김재희', highScore: 64.0, mileage: 2250, rankChange: 'stay' },
      { rank: 6, name: '이권민', highScore: 63.5, mileage: 3700, rankChange: 'stay' },
      { rank: 7, name: '조현지', highScore: 61.0, mileage: 3300, rankChange: 'stay' },
      { rank: 8, name: '오승연', highScore: 53.0, mileage: 2350, rankChange: 'stay' },
      { rank: 9, name: '성수린', highScore: 53.0, mileage: 2350, rankChange: 'stay' },
      { rank: 10, name: '김주혜', highScore: 53.0, mileage: 2350, rankChange: 'stay' },
    ],
  },
  {
    date: getDaysAgo(4), // 목요일
    rankings: [
      { rank: 1, name: '서성수', highScore: 86.0, mileage: 3350, rankChange: 'stay' },
      { rank: 2, name: '공예슬', highScore: 76.5, mileage: 3120, rankChange: 'stay' },
      { rank: 3, name: '서경덕', highScore: 75.5, mileage: 4550, rankChange: 'stay' },
      { rank: 4, name: '김영은', highScore: 66.5, mileage: 2600, rankChange: 'stay' },
      { rank: 5, name: '김재희', highScore: 63.5, mileage: 2200, rankChange: 'stay' },
      { rank: 6, name: '이권민', highScore: 63.0, mileage: 3650, rankChange: 'stay' },
      { rank: 7, name: '조현지', highScore: 60.5, mileage: 3250, rankChange: 'stay' },
      { rank: 8, name: '오승연', highScore: 52.5, mileage: 2325, rankChange: 'stay' },
      { rank: 9, name: '성수린', highScore: 52.5, mileage: 2325, rankChange: 'stay' },
      { rank: 10, name: '김주혜', highScore: 52.5, mileage: 2325, rankChange: 'stay' },
    ],
  },
  {
    date: getDaysAgo(5), // 수요일
    rankings: [
      { rank: 1, name: '서성수', highScore: 85.5, mileage: 3300, rankChange: 'stay' },
      { rank: 2, name: '공예슬', highScore: 76.0, mileage: 3090, rankChange: 'stay' },
      { rank: 3, name: '서경덕', highScore: 75.0, mileage: 4500, rankChange: 'stay' },
      { rank: 4, name: '김영은', highScore: 66.0, mileage: 2550, rankChange: 'stay' },
      { rank: 5, name: '김재희', highScore: 63.0, mileage: 2150, rankChange: 'stay' },
      { rank: 6, name: '이권민', highScore: 62.5, mileage: 3600, rankChange: 'stay' },
      { rank: 7, name: '조현지', highScore: 60.0, mileage: 3200, rankChange: 'stay' },
      { rank: 8, name: '오승연', highScore: 52.0, mileage: 2300, rankChange: 'stay' },
      { rank: 9, name: '성수린', highScore: 52.0, mileage: 2300, rankChange: 'stay' },
      { rank: 10, name: '김주혜', highScore: 52.0, mileage: 2300, rankChange: 'stay' },
    ],
  },
  {
    date: getDaysAgo(6), // 화요일
    rankings: [
      { rank: 1, name: '서성수', highScore: 85.0, mileage: 3250, rankChange: 'stay' },
      { rank: 2, name: '공예슬', highScore: 75.5, mileage: 3060, rankChange: 'stay' },
      { rank: 3, name: '서경덕', highScore: 74.5, mileage: 4450, rankChange: 'stay' },
      { rank: 4, name: '김영은', highScore: 65.5, mileage: 2500, rankChange: 'stay' },
      { rank: 5, name: '김재희', highScore: 62.5, mileage: 2100, rankChange: 'stay' },
      { rank: 6, name: '이권민', highScore: 62.0, mileage: 3550, rankChange: 'stay' },
      { rank: 7, name: '조현지', highScore: 59.5, mileage: 3150, rankChange: 'stay' },
      { rank: 8, name: '오승연', highScore: 51.5, mileage: 2275, rankChange: 'stay' },
      { rank: 9, name: '성수린', highScore: 51.5, mileage: 2275, rankChange: 'stay' },
      { rank: 10, name: '김주혜', highScore: 51.5, mileage: 2275, rankChange: 'stay' },
    ],
  },
];

// Eco 픽 Mock 데이터
export const mockEcoPickPrompts: EcoPickPrompt[] = [
  {
    id: 1,
    name: '서성수',
    score: 88.1,
    description:
      '프론트엔드 개발자로 10년 이상의 경력을 보유하고 있으며, React와 TypeScript를 주로 사용합니다. 네이버, 카카오, 라인, 쿠팡, 딜리버리히어로, FAANG 등 다양한 기업에서 근무한 경험이 있습니다.',
    tasks: [
      '요구사항을 분석하고 다음 중 하나의 작업을 수행합니다:',
      '1. 가장 완성도 높은 코드를 작성합니다.',
      '2. 디버깅 시 오류만 수정하고 기능은 유지합니다.',
      '3. 코드가 아닌 디자인 관련 질문에는 일반적인 답변과 최적화된 답변 두 가지를 제공합니다.',
    ],
    principles: ['이 세 가지 작업에 해당하지 않는 요구사항은 거절합니다.'],
    metrics: {
      clarity: 23.74,
      specificity: 21.56,
      formatCompliance: 24.26,
      stability: 18.54,
    },
  },
  {
    id: 2,
    name: '공예슬',
    score: 78.6,
    description:
      '백엔드 개발자로 8년의 경력을 보유하고 있으며, Node.js와 Python을 주로 사용합니다. 마이크로서비스 아키텍처와 클라우드 인프라 구축에 전문성을 가지고 있습니다.',
    tasks: [
      '요구사항을 분석하고 다음 중 하나의 작업을 수행합니다:',
      '1. 가장 완성도 높은 코드를 작성합니다.',
      '2. 디버깅 시 오류만 수정하고 기능은 유지합니다.',
      '3. 코드가 아닌 디자인 관련 질문에는 일반적인 답변과 최적화된 답변 두 가지를 제공합니다.',
    ],
    principles: ['이 세 가지 작업에 해당하지 않는 요구사항은 거절합니다.'],
    metrics: {
      clarity: 20.5,
      specificity: 19.3,
      formatCompliance: 21.2,
      stability: 17.6,
    },
  },
  {
    id: 3,
    name: '서경덕',
    score: 77.5,
    description:
      '풀스택 개발자로 7년의 경력을 보유하고 있으며, React, Node.js, PostgreSQL을 주로 사용합니다. 스타트업에서 프로젝트 리더 역할을 수행한 경험이 있습니다.',
    tasks: [
      '요구사항을 분석하고 다음 중 하나의 작업을 수행합니다:',
      '1. 가장 완성도 높은 코드를 작성합니다.',
      '2. 디버깅 시 오류만 수정하고 기능은 유지합니다.',
      '3. 코드가 아닌 디자인 관련 질문에는 일반적인 답변과 최적화된 답변 두 가지를 제공합니다.',
    ],
    principles: ['이 세 가지 작업에 해당하지 않는 요구사항은 거절합니다.'],
    metrics: {
      clarity: 19.8,
      specificity: 18.9,
      formatCompliance: 20.5,
      stability: 18.3,
    },
  },
];

// 대시보드 Mock 데이터
export const mockDashboardMetrics: DashboardMetric[] = [
  {
    name: 'clarity',
    displayName: '명확성',
    myScore: 18.76,
    averageScore: 22.47,
  },
  {
    name: 'specificity',
    displayName: '구체성',
    myScore: 18.76,
    averageScore: 22.47,
  },
  {
    name: 'formatCompliance',
    displayName: '형식 준수',
    myScore: 18.57,
    averageScore: 12.47,
  },
  {
    name: 'safety',
    displayName: '안전성',
    myScore: 18.76,
    averageScore: 22.47,
  },
];

export const mockDashboardStats: DashboardStats = {
  highestRecord: 98,
  averageScore: 85,
  myMileage: 2000,
  promptCount: 150,
};
