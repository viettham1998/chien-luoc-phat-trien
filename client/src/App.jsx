import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './store.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Editor from './pages/Editor.jsx';
import AdminUsers from './pages/AdminUsers.jsx';

function TopNav() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const link = (to, label) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
        loc.pathname === to ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060912]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 font-black text-white shadow-glow">
            KH
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">Chiến lược phát triển ĐHQG-HCM</div>
            <div className="text-[11px] text-white/45">Trường ĐH Khoa học Tự nhiên · Báo cáo KPIs 2026–2030</div>
          </div>
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {link('/', 'Tổng quan')}
          {user && link('/editor', user.role === 'super_admin' ? 'Nhập số liệu' : `Đơn vị: ${user.unit?.code || '—'}`)}
          {user?.role === 'super_admin' && link('/admin/users', 'Quản lý người dùng')}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-white">{user.full_name || user.username}</div>
                <div className="text-[11px] text-white/45">
                  {user.role === 'super_admin' ? 'Super Admin' : `Editor · ${user.unit?.name || ''}`}
                </div>
              </div>
              <button onClick={logout} className="btn-ghost text-xs">Đăng xuất</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary text-xs">Đăng nhập</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-20 text-center text-white/40">Đang tải…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-full">
      <TopNav />
      <main className="mx-auto max-w-[1600px] px-5 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/editor" element={<Protected><Editor /></Protected>} />
          <Route path="/admin/users" element={<Protected role="super_admin"><AdminUsers /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-[1600px] px-5 py-8 text-center text-xs text-white/30">
        Hệ thống theo dõi & báo cáo KPIs Chiến lược phát triển ĐHQG-HCM giai đoạn 2021–2030, tầm nhìn 2045 · Trường ĐH Khoa học Tự nhiên
      </footer>
    </div>
  );
}
