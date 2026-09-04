import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// One flexible payload the frontend can slice into many chart layouts.
router.get('/data', (req, res) => {
  const year = Number(req.query.year) || 2026;

  const groups = db.prepare('SELECT code,name,sort_order FROM groups ORDER BY sort_order').all();
  const units = db.prepare('SELECT id,code,name,type FROM units ORDER BY type,name').all();
  const kpis = db.prepare('SELECT * FROM kpis ORDER BY sort_order').all();
  const allocations = db.prepare(`
    SELECT a.kpi_id, a.unit_id, a.target, k.code AS kpi_code, u.code AS unit_code
    FROM allocations a JOIN kpis k ON k.id=a.kpi_id JOIN units u ON u.id=a.unit_id
  `).all();

  const entries = db.prepare(`
    SELECT k.code AS kpi_code, u.code AS unit_code, e.month, e.value
    FROM entries e
    JOIN kpis k ON k.id = e.kpi_id
    JOIN units u ON u.id = e.unit_id
    WHERE e.year = ? AND e.is_current = 1
    ORDER BY e.month
  `).all(year);

  res.json({ year, groups, units, kpis, allocations, entries });
});

// Available reporting years (for a year selector)
router.get('/years', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT year FROM entries ORDER BY year').all();
  const years = rows.map(r => r.year);
  if (!years.includes(2026)) years.unshift(2026);
  res.json(years);
});

// Server-side headline numbers (for the hero band)
router.get('/summary', (req, res) => {
  const year = Number(req.query.year) || 2026;
  const kpis = db.prepare('SELECT id,code,name,group_code,target_school,unit_kind FROM kpis').all();
  const actualByKpi = {};
  for (const r of db.prepare(`
      SELECT kpi_id, SUM(value) v FROM entries WHERE year=? AND is_current=1 GROUP BY kpi_id
    `).all(year)) actualByKpi[r.kpi_id] = r.v;

  let onTrack = 0, counted = 0, totalActual = 0;
  const perGroup = {};
  for (const k of kpis) {
    const actual = actualByKpi[k.id] || 0;
    totalActual += k.unit_kind === 'count' ? actual : 0;
    if (k.unit_kind === 'count' && k.target_school) {
      counted++;
      if (actual >= k.target_school) onTrack++;
    }
    const g = k.group_code || 'B';
    perGroup[g] = perGroup[g] || { group: g, actual: 0, kpiCount: 0 };
    perGroup[g].actual += k.unit_kind === 'count' ? actual : 0;
    perGroup[g].kpiCount++;
  }
  const monthsReported = db.prepare(
    'SELECT COUNT(DISTINCT month) c FROM entries WHERE year=? AND is_current=1'
  ).get(year).c;

  res.json({
    year,
    totalKpis: kpis.length,
    monthsReported,
    onTrack,
    counted,
    totalActual,
    perGroup: Object.values(perGroup)
  });
});

export default router;
