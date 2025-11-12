import '@/styles/components/chat/prompt-score.css';

interface PromptScoreProps {
  scores?: {
    clarityScore: number; // 명확성
    specificityScore: number; // 구체성
    formatScore: number; // 형식 준수
    safetyScore: number; // 안정성
    totalScore: number;
  };
  totalScore?: number;
}

export default function PromptScore({ scores, totalScore }: PromptScoreProps) {
  // scores가 없거나 totalScore가 없으면 렌더링하지 않음
  if (!scores || totalScore === undefined || totalScore === null) {
    return null;
  }

  const categories = [
    { key: 'clarityScore', label: '명확성', value: scores.clarityScore, color: '#86C790' },
    {
      key: 'specificityScore',
      label: '구체성',
      value: scores.specificityScore,
      color: '#6DB6C9',
    },
    {
      key: 'formatScore',
      label: '형식 준수',
      value: scores.formatScore,
      color: '#5B9BD5',
    },
    {
      key: 'safetyScore',
      label: '안정성',
      value: scores.safetyScore,
      color: '#9DBFC9',
    },
  ];

  return (
    <div className="prompt-score-wrapper">
      <div className="prompt-score-container">
        <div className="prompt-score-header">
          <span className="prompt-score-title">프롬프트 점수</span>
          <span className="prompt-score-total">{totalScore.toFixed(2)}</span>
        </div>

        <div className="prompt-score-legend">
          {categories.map((category) => (
            <div key={category.key} className="prompt-score-legend-item">
              <span
                className="prompt-score-legend-color"
                style={{ backgroundColor: category.color }}
              ></span>
              <span className="prompt-score-legend-label">{category.label}</span>
            </div>
          ))}
        </div>

        <div className="prompt-score-bar-container">
          {categories.map((category) => (
            <div
              key={category.key}
              className="prompt-score-bar-segment"
              style={{
                width: `${category.value}%`,
                backgroundColor: category.color,
              }}
            >
              <span className="prompt-score-bar-value">{category.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
