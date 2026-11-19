import { useState, type FormEvent } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { User as FirebaseUser } from 'firebase/auth';

// Shown once, right after Google sign-in, for anyone with no profile doc
// yet. Name and email already come from the Google account — this just
// fills in the two things Google doesn't give us.
export default function CustomerIntakeForm({ firebaseUser }: { firebaseUser: FirebaseUser }) {
  const [name, setName] = useState(firebaseUser.displayName || '');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        role: 'customer',
        name: name.trim(),
        email: firebaseUser.email || '',
        mobile: mobile.trim(),
        location: location.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Please share your details to browse:</h1>
        <label>
          Name *
          <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          Mobile Number
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label>
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / area"
            autoComplete="address-level2"
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Continuing…' : 'Continue to Catalog'}
        </button>
      </form>
    </div>
  );
}
