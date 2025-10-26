import '../../styles/components/chat/prompt-score.css';

interface PromptScoreProps {
  scores: {
    clarity: number; // 명확성
    specificity: number; // 구체성
    format: number; // 형식 준수
    completeness: number; // 안정성
  };
  totalScore: number;
}

export default function PromptScore({ scores, totalScore }: PromptScoreProps) {
  const categories = [
    { key: 'clarity', label: '명확성', value: scores.clarity, color: '#86C790' },
    {
      key: 'specificity',
      label: '구체성',
      value: scores.specificity,
      color: '#6DB6C9',
    },
    {
      key: 'format',
      label: '형식 준수',
      value: scores.format,
      color: '#5B9BD5',
    },
    {
      key: 'completeness',
      label: '안정성',
      value: scores.completeness,
      color: '#9DBFC9',
    },
  ];

  return (
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
  );
}

