import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, error, isLoading, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError(); // Clear any previous errors
    
    const result = await login(email, password, remember);
    
    if (result.success) {
      navigate('/'); // Redirect to dashboard after login
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-light dark:bg-gray-950 transition-colors duration-300">
      <form onSubmit={handleSubmit} className="bg-light-card dark:bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-sm border border-light-border dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-light-text dark:text-white">Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-4 py-2 rounded bg-light dark:bg-gray-800 text-light-text dark:text-white border border-light-border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="w-full px-4 py-2 rounded bg-light dark:bg-gray-800 text-light-text dark:text-white border border-light-border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent pr-10"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <div className="text-red-400 mb-4 text-sm">{error}</div>}
        <div className="flex items-center mb-4">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            className="mr-2 accent-indigo-600"
          />
          <label htmlFor="remember" className="text-light-muted dark:text-gray-300 text-sm select-none">Remember me</label>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <div className="mt-4 text-center text-light-muted dark:text-gray-400 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-indigo-400 hover:underline">Sign up</Link>
        </div>
      </form>
    </div>
  );
}
