import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Public metadata: groups, units, kpis (+ allocations)
router.get('/groups', (req, res) => {
  res.json(db.prepare('SELECT code,name,sort_order FROM groups ORDER BY sort_order').all());
});

router.get('/units', (req, res) => {
  res.json(db.prepare('SELECT id,code,name,type FROM units ORDER BY type, name').all());
});

router.get('/kpis', (req, res) => {
  const kpis = db.prepare('SELECT * FROM kpis ORDER BY sort_order').all();
  const allocs = db.prepare(`
    SELECT a.kpi_id, a.target, u.id AS unit_id, u.code AS unit_code, u.name AS unit_name
    FROM allocations a JOIN units u ON u.id = a.unit_id
  `).all();
  const byKpi = {};
  for (const a of allocs) (byKpi[a.kpi_id] ||= []).push(a);
  res.json(kpis.map(k => ({ ...k, allocations: byKpi[k.id] || [] })));
});

export default router;
