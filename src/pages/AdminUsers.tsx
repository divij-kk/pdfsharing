import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Role, UserProfile } from '../types';

const ROLES: Role[] = ['pending', 'customer', 'sales', 'counter', 'admin'];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return [u.email, u.name, u.mobile, u.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [users, search, roleFilter]);

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
      {error && <p className="auth-error">{error}</p>}
      <div className="dashboard-toolbar">
        <input
          type="text"
          placeholder="Search by name, email, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="log-search"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)}>
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <table className="stock-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Mobile</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.uid}>
              <td>{u.email}</td>
              <td>{u.name || '—'}</td>
              <td>{u.mobile || '—'}</td>
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
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4}>No matching users.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
