import { useMemo, useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { stockLabel, stockStatusFor } from '../lib/stock';
import { buildWhatsAppMessage } from '../lib/message';
import { mergeSelectedPdfs, downloadMergedPdf } from '../lib/mergePdfs';
import type { Product } from '../types';

export default function SalesDashboard() {
  const { products, loading } = useProducts();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');

  const sorted = useMemo(
    () => [...products].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)),
    [products]
  );

  const selectedProducts: Product[] = useMemo(
    () => sorted.filter((p) => selected.has(p.sku)),
    [sorted, selected]
  );

  function toggle(sku: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function buildMessage() {
    setMessage(buildWhatsAppMessage(selectedProducts));
  }

  async function combinePdfs() {
    setMergeError('');
    const withPdf = selectedProducts.filter((p) => p.pdfUrl);
    if (withPdf.length === 0) {
      setMergeError('None of the selected products have a PDF on file.');
      return;
    }
    setMerging(true);
    try {
      const bytes = await mergeSelectedPdfs(withPdf);
      downloadMergedPdf(bytes);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Could not combine PDFs.');
    } finally {
      setMerging(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page dashboard-page">
      <h1>Sales Team</h1>
      <div className="dashboard-toolbar">
        <button onClick={buildMessage} disabled={selectedProducts.length === 0}>
          Build WhatsApp message ({selectedProducts.length})
        </button>
        <button onClick={combinePdfs} disabled={selectedProducts.length === 0 || merging}>
          {merging ? 'Combining…' : 'Combine PDFs'}
        </button>
      </div>
      {mergeError && <p className="auth-error">{mergeError}</p>}

      <table className="stock-table">
        <thead>
          <tr>
            <th></th>
            <th>Type</th>
            <th>Name</th>
            <th>Stock</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const status = stockStatusFor(p);
            return (
              <tr key={p.sku}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(p.sku)}
                    onChange={() => toggle(p.sku)}
                  />
                </td>
                <td>{p.type}</td>
                <td>{p.name}</td>
                <td>
                  <span className={`stock-badge stock-${status}`}>{stockLabel(status)}</span>
                </td>
                <td>{p.pdfUrl ? 'Yes' : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {message && (
        <div className="message-preview">
          <h2>Message preview</h2>
          <textarea readOnly value={message} rows={Math.min(20, message.split('\n').length + 2)} />
          <button
            onClick={() => navigator.clipboard.writeText(message)}
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}
