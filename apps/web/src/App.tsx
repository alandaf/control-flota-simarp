import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, type User } from './lib/auth';
import Login from './pages/Login';
import Passenger from './pages/Passenger';
import Driver from './pages/Driver';
import Admin from './pages/Admin';
import Company from './pages/Company';
import History from './pages/History';
import Landing from './pages/Landing';

function homeFor(role: User['role']) {
  return role === 'admin' ? '/admin' : role === 'driver' ? '/driver' : role === 'company' ? '/company' : '/passenger';
}

function Protected({ role, children }: { role: User['role']; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-wrap"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-wrap"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route path="/passenger" element={<Protected role="passenger"><Passenger /></Protected>} />
      <Route path="/history" element={<Protected role="passenger"><History /></Protected>} />
      <Route path="/driver" element={<Protected role="driver"><Driver /></Protected>} />
      <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
      <Route path="/company" element={<Protected role="company"><Company /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
