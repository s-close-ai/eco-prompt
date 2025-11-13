import '@/styles/components/chat/prompt-score.css';

interface PromptScoreProps {
  scores?: {
    sc_ec_1: number; // 명확성
    sc_ec_2: number; // 구체성
    sc_ec_3: number; // 형식 준수
    sc_ec_4: number; // 안전성
  };
  sc_ec_0?: number;
}

export default function PromptScore({ scores, sc_ec_0 }: PromptScoreProps) {
  // scores가 없거나 totalScore가 없으면 렌더링하지 않음
  if (!scores || sc_ec_0 === undefined || sc_ec_0 === null) {
    return null;
  }

  const categories = [
    { key: 'sc_ec_1', label: '명확성', value: scores.sc_ec_1, color: '#86C790' },
    {
      key: 'sc_ec_2',
      label: '구체성',
      value: scores.sc_ec_2,
      color: '#6DB6C9',
    },
    {
      key: 'sc_ec_3',
      label: '형식 준수',
      value: scores.sc_ec_3,
      color: '#5B9BD5',
    },
    {
      key: 'sc_ec_4',
      label: '안전성',
      value: scores.sc_ec_4,
      color: '#9DBFC9',
    },
  ];

  return (
    <div className="prompt-score-wrapper">
      <div className="prompt-score-container">
        <div className="prompt-score-header">
          <span className="prompt-score-title">프롬프트 점수</span>
          <span className="prompt-score-total">{sc_ec_0.toFixed(2)}</span>
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
