import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';

// `enabled` gates the subscription on being actually signed in. Firestore
// permanently kills a listener the moment it hits a permission-denied
// error and never retries on its own — so starting this query before
// Firebase Auth has confirmed a user (e.g. the instant Catalog mounts,
// before the Google sign-in round trip finishes) would read as "no
// products" forever, until a full page reload re-mounts everything and
// happens to win the race. Default true keeps existing callers (pages
// already behind ProtectedRoute, where auth is already settled) working
// unchanged.
export function useProducts(enabled: boolean = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        setProducts(
          snap.docs.map((d) => ({ sku: d.id, ...(d.data() as Omit<Product, 'sku'>) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [enabled]);

  return { products, loading };
}
