import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import '@/styles/pages/oauth-callback.css';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL에서 인증 코드 또는 토큰 추출
        const code = searchParams.get('code');
        const accessToken = searchParams.get('access_token');
        const errorParam = searchParams.get('error');

        // 에러가 있는 경우
        if (errorParam) {
          const errorDescription = searchParams.get('error_description') || '인증에 실패했습니다.';
          throw new Error(errorDescription);
        }

        // Access Token이 직접 전달된 경우
        if (accessToken) {
          // 인증 상태 업데이트 (토큰 저장 포함)
          setAuth(accessToken);

          // 사용자 정보 가져오기 (필요시)
          // const userInfo = await fetchUserInfo(accessToken);

          // 메인 페이지로 리다이렉트
          navigate('/', { replace: true });
          return;
        }

        // Authorization Code가 전달된 경우 (백엔드에서 토큰 교환 필요)
        if (code) {
          // 백엔드 API 호출하여 토큰 교환
          // Refresh Token은 httpOnly 쿠키로 자동 설정됨
          const response = await fetch('/api/auth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // 쿠키 포함
            body: JSON.stringify({ code }),
          });

          if (!response.ok) {
            throw new Error('토큰 교환에 실패했습니다.');
          }

          const data = await response.json();

          // API 응답 구조 검증
          if (!data.access_token) {
            throw new Error('서버 응답에 Access Token이 없습니다.');
          }

          const { access_token } = data;

          // 인증 상태 업데이트 (Access Token만 저장)
          setAuth(access_token);

          // 메인 페이지로 리다이렉트
          navigate('/', { replace: true });
          return;
        }

        // code나 token이 없는 경우
        throw new Error('인증 정보를 찾을 수 없습니다.');
      } catch (err) {
        console.error('OAuth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : '인증 처리 중 오류가 발생했습니다.';
        setError(errorMessage);

        // 인증 실패 시 상태 초기화
        clearAuth();

        // 3초 후 로그인 페이지로 리다이렉트
        const timerId = setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);

        // Cleanup: 컴포넌트 언마운트 시 타이머 정리
        return () => clearTimeout(timerId);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuth, clearAuth]);

  if (error) {
    return (
      <div className="oauth-callback-container">
        <div className="oauth-callback-content">
          <div className="oauth-callback-error-title">인증 실패</div>
          <p className="oauth-callback-error-message">{error}</p>
          <p className="oauth-callback-error-redirect">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-content">
        <div className="oauth-callback-loading-title">인증 처리 중...</div>
        <div className="oauth-callback-spinner"></div>
      </div>
    </div>
  );
}
