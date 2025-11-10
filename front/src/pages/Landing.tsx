import { signIn } from '@/services/api/auth';
export default function Landing() {
  return (
    <div>
      <h1>Landing Page</h1>
      <button
        onClick={() => {
          signIn();
        }}
      >
        Login
      </button>
    </div>
  );
}
