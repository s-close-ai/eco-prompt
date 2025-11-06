import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserInfo } from '@/services/api/auth';

interface ConsentGuardProps {
  children: React.ReactNode;
}

export default function ConsentGuard({ children }: ConsentGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConsent = async () => {
      // 랜딩 페이지나 동의 페이지는 검증 스킵
      if (location.pathname === '/' || location.pathname === '/consent') {
        setIsChecking(false);
        return;
      }

      try {
        const userInfo = await getUserInfo();

        // 동의하지 않은 경우 동의 페이지로 리다이렉트
        if (userInfo.sharingInformation === 'N') {
          navigate('/consent', { replace: true });
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        // 인증되지 않은 경우 랜딩 페이지로 리다이렉트
        console.error('사용자 정보 조회 실패:', error);
        navigate('/', { replace: true });
      }
    };

    checkConsent();
  }, [location.pathname, navigate]);

  // 검증 중일 때는 로딩 표시
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#ffffff'
      }}>
        <div style={{
          color: '#5e9462',
          fontSize: '1rem',
          fontWeight: 600
        }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
