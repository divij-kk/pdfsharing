import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import GoogleSignInGate from '../components/GoogleSignInGate';
import CustomerIntakeForm from '../components/CustomerIntakeForm';
import PdfViewerModal from '../components/PdfViewerModal';
import { toViewableUrl } from '../lib/pdfUrl';
import {
  buildCategoryTree,
  groupBySuperGroup,
  buttonLabelFor,
  subHeadingsFor,
  labelButtonText,
  KIDS_GROUP_NAME,
  KIDS_TYPE_ORDER,
  kidsTypeFor,
} from '../lib/categories';
import type { Product } from '../types';

const SEARCH_RESULT_LIMIT = 8;

export default function Catalog() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  // Don't start the products listener until we actually have a signed-in
  // user — see useProducts' comment for why starting it earlier can leave
  // the catalog permanently blank until a hard refresh.
  const { products, loading } = useProducts(!!firebaseUser);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

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

  // Search by product name, across the whole catalog regardless of where
  // you're browsing — shown as a dropdown under the search box on the home
  // screen. Picking a result opens it exactly like clicking its tile would.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return withPdf.filter((p) => p.name.toLowerCase().includes(q)).slice(0, SEARCH_RESULT_LIMIT);
  }, [withPdf, searchQuery]);

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

  function openSearchResult(p: Product) {
    openProduct(p);
    setSearchQuery('');
    setSearchOpen(false);
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
    const goBack = () => (singleCategoryGroup ? selectGroup(null) : setActiveLabel(null));
    const backLabel = singleCategoryGroup ? 'All categories' : activeGroupData.group;

    // Kids Umbrellas has no further sub-category to drill into — instead of
    // one flat product grid, segregate it by item type (read from the
    // product's name) so each type gets its own heading on this one page.
    if (activeGroupData.group === KIDS_GROUP_NAME) {
      const byType = new Map<string, Product[]>();
      productsInLabel.forEach((p) => {
        const t = kidsTypeFor(p.name);
        if (!byType.has(t)) byType.set(t, []);
        byType.get(t)!.push(p);
      });
      return (
        <div className="page catalog-page">
          <button className="back-link" onClick={goBack}>
            ← {backLabel}
          </button>
          <h1>{activeGroupData.group}</h1>
          {KIDS_TYPE_ORDER.filter((t) => (byType.get(t) ?? []).length > 0).map((t) => (
            <section key={t} className="catalog-section">
              <h2 className="sub-heading">{t}</h2>
              <div className="product-grid">
                {(byType.get(t) ?? []).map((p) => (
                  <button key={p.sku} className="product-card" onClick={() => openProduct(p)}>
                    {p.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {productsInLabel.length === 0 && <p>No products in this category yet.</p>}
        </div>
      );
    }

    return (
      <div className="page catalog-page">
        <button className="back-link" onClick={goBack}>
          ← {backLabel}
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

  // Level 2: categories within the selected parent group — some groups
  // bucket their categories under named sub-headings (e.g. Regular Size /
  // Golf Size), the rest show a flat list same as always.
  if (activeGroupData) {
    const subheadings = subHeadingsFor(activeGroupData);
    return (
      <div className="page catalog-page">
        <button className="back-link" onClick={() => selectGroup(null)}>
          ← All categories
        </button>
        <h1>{activeGroupData.group}</h1>
        {subheadings ? (
          subheadings.map((sh) => (
            <section key={sh.heading} className="catalog-section">
              <h2 className="sub-heading">{sh.heading}</h2>
              <div className="product-grid">
                {sh.labels.map((l) => (
                  <button
                    key={l.label}
                    className="product-card type-card"
                    onClick={() => setActiveLabel(l.label)}
                  >
                    {labelButtonText(l.label)}
                  </button>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="product-grid">
            {activeGroupData.labels.map((l) => (
              <button key={l.label} className="product-card type-card" onClick={() => setActiveLabel(l.label)}>
                {l.label}
              </button>
            ))}
            {activeGroupData.labels.length === 0 && <p>No products in this category yet.</p>}
          </div>
        )}
      </div>
    );
  }

  // Level 1: parent groups, bucketed under their super-group heading.
  return (
    <div className="page catalog-page">
      <h1>KK Umbrellas Catalog</h1>
      <div className="search-wrap">
        <input
          type="text"
          className="search-input"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
        />
        {searchOpen && searchQuery.trim() && (
          <div className="search-dropdown">
            {searchResults.length === 0 ? (
              <div className="search-empty">No umbrellas match "{searchQuery.trim()}".</div>
            ) : (
              searchResults.map((p) => (
                <button
                  key={p.sku}
                  type="button"
                  className="search-item"
                  onMouseDown={() => openSearchResult(p)}
                >
                  {p.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {superGroups.map((sg) => (
        <section key={sg.superGroup} className="catalog-section">
          <h2 className="catalog-section-heading">{sg.superGroup}</h2>
          <div className="product-grid">
            {sg.groups.map((g) => (
              <button key={g.group} className="product-card type-card" onClick={() => selectGroup(g.group)}>
                {buttonLabelFor(g.group)}
              </button>
            ))}
          </div>
        </section>
      ))}
      {categoryTree.length === 0 && <p>No products available yet.</p>}
    </div>
  );
}
