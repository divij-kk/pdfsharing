import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Nav from './components/Nav';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        <Routes>
          {/* Catalog handles its own Google sign-in + profile completion,
              so it isn't wrapped in ProtectedRoute. */}
          <Route path="/" element={<Catalog />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allow={['sales', 'counter', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
