import { startSsafyLogin } from '@/services/api/auth';
export default function Landing() { 
  return (
    <div>
      <h1>Landing Page</h1>
      <button onClick={() => {
        startSsafyLogin();
      }}>
        Login
      </button>
    </div>
  )
}