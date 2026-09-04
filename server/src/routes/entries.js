import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, canEditUnit } from '../auth.js';

const router = Router();

// What KPIs is a given unit responsible for? (allocation exists, or unit is the lead)
function kpisForUnit(unitId) {
  const unit = db.prepare('SELECT id,code,name FROM units WHERE id=?').get(unitId);
  if (!unit) return [];
  const rows = db.prepare(`
    SELECT k.*,
      (SELECT target FROM allocations a WHERE a.kpi_id=k.id AND a.unit_id=?) AS my_target
    FROM kpis k
    WHERE EXISTS (SELECT 1 FROM allocations a WHERE a.kpi_id=k.id AND a.unit_id=?)
       OR k.lead_unit = ?
    ORDER BY k.sort_order
  `).all(unitId, unitId, unit.code);
  return rows;
}

// Editor/admin: KPIs the current user may report on, with their current values.
router.get('/my-kpis', requireAuth, (req, res) => {
  const year = Number(req.query.year) || 2026;
  let unitId = req.user.unit_id;
  if (req.user.role === 'super_admin' && req.query.unit_id) unitId = Number(req.query.unit_id);
  if (!unitId) return res.status(400).json({ error: 'Tài khoản chưa được gán đơn vị' });

  const kpis = kpisForUnit(unitId);
  const current = db.prepare(`
    SELECT kpi_id, month, value, note FROM entries
    WHERE unit_id=? AND year=? AND is_current=1
  `).all(unitId, year);
  const byKpi = {};
  for (const c of current) {
    (byKpi[c.kpi_id] ||= {})[c.month] = { value: c.value, note: c.note };
  }
  res.json(kpis.map(k => ({ ...k, months: byKpi[k.id] || {} })));
});

// Full append history for one (kpi, unit) cell — proves nothing is overwritten.
router.get('/history', requireAuth, (req, res) => {
  const { kpi_id, unit_id, year, month } = req.query;
  const rows = db.prepare(`
    SELECT e.id, e.value, e.note, e.created_at, e.is_current, u.full_name AS by_name
    FROM entries e LEFT JOIN users u ON u.id = e.created_by
    WHERE e.kpi_id=? AND e.unit_id=? AND e.year=? AND e.month=?
    ORDER BY e.created_at DESC, e.id DESC
  `).all(Number(kpi_id), Number(unit_id), Number(year), Number(month));
  res.json(rows);
});

// Submit / correct a monthly figure. Append-only: previous is flagged, new inserted.
router.post('/submit', requireAuth, (req, res) => {
  const { kpi_id, year, month, value, note } = req.body || {};
  let unit_id = req.body.unit_id;
  if (req.user.role !== 'super_admin') unit_id = req.user.unit_id;
  unit_id = Number(unit_id);

  if (!kpi_id || !year || !month || unit_id == null)
    return res.status(400).json({ error: 'Thiếu dữ liệu bắt buộc' });
  if (month < 1 || month > 12) return res.status(400).json({ error: 'Tháng không hợp lệ' });
  if (!canEditUnit(req.user, unit_id))
    return res.status(403).json({ error: 'Bạn chỉ được nhập số liệu cho đơn vị của mình' });

  const kpi = db.prepare('SELECT id FROM kpis WHERE id=?').get(Number(kpi_id));
  const unit = db.prepare('SELECT id FROM units WHERE id=?').get(unit_id);
  if (!kpi || !unit) return res.status(404).json({ error: 'KPI hoặc đơn vị không tồn tại' });

  const val = Number(value);
  if (Number.isNaN(val)) return res.status(400).json({ error: 'Giá trị phải là số' });

  const tx = db.transaction(() => {
    db.prepare(`UPDATE entries SET is_current=0
      WHERE kpi_id=? AND unit_id=? AND year=? AND month=? AND is_current=1`)
      .run(Number(kpi_id), unit_id, Number(year), Number(month));
    db.prepare(`INSERT INTO entries (kpi_id,unit_id,year,month,value,note,created_by,is_current)
      VALUES (?,?,?,?,?,?,?,1)`)
      .run(Number(kpi_id), unit_id, Number(year), Number(month), val, note || null, req.user.id);
  });
  tx();
  res.json({ ok: true });
});

export default router;
