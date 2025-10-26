import Button from '@/components/common/Button';
import '@/styles/pages/login.css';

export default function Login() {
  const handleSsafyLogin = () => {
    window.location.href = '/oauth/sso-check';
  };

  return (
    <div className="login-container">
      <Button onClick={handleSsafyLogin} size="large">
        SSAFY로 로그인하기
      </Button>
    </div>
  );
}
