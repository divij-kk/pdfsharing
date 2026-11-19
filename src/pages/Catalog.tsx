import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import GoogleSignInGate from '../components/GoogleSignInGate';
import CustomerIntakeForm from '../components/CustomerIntakeForm';
import PdfViewerModal from '../components/PdfViewerModal';
import { toViewableUrl } from '../lib/pdfUrl';
import { buildCategoryTree, groupBySuperGroup } from '../lib/categories';
import type { Product } from '../types';

export default function Catalog() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const { products, loading } = useProducts();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);

  // Customer catalog: only SKUs that have a PDF.
  const withPdf = useMemo(() => products.filter((p) => !!p.pdfUrl), [products]);

  // Parent group -> display label -> raw inventory type code(s), built only
  // from types actually present so empty categories never show up.
  const categoryTree = useMemo(() => {
    const rawTypes = Array.from(new Set(withPdf.map((p) => p.type)));
    return buildCategoryTree(rawTypes);
  }, [withPdf]);

  const superGroups = useMemo(() => groupBySuperGroup(categoryTree), [categoryTree]);

  const activeGroupData = useMemo(
    () => categoryTree.find((g) => g.group === activeGroup) ?? null,
    [categoryTree, activeGroup]
  );

  const activeLabelData = useMemo(
    () => activeGroupData?.labels.find((l) => l.label === activeLabel) ?? null,
    [activeGroupData, activeLabel]
  );

  const productsInLabel = useMemo(() => {
    if (!activeLabelData) return [];
    return withPdf
      .filter((p) => activeLabelData.codes.includes(p.type))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [withPdf, activeLabelData]);

  function selectGroup(group: string | null) {
    setActiveGroup(group);
    if (!group) {
      setActiveLabel(null);
      return;
    }
    // A category with only one sub-type (Garden, Kids) skips straight to
    // its products — no point showing an in-between screen with a single
    // button on it.
    const g = categoryTree.find((x) => x.group === group);
    setActiveLabel(g && g.labels.length === 1 ? g.labels[0].label : null);
  }

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

  // Level 3: products within the selected category (which may roll up more
  // than one raw inventory type code, e.g. Hilton + Hulk).
  if (activeGroupData && activeLabelData) {
    // When the group has only one category, selectGroup() already skipped
    // straight here — so "back" should go all the way to the top rather
    // than to an in-between screen with the same single button on it.
    const singleCategoryGroup = activeGroupData.labels.length === 1;
    return (
      <div className="page catalog-page">
        <button
          className="back-link"
          onClick={() => (singleCategoryGroup ? selectGroup(null) : setActiveLabel(null))}
        >
          ← {singleCategoryGroup ? 'All categories' : activeGroupData.group}
        </button>
        <h1>{activeLabelData.label}</h1>
        <div className="product-grid">
          {productsInLabel.map((p) => (
            <button key={p.sku} className="product-card" onClick={() => openProduct(p)}>
              {p.name}
            </button>
          ))}
          {productsInLabel.length === 0 && <p>No products in this category yet.</p>}
        </div>
      </div>
    );
  }

  // Level 2: categories within the selected parent group.
  if (activeGroupData) {
    return (
      <div className="page catalog-page">
        <button className="back-link" onClick={() => selectGroup(null)}>
          ← All categories
        </button>
        <h1>{activeGroupData.group}</h1>
        <div className="product-grid">
          {activeGroupData.labels.map((l) => (
            <button key={l.label} className="product-card type-card" onClick={() => setActiveLabel(l.label)}>
              {l.label}
            </button>
          ))}
          {activeGroupData.labels.length === 0 && <p>No products in this category yet.</p>}
        </div>
      </div>
    );
  }

  // Level 1: parent groups, bucketed under their super-group heading.
  return (
    <div className="page catalog-page">
      <h1>KK Umbrellas Catalog</h1>
      <p className="page-sub">Browse by category</p>
      {superGroups.map((sg) => (
        <section key={sg.superGroup} className="catalog-section">
          <h2 className="catalog-section-heading">{sg.superGroup}</h2>
          <div className="product-grid">
            {sg.groups.map((g) => (
              <button key={g.group} className="product-card type-card" onClick={() => selectGroup(g.group)}>
                {g.group}
              </button>
            ))}
          </div>
        </section>
      ))}
      {categoryTree.length === 0 && <p>No products available yet.</p>}
    </div>
  );
}
