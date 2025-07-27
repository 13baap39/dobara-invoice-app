import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, error, isLoading, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [shopName, setShopName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError(); // Clear any previous errors
    
    const result = await signup({
      email, 
      password, 
      fullName, 
      mobile, 
      shopName
    });
    
    if (result.success) {
      navigate('/'); // Redirect to dashboard after signup
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Sign Up</h2>
        <input
          type="text"
          placeholder="Full Name"
          className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Mobile Number"
          className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none"
          value={mobile}
          onChange={e => setMobile(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Meesho Shop Name"
          className="w-full mb-4 px-4 py-2 rounded bg-gray-800 text-white focus:outline-none"
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          required
        />
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="w-full px-4 py-2 rounded bg-gray-800 text-white focus:outline-none pr-10"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <div className="text-red-400 mb-4 text-sm">{error}</div>}
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition"
          disabled={isLoading}
        >
          {isLoading ? 'Signing up...' : 'Sign Up'}
        </button>
        <div className="mt-4 text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">Login</Link>
        </div>
      </form>
    </div>
  );
}
