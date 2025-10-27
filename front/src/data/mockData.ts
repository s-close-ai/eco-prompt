// 임시 Mock 데이터 - 추후 API 연동 시 제거 예정

export interface ChatItem {
  id: number;
  title: string;
}

export interface ProjectItem {
  id: number;
  title: string;
}

export interface ChatMessage {
  id: number;
  type: 'user' | 'ai' | 'loading' | 'error';
  message: string;
  timestamp: Date;
  score?: {
    clarity: number; // 명확성 (최대 25점)
    specificity: number; // 구체성 (최대 25점)
    format: number; // 형식 준수 (최대 25점)
    completeness: number; // 안정성 (최대 25점)
    totalScore: number; // 총점 (최대 100점)
  };
}

export const mockChatList: ChatItem[] = [
  { id: 1, title: '일일체팅' },
  { id: 2, title: '파일 추가' },
  { id: 3, title: '테스트 확인 완료' },
  { id: 4, title: '프로젝트 만들기 설명' },
];

export const mockProjectList: ProjectItem[] = [
  { id: 1, title: '지지스캐서 피드백' },
  { id: 2, title: '자기소개서 초안 작성' },
  { id: 3, title: 'PRM 프로젝트 설계' },
  { id: 4, title: '지지스캐서 피드백 2' },
];

// 채팅 메시지 목 데이터
export const mockChatMessages: ChatMessage[] = [
  {
    id: 1,
    type: 'user',
    message: 'React에서 상태 관리를 위한 좋은 라이브러리를 추천해줄 수 있나요?',
    timestamp: new Date(2024, 0, 27, 14, 30),
  },
  {
    id: 2,
    type: 'ai',
    message:
      'React 상태 관리를 위한 라이브러리는 여러 가지가 있습니다:\n\n1. **Redux** - 가장 널리 사용되는 상태 관리 라이브러리로, 예측 가능한 상태 관리를 제공합니다.\n\n2. **Zustand** - 간단하고 가벼운 상태 관리 솔루션으로, Redux보다 보일러플레이트가 적습니다.\n\n3. **Recoil** - Facebook에서 만든 라이브러리로, React의 hooks와 잘 통합됩니다.\n\n4. **MobX** - 반응형 프로그래밍 방식을 사용하며, 간단한 API를 제공합니다.\n\n프로젝트 규모와 팀의 선호도에 따라 선택하시면 됩니다.',
    timestamp: new Date(2024, 0, 27, 14, 30, 15),
    score: {
      clarity: 22,
      specificity: 20,
      format: 21,
      completeness: 24,
      totalScore: 87,
    },
  },
  {
    id: 3,
    type: 'user',
    message: 'Zustand를 사용하는 간단한 예제를 보여줄 수 있나요?',
    timestamp: new Date(2024, 0, 27, 14, 32),
  },
  {
    id: 4,
    type: 'ai',
    message:
      '물론입니다! Zustand를 사용한 간단한 예제입니다:\n\n```typescript\nimport { create } from \'zustand\';\n\ninterface CounterState {\n  count: number;\n  increment: () => void;\n  decrement: () => void;\n}\n\nconst useCounterStore = create<CounterState>((set) => ({\n  count: 0,\n  increment: () => set((state) => ({ count: state.count + 1 })),\n  decrement: () => set((state) => ({ count: state.count - 1 })),\n}));\n\n// 컴포넌트에서 사용\nfunction Counter() {\n  const { count, increment, decrement } = useCounterStore();\n  \n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={increment}>+</button>\n      <button onClick={decrement}>-</button>\n    </div>\n  );\n}\n```\n\n이렇게 간단하게 전역 상태를 관리할 수 있습니다!',
    timestamp: new Date(2024, 0, 27, 14, 32, 20),
    score: {
      clarity: 24,
      specificity: 23,
      format: 25,
      completeness: 22,
      totalScore: 94,
    },
  },
  {
    id: 5,
    type: 'user',
    message: 'TypeScript와 함께 사용할 때 주의할 점이 있나요?',
    timestamp: new Date(2024, 0, 27, 14, 35),
  },
  {
    id: 6,
    type: 'ai',
    message:
      'TypeScript와 함께 Zustand를 사용할 때 주의할 점들입니다:\n\n1. **인터페이스 정의**: 스토어의 상태와 액션에 대한 타입을 명확히 정의하세요.\n\n2. **Generic 사용**: create 함수에 제네릭 타입을 전달하여 타입 안정성을 확보하세요.\n\n3. **불변성**: TypeScript를 사용하더라도 상태를 직접 변경하지 말고, set 함수를 통해 업데이트하세요.\n\n4. **선택적 구독**: 필요한 상태만 구독하여 불필요한 리렌더링을 방지할 수 있습니다:\n\n```typescript\nconst count = useCounterStore((state) => state.count);\n```\n\n이렇게 하면 count만 변경될 때만 컴포넌트가 리렌더링됩니다.',
    timestamp: new Date(2024, 0, 27, 14, 35, 30),
    score: {
      clarity: 21,
      specificity: 24,
      format: 23,
      completeness: 21,
      totalScore: 89,
    },
  },
];
