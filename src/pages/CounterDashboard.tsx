import { useMemo, useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { stockLabel, stockStatusFor } from '../lib/stock';
import PdfViewerModal from '../components/PdfViewerModal';
import { toViewableUrl } from '../lib/pdfUrl';
import type { Product } from '../types';

export default function CounterDashboard() {
  const { products, loading } = useProducts();
  const [viewing, setViewing] = useState<Product | null>(null);

  const sorted = useMemo(
    () =>
      [...products].sort(
        (a, b) => b.ready - a.ready || a.name.localeCompare(b.name)
      ),
    [products]
  );

  if (loading) return <div className="page-loading">Loading…</div>;

  if (viewing) {
    return (
      <PdfViewerModal
        title={viewing.name}
        url={toViewableUrl(viewing.pdfUrl)}
        onClose={() => setViewing(null)}
      />
    );
  }

  return (
    <div className="page dashboard-page">
      <h1>Sales Counter</h1>
      <table className="stock-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Stock</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const status = stockStatusFor(p);
            const hasPdf = !!p.pdfUrl;
            return (
              <tr key={p.sku} className={hasPdf ? 'has-pdf' : 'no-pdf'}>
                <td>{p.type}</td>
                <td>{p.name}</td>
                <td>
                  <span className={`stock-badge stock-${status}`}>{stockLabel(status)}</span>
                </td>
                <td>
                  {hasPdf ? (
                    <button onClick={() => setViewing(p)}>View PDF</button>
                  ) : (
                    'No PDF on file'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
