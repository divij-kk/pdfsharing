import { useEffect, useMemo, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import CustomerIntakeForm from '../components/CustomerIntakeForm';
import PdfViewerModal from '../components/PdfViewerModal';
import { toViewableUrl } from '../lib/pdfUrl';
import type { Product } from '../types';

export default function Catalog() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const { products, loading } = useProducts();
  const [activeType, setActiveType] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);

  // First-ever visit: sign in anonymously so we have a stable identity to
  // attach the intake form's details to. Persists across visits, so this
  // only happens once per browser.
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      signInAnonymously(auth).catch(() => {});
    }
  }, [authLoading, firebaseUser]);

  // Customer catalog: only SKUs that have a PDF, sorted alphabetically.
  const withPdf = useMemo(() => products.filter((p) => !!p.pdfUrl), [products]);

  const types = useMemo(() => {
    const set = new Set(withPdf.map((p) => p.type));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [withPdf]);

  const productsInType = useMemo(() => {
    if (!activeType) return [];
    return withPdf.filter((p) => p.type === activeType).sort((a, b) => a.name.localeCompare(b.name));
  }, [withPdf, activeType]);

  if (authLoading || !firebaseUser) {
    return <div className="page-loading">Loading…</div>;
  }

  // Signed in (anonymously, or as staff with no profile yet) but no saved
  // profile — show the one-time intake form before unlocking the catalog.
  if (!profile) {
    return <CustomerIntakeForm firebaseUser={firebaseUser} />;
  }

  if (loading) return <div className="page-loading">Loading catalog…</div>;

  if (viewing) {
    return (
      <PdfViewerModal
        title={viewing.name}
        url={toViewableUrl(viewing.pdfUrl)}
        onClose={() => setViewing(null)}
      />
    );
  }

  if (activeType) {
    return (
      <div className="page catalog-page">
        <button className="back-link" onClick={() => setActiveType(null)}>
          ← All categories
        </button>
        <h1>{activeType}</h1>
        <div className="product-grid">
          {productsInType.map((p) => (
            <button key={p.sku} className="product-card" onClick={() => setViewing(p)}>
              {p.name}
            </button>
          ))}
          {productsInType.length === 0 && <p>No products in this category yet.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="page catalog-page">
      <h1>Catalog</h1>
      <p className="page-sub">Browse by category.</p>
      <div className="product-grid">
        {types.map((t) => (
          <button key={t} className="product-card type-card" onClick={() => setActiveType(t)}>
            {t}
          </button>
        ))}
        {types.length === 0 && <p>No products available yet.</p>}
      </div>
    </div>
  );
}
