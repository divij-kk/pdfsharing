import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import GoogleSignInGate from '../components/GoogleSignInGate';
import CustomerIntakeForm from '../components/CustomerIntakeForm';
import PdfViewerModal from '../components/PdfViewerModal';
import { toViewableUrl } from '../lib/pdfUrl';
import type { Product } from '../types';

export default function Catalog() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const { products, loading } = useProducts();
  const [activeType, setActiveType] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);

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

  // Log every PDF a customer opens so staff can see who's been looking at
  // what (name/mobile from their intake form) and follow up.
  function openProduct(p: Product) {
    setViewing(p);
    if (firebaseUser && profile) {
      addDoc(collection(db, 'pdfViews'), {
        uid: firebaseUser.uid,
        name: profile.name ?? '',
        mobile: profile.mobile ?? '',
        email: profile.email ?? '',
        location: profile.location ?? '',
        productSku: p.sku,
        productName: p.name,
        productType: p.type,
        viewedAt: serverTimestamp(),
      }).catch(() => {
        // Best-effort logging — never block the user from viewing the PDF.
      });
    }
  }

  if (authLoading) {
    return <div className="page-loading">Loading…</div>;
  }

  // Not signed in yet — everyone (customers and staff alike) signs up with
  // Google now.
  if (!firebaseUser) {
    return <GoogleSignInGate />;
  }

  // Signed in with Google but no saved profile yet — collect the couple of
  // details Google doesn't give us before unlocking the catalog.
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
            <button key={p.sku} className="product-card" onClick={() => openProduct(p)}>
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
