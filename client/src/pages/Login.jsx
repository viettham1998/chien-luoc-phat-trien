import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) { nav('/editor'); return null; }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await login(username, password);
      nav(u.role === 'super_admin' ? '/admin/users' : '/editor');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md animate-floatIn">
      <div className="card p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-xl font-black text-[rgb(var(--fg-rgb))] shadow-glow">
            KH
          </div>
          <h1 className="text-xl font-bold text-[rgb(var(--fg-rgb))]">Đăng nhập hệ thống</h1>
          <p className="mt-1 text-sm text-[rgb(var(--fg-rgb)_/_0.45)]">Báo cáo KPIs Chiến lược phát triển · Trường ĐH KHTN</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label mb-1 block">Tên đăng nhập</label>
            <input className="input" value={username} onChange={e => setU(e.target.value)} autoFocus placeholder="vd: admin" />
          </div>
          <div>
            <label className="label mb-1 block">Mật khẩu</label>
            <input type="password" className="input" value={password} onChange={e => setP(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang xử lý…' : 'Đăng nhập'}</button>
        </form>
        <div className="mt-6 rounded-xl border border-[rgb(var(--fg-rgb)_/_0.1)] bg-[rgb(var(--fg-rgb)_/_0.02)] p-3 text-xs text-[rgb(var(--fg-rgb)_/_0.4)]">
          <div className="mb-1 font-semibold text-[rgb(var(--fg-rgb)_/_0.6)]">Tài khoản demo</div>
          <div>Super Admin: <span className="text-[rgb(var(--fg-rgb)_/_0.7)]">admin / admin123</span></div>
          <div>Editor (Khoa CNTT): <span className="text-[rgb(var(--fg-rgb)_/_0.7)]">cntt / cntt123</span></div>
          <div>Editor (Phòng KHCN): <span className="text-[rgb(var(--fg-rgb)_/_0.7)]">khcn / khcn123</span></div>
        </div>
      </div>
    </div>
  );
}
