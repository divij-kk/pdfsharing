import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Nav() {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate('/login');
  }

  return (
    <header className="nav">
      <Link to="/" className="nav-brand">
        KK Umbrellas
      </Link>
      <nav className="nav-links">
        {profile && (profile.role === 'sales' || profile.role === 'counter' || profile.role === 'admin') && (
          <Link to="/dashboard">Dashboard</Link>
        )}
        {profile?.role === 'admin' && <Link to="/admin/users">Users</Link>}
        <Link to="/">Catalog</Link>
      </nav>
      <div className="nav-user">
        {firebaseUser ? (
          <>
            <span className="nav-email">{firebaseUser.email}</span>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </div>
    </header>
  );
}
