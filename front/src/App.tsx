import { Link, Outlet } from 'react-router-dom'

function App() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <nav className="mb-6 flex gap-4">
        <Link className="text-blue-600 hover:underline" to="/">Home</Link>
        <Link className="text-blue-600 hover:underline" to="/about">About</Link>
      </nav>
      <Outlet />
    </div>
  )
}

export default App
