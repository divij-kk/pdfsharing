import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Role, UserProfile } from '../types';

const ROLES: Role[] = ['pending', 'customer', 'sales', 'counter', 'admin'];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(
          snap.docs
            .map((d) => d.data() as UserProfile)
            .sort((a, b) => a.email.localeCompare(b.email))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  async function changeRole(uid: string, role: Role) {
    setError('');
    setSavingUid(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role.');
    } finally {
      setSavingUid(null);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page dashboard-page">
      <h1>Users</h1>
      <p className="page-sub">
        Assign roles: <strong>customer</strong> (catalog only), <strong>sales</strong> (stock +
        WhatsApp + PDF merge), <strong>counter</strong> (stock + PDF viewing), <strong>admin</strong>{' '}
        (everything, plus this panel).
      </p>
      {error && <p className="auth-error">{error}</p>}
      <table className="stock-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  disabled={savingUid === u.uid}
                  onChange={(e) => changeRole(u.uid, e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
