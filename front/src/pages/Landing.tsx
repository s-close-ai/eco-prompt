import { signIn } from '@/services/api/auth';
import '@/styles/pages/landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-logo">
            <img src="/logo/ggb_logo_png.png" alt="Eco Prompt Logo" className="logo-image" />
          </div>
          <h1 className="hero-title">
            <span className="gradient-text">Eco Prompt</span>
          </h1>
          <p className="hero-subtitle">
            AI 프롬프트를 친환경적으로 작성하고, 탄소 배출을 줄이세요
          </p>
          <p className="hero-description">
            효율적인 프롬프트 작성으로 에너지를 절약하고 환경을 보호하는 
            <br />
            스마트한 AI 채팅 플랫폼
          </p>
          <button className="cta-button" onClick={() => signIn()}>
            <span>시작하기</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div className="hero-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="section-title">주요 기능</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="feature-title">실시간 프롬프트 평가</h3>
              <p className="feature-description">
                작성한 프롬프트의 효율성과 친환경성을 실시간으로 분석하고 점수를 제공합니다.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3 className="feature-title">탄소 배출량 추적</h3>
              <p className="feature-description">
                AI 사용으로 발생하는 탄소 배출량을 추적하고 절감 현황을 확인할 수 있습니다.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h3 className="feature-title">스마트 추천</h3>
              <p className="feature-description">
                더 효율적인 프롬프트 작성을 위한 개선 제안과 베스트 프랙티스를 제공합니다.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="feature-title">프로젝트 관리</h3>
              <p className="feature-description">
                채팅을 프로젝트별로 체계적으로 관리하고 북마크로 중요한 내용을 저장하세요.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3 className="feature-title">대시보드</h3>
              <p className="feature-description">
                에코 픽, 랭킹 등 다양한 통계와 인사이트를 한눈에 확인할 수 있습니다.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <h3 className="feature-title">통합 검색</h3>
              <p className="feature-description">
                모든 채팅 내용을 빠르게 검색하고 필요한 정보를 쉽게 찾을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <h2 className="section-title">어떻게 작동하나요?</h2>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">로그인하기</h3>
                <p className="step-description">
                  간단한 로그인으로 Eco Prompt를 시작하세요
                </p>
              </div>
            </div>

            <div className="step-connector"></div>

            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">프롬프트 작성</h3>
                <p className="step-description">
                  AI와 대화하며 효율적인 프롬프트를 작성하세요
                </p>
              </div>
            </div>

            <div className="step-connector"></div>

            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">실시간 피드백</h3>
                <p className="step-description">
                  프롬프트 점수와 개선 제안을 받아보세요
                </p>
              </div>
            </div>

            <div className="step-connector"></div>

            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3 className="step-title">환경 보호</h3>
                <p className="step-description">
                  탄소 배출을 줄이고 지구를 지키세요
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="section-container">
          <h2 className="section-title">왜 Eco Prompt인가요?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-emoji">🌱</div>
              <h3 className="benefit-title">친환경</h3>
              <p className="benefit-description">
                효율적인 프롬프트로 AI 연산량을 줄여 탄소 배출을 최소화합니다
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-emoji">⚡</div>
              <h3 className="benefit-title">효율적</h3>
              <p className="benefit-description">
                더 적은 토큰으로 더 나은 결과를 얻어 시간과 비용을 절약합니다
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-emoji">📊</div>
              <h3 className="benefit-title">데이터 기반</h3>
              <p className="benefit-description">
                프롬프트 평가 지표를 통해 객관적인 개선 방향을 제시합니다
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-emoji">🎯</div>
              <h3 className="benefit-title">체계적</h3>
              <p className="benefit-description">
                프로젝트별 관리와 북마크로 작업을 체계적으로 정리할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">지금 바로 시작하세요</h2>
          <p className="cta-description">
            Eco Prompt와 함께 더 스마트하고 친환경적인 AI 사용을 경험해보세요
          </p>
          <button className="cta-button-large" onClick={() => signIn()}>
            <span>무료로 시작하기</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/logo/wgb_logo_png_name.png" alt="Eco Prompt" className="footer-logo-image" />
          </div>
          <p className="footer-text">
            © 2024 Eco Prompt. 지구를 생각하는 AI 플랫폼
          </p>
        </div>
      </footer>
    </div>
  );
}
