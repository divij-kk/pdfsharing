import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { PdfViewLog } from '../types';

const PAGE_SIZE = 300;

function formatWhen(ms: number | null) {
  if (!ms) return 'just now';
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ViewLogs() {
  const [logs, setLogs] = useState<PdfViewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'pdfViews'), orderBy('viewedAt', 'desc'), limit(PAGE_SIZE)),
      (snap) => {
        setLogs(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              uid: data.uid ?? '',
              name: data.name ?? '',
              mobile: data.mobile ?? '',
              email: data.email ?? '',
              location: data.location ?? '',
              productSku: data.productSku ?? '',
              productName: data.productName ?? '',
              productType: data.productType ?? '',
              viewedAt: data.viewedAt?.toMillis?.() ?? null,
            } as PdfViewLog;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      [l.name, l.mobile, l.email, l.location, l.productName, l.productType]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [logs, search]);

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page dashboard-page">
      <h1>View Logs</h1>
      <p className="page-sub">
        Every PDF a customer has opened in the catalog, most recent first (last {PAGE_SIZE}).
      </p>
      <div className="dashboard-toolbar">
        <input
          type="text"
          placeholder="Search by name, mobile, product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="log-search"
        />
      </div>
      <table className="stock-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Name</th>
            <th>Mobile</th>
            <th>Location</th>
            <th>Product</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id}>
              <td>{formatWhen(l.viewedAt)}</td>
              <td>{l.name || '—'}</td>
              <td>{l.mobile || '—'}</td>
              <td>{l.location || '—'}</td>
              <td>{l.productName}</td>
              <td>{l.productType}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6}>No views yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
