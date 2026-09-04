import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const blank = { username: '', password: '', full_name: '', role: 'editor', unit_id: '' };
  const [form, setForm] = useState(blank);

  function flash(msg, isErr) { setToast({ msg, isErr }); setTimeout(() => setToast(null), 2500); }
  function load() {
    api('/users').then(setUsers);
    api('/meta/units').then(setUnits);
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api('/users', { method: 'POST', body: { ...form, unit_id: form.role === 'editor' ? Number(form.unit_id) : null } });
      flash('Đã tạo người dùng');
      setForm(blank);
      load();
    } catch (e) { flash(e.message, true); }
  }
  async function update(u) {
    try {
      await api(`/users/${u.id}`, { method: 'PUT', body: { full_name: u.full_name, role: u.role, unit_id: u.unit_id, active: u.active } });
      flash('Đã cập nhật');
      setEditing(null);
      load();
    } catch (e) { flash(e.message, true); }
  }
  async function resetPw(u) {
    const pw = prompt(`Đặt lại mật khẩu cho ${u.username}:`);
    if (!pw) return;
    try { await api(`/users/${u.id}/reset-password`, { method: 'POST', body: { password: pw } }); flash('Đã đặt lại mật khẩu'); }
    catch (e) { flash(e.message, true); }
  }
  async function del(u) {
    if (!confirm(`Xóa người dùng ${u.username}?`)) return;
    try { await api(`/users/${u.id}`, { method: 'DELETE' }); flash('Đã xóa'); load(); }
    catch (e) { flash(e.message, true); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Quản lý người dùng & phân quyền</h1>
        <p className="mt-1 text-sm text-white/50">Super Admin gán quyền chỉnh sửa và đơn vị tương ứng cho từng Editor. Editor chỉ nhập được số liệu của đơn vị mình phụ trách.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Users table */}
        <div className="card overflow-hidden">
          <div className="border-b border-white/10 px-5 py-3 text-sm font-semibold text-white/80">Danh sách người dùng ({users.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Tài khoản</th>
                  <th className="px-3 py-3 text-left font-medium">Vai trò</th>
                  <th className="px-3 py-3 text-left font-medium">Đơn vị</th>
                  <th className="px-3 py-3 text-center font-medium">Trạng thái</th>
                  <th className="px-3 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-white/5">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white">{u.username}</div>
                      <div className="text-xs text-white/45">{u.full_name}</div>
                    </td>
                    <td className="px-3 py-3">
                      {editing === u.id ? (
                        <select value={u.role} onChange={e => setUsers(us => us.map(x => x.id === u.id ? { ...x, role: e.target.value } : x))} className="input py-1 text-xs">
                          <option value="editor">Editor</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <span className={`chip text-[11px] ${u.role === 'super_admin' ? 'bg-purple-500/15 text-purple-300' : 'bg-brand-500/15 text-brand-200'}`}>
                          {u.role === 'super_admin' ? 'Super Admin' : 'Editor'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-white/60">
                      {editing === u.id && u.role === 'editor' ? (
                        <select value={u.unit_id || ''} onChange={e => setUsers(us => us.map(x => x.id === u.id ? { ...x, unit_id: Number(e.target.value) } : x))} className="input py-1 text-xs">
                          <option value="">— Chọn —</option>
                          {units.map(un => <option key={un.id} value={un.id}>{un.code}</option>)}
                        </select>
                      ) : (u.role === 'super_admin' ? '— (toàn quyền)' : (u.unit_code || '—'))}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`chip text-[11px] ${u.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>{u.active ? 'Hoạt động' : 'Khóa'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1.5 text-xs">
                        {editing === u.id ? (
                          <>
                            <button onClick={() => update(u)} className="btn-primary px-2.5 py-1 text-xs">Lưu</button>
                            <button onClick={() => { setEditing(null); load(); }} className="btn-ghost px-2.5 py-1 text-xs">Hủy</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing(u.id)} className="btn-ghost px-2.5 py-1 text-xs">Sửa</button>
                            <button onClick={() => resetPw(u)} className="btn-ghost px-2.5 py-1 text-xs">Mật khẩu</button>
                            <button onClick={() => del(u)} className="btn-ghost px-2.5 py-1 text-xs text-red-300">Xóa</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create form */}
        <div className="card h-fit p-6">
          <div className="mb-4 text-sm font-bold text-white">Thêm người dùng mới</div>
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="label mb-1 block">Tên đăng nhập</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div>
              <label className="label mb-1 block">Họ tên</label>
              <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label mb-1 block">Mật khẩu</label>
              <input className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <div>
              <label className="label mb-1 block">Vai trò</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="editor">Editor (theo đơn vị)</option>
                <option value="super_admin">Super Admin (toàn quyền)</option>
              </select>
            </div>
            {form.role === 'editor' && (
              <div>
                <label className="label mb-1 block">Đơn vị phụ trách</label>
                <select className="input" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))} required>
                  <option value="">— Chọn đơn vị —</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.code} · {u.name}</option>)}
                </select>
              </div>
            )}
            <button className="btn-primary w-full">Tạo người dùng</button>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl ${toast.isErr ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{toast.msg}</div>
      )}
    </div>
  );
}
