import { useAuth } from '../context/AuthContext';
import SalesDashboard from './SalesDashboard';
import CounterDashboard from './CounterDashboard';

export default function Dashboard() {
  const { profile } = useAuth();

  if (!profile) return <div className="page-loading">Loading…</div>;

  switch (profile.role) {
    case 'sales':
      return <SalesDashboard />;
    case 'counter':
      return <CounterDashboard />;
    case 'admin':
      // Admins get the full Sales Team tools plus the Users panel is
      // reachable from the nav bar.
      return <SalesDashboard />;
    default:
      return (
        <div className="page">
          <h1>No dashboard access yet</h1>
          <p>
            Your account ({profile.email}) hasn't been assigned a staff role. Ask an
            admin to assign one.
          </p>
        </div>
      );
  }
}
