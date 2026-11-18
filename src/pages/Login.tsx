import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useEffect } from 'react';

const EMAIL_LINK_STORAGE_KEY = 'kk-pdfsharing-pending-email';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const navigate = useNavigate();

  // Complete an email-link sign-in if this page was opened from that link.
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
      if (!storedEmail) {
        storedEmail = window.prompt('Confirm your email to finish signing in') || '';
      }
      if (!storedEmail) return;
      signInWithEmailLink(auth, storedEmail, window.location.href)
        .then(() => {
          window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
          navigate('/');
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Sign-in link failed.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await sendSignInLinkToEmail(auth, email.trim(), {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email.trim());
      setInfo('Check your inbox — we sent you a sign-in link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send sign-in link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={mode === 'password' ? handlePasswordSubmit : handleLinkSubmit}>
        <h1>Log in</h1>
        <div className="auth-tabs">
          <button type="button" className={mode === 'password' ? 'active' : ''} onClick={() => setMode('password')}>
            Password
          </button>
          <button type="button" className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>
            Email link
          </button>
        </div>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        {mode === 'password' && (
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
        )}
        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'password' ? 'Log in' : 'Send sign-in link'}
        </button>
        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
