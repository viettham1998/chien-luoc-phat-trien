import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'clpt-khtn-dhqg-hcm-dev-secret-change-me';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, unit_id: user.unit_id, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin')
    return res.status(403).json({ error: 'Chỉ Super Admin có quyền thực hiện' });
  next();
}

// Editors may only touch their own unit; super admins may touch any unit.
export function canEditUnit(user, unitId) {
  if (user.role === 'super_admin') return true;
  return user.role === 'editor' && Number(user.unit_id) === Number(unitId);
}
