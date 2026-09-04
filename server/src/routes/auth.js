import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(String(username).trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });

  const unit = user.unit_id ? db.prepare('SELECT id,code,name FROM units WHERE id = ?').get(user.unit_id) : null;
  res.json({
    token: signToken(user),
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, unit }
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id,username,full_name,role,unit_id FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Không tìm thấy người dùng' });
  const unit = user.unit_id ? db.prepare('SELECT id,code,name FROM units WHERE id = ?').get(user.unit_id) : null;
  res.json({ user: { ...user, unit } });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword || '', user.password_hash))
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
  res.json({ ok: true });
});

export default router;
