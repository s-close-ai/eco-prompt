import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Landing Page</h1>
      <button onClick={() => {
        navigate('/api/v1/auth/login');
      }}>
        Login
      </button>
    </div>
  )
}