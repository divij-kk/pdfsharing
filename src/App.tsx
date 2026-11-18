import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Nav from './components/Nav';
import StaffLogin from './pages/StaffLogin';
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
          <Route path="/staff-login" element={<StaffLogin />} />
          {/* Catalog handles its own anonymous sign-in + intake form, so it
              isn't wrapped in ProtectedRoute (which would redirect to staff
              login instead). */}
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
