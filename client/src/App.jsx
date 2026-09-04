import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './store.jsx';
import { useTheme } from './theme.jsx';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      title={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      aria-label="Chuyển đổi giao diện sáng/tối"
      className="grid h-9 w-9 place-items-center rounded-xl border border-[rgb(var(--fg-rgb)_/_0.1)] bg-[rgb(var(--fg-rgb)_/_0.05)] text-[rgb(var(--fg-rgb)_/_0.7)] transition hover:bg-[rgb(var(--fg-rgb)_/_0.1)] hover:text-[rgb(var(--fg-rgb))]"
    >
      {dark ? (
        // sun
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // moon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
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
        loc.pathname === to ? 'bg-[rgb(var(--fg-rgb)_/_0.1)] text-[rgb(var(--fg-rgb))]' : 'text-[rgb(var(--fg-rgb)_/_0.6)] hover:text-[rgb(var(--fg-rgb))] hover:bg-[rgb(var(--fg-rgb)_/_0.05)]'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--fg-rgb)_/_0.1)] bg-[rgb(var(--nav-rgb)_/_0.8)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 font-black text-[rgb(var(--fg-rgb))] shadow-glow">
            KH
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-[rgb(var(--fg-rgb))]">Chiến lược phát triển ĐHQG-HCM</div>
            <div className="text-[11px] text-[rgb(var(--fg-rgb)_/_0.45)]">Trường ĐH Khoa học Tự nhiên · Báo cáo KPIs 2026–2030</div>
          </div>
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {link('/', 'Tổng quan')}
          {user && link('/editor', user.role === 'super_admin' ? 'Nhập số liệu' : `Đơn vị: ${user.unit?.code || '—'}`)}
          {user?.role === 'super_admin' && link('/admin/users', 'Quản lý người dùng')}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-[rgb(var(--fg-rgb))]">{user.full_name || user.username}</div>
                <div className="text-[11px] text-[rgb(var(--fg-rgb)_/_0.45)]">
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
  if (loading) return <div className="p-20 text-center text-[rgb(var(--fg-rgb)_/_0.4)]">Đang tải…</div>;
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
      <footer className="mx-auto max-w-[1600px] px-5 py-8 text-center text-xs text-[rgb(var(--fg-rgb)_/_0.3)]">
        Hệ thống theo dõi & báo cáo KPIs Chiến lược phát triển ĐHQG-HCM giai đoạn 2021–2030, tầm nhìn 2045 · Trường ĐH Khoa học Tự nhiên
      </footer>
    </div>
  );
}
