import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export default function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  /** Roles allowed to view this route. Omit to allow any signed-in user. */
  allow?: Role[];
}) {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!firebaseUser) return <Navigate to="/" replace />;
  if (allow && (!profile || !allow.includes(profile.role))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
