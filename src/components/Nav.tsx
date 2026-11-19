import { Link, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined;
}

export default function Nav() {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate('/');
  }

  return (
    <header className="nav">
      <Link to="/" className="nav-brand" aria-label="KK Umbrellas home">
        <img src="/kk-logo-white.png" alt="KK Umbrellas" className="nav-logo" />
      </Link>
      <nav className="nav-links">
        <NavLink to="/" end className={navLinkClass}>
          Catalog
        </NavLink>
        {profile?.role === 'admin' && (
          <NavLink to="/admin/users" className={navLinkClass}>
            Users
          </NavLink>
        )}
      </nav>
      <div className="nav-user">
        {firebaseUser && (
          <>
            <span className="nav-email">{firebaseUser.email}</span>
            <button onClick={handleLogout}>Log out</button>
          </>
        )}
      </div>
    </header>
  );
}
