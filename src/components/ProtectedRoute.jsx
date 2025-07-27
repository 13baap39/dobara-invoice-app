import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // Check both localStorage and sessionStorage
  const token = localStorage.getItem('dobara_token') || sessionStorage.getItem('dobara_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
