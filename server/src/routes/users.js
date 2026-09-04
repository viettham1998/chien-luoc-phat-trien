import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireSuperAdmin } from '../auth.js';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id,u.username,u.full_name,u.role,u.active,u.created_at,
           un.id AS unit_id, un.code AS unit_code, un.name AS unit_name
    FROM users u LEFT JOIN units un ON un.id = u.unit_id
    ORDER BY u.role, u.username
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { username, password, full_name, role, unit_id } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Thiếu tên đăng nhập / mật khẩu' });
  if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  const r = role === 'super_admin' ? 'super_admin' : 'editor';
  if (r === 'editor' && !unit_id) return res.status(400).json({ error: 'Editor phải được gán một đơn vị' });
  const exists = db.prepare('SELECT 1 FROM users WHERE username=?').get(String(username).trim());
  if (exists) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
  try {
    const info = db.prepare(`INSERT INTO users (username,password_hash,full_name,role,unit_id)
      VALUES (?,?,?,?,?)`).run(
      String(username).trim(), bcrypt.hashSync(password, 10), full_name || null, r,
      r === 'editor' ? Number(unit_id) : null
    );
    res.json({ id: info.lastInsertRowid, ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  const { full_name, role, unit_id, active } = req.body || {};
  const r = role === 'super_admin' ? 'super_admin' : (role === 'editor' ? 'editor' : target.role);
  if (r === 'editor' && !unit_id) return res.status(400).json({ error: 'Editor phải được gán một đơn vị' });
  db.prepare(`UPDATE users SET full_name=?, role=?, unit_id=?, active=? WHERE id=?`).run(
    full_name ?? target.full_name,
    r,
    r === 'editor' ? Number(unit_id) : null,
    active == null ? target.active : (active ? 1 : 0),
    id
  );
  res.json({ ok: true });
});

router.post('/:id/reset-password', (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  const info = db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), id);
  if (!info.changes) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Không thể xóa chính mình' });
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  res.json({ ok: true });
});

export default router;
