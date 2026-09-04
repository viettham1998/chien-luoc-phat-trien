export const MONTH_LABELS = {
  1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6',
  7: 'T7', 8: 'T8', 9: 'T9', 10: 'T10', 11: 'T11', 12: 'T12'
};
export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Colors per strategic group
export const GROUP_COLORS = {
  I: '#8b5cf6',   // quản trị
  II: '#3b82f6',  // đào tạo
  III: '#06b6d4', // KHCN
  IV: '#22c55e',  // hợp tác
  V: '#f59e0b',   // tài chính
  B: '#ef4444'    // nhiệm vụ khác
};
export const GROUP_SHORT = {
  I: 'Quản trị ĐH', II: 'Đào tạo', III: 'Khoa học & CN',
  IV: 'Hợp tác & hội nhập', V: 'Tài chính', B: 'Nhiệm vụ khác'
};

export const PALETTE = [
  '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444',
  '#ec4899', '#14b8a6', '#eab308', '#6366f1', '#f97316', '#10b981',
  '#a855f7', '#0ea5e9', '#84cc16', '#f43f5e'
];

export function buildIndex(data) {
  const kpiByCode = {};
  data.kpis.forEach(k => (kpiByCode[k.code] = k));
  const unitByCode = {};
  data.units.forEach(u => (unitByCode[u.code] = u));
  return { kpiByCode, unitByCode };
}

// Total actual per KPI (sum of monthly entries up to `upto` month inclusive)
export function actualByKpi(data, upto = 12) {
  const acc = {};
  for (const e of data.entries) {
    if (e.month > upto) continue;
    acc[e.kpi_code] = (acc[e.kpi_code] || 0) + e.value;
  }
  return acc;
}

// Target per KPI = school target if numeric>0 else sum of allocations
export function targetByKpi(data) {
  const allocSum = {};
  for (const a of data.allocations) allocSum[a.kpi_code] = (allocSum[a.kpi_code] || 0) + a.target;
  const out = {};
  for (const k of data.kpis) {
    if (k.unit_kind === 'ratio') { out[k.code] = null; continue; }
    if (k.target_school && k.target_school > 0) out[k.code] = k.target_school;
    else if (allocSum[k.code]) out[k.code] = allocSum[k.code];
    else out[k.code] = null;
  }
  return out;
}

// KPI progress rows (count-type), sorted
export function kpiProgress(data, upto = 12) {
  const actual = actualByKpi(data, upto);
  const target = targetByKpi(data);
  return data.kpis.map(k => {
    const a = actual[k.code] || 0;
    const t = target[k.code];
    return {
      code: k.code, name: k.name, group: k.group_code,
      lead: k.lead_unit, kind: k.unit_kind,
      target2030: k.target_2030,
      actual: a, target: t,
      pct: t ? Math.min(100, Math.round((a / t) * 1000) / 10) : null
    };
  });
}

// Cumulative time series across months for a filter (count-type only)
export function cumulativeSeries(data, filter = () => true) {
  const perMonth = {};
  for (const e of data.entries) {
    const k = data.kpis.find(x => x.code === e.kpi_code);
    if (k && k.unit_kind === 'ratio') continue;
    if (!filter(e)) continue;
    perMonth[e.month] = (perMonth[e.month] || 0) + e.value;
  }
  let run = 0;
  return MONTHS.map(m => {
    run += perMonth[m] || 0;
    return { month: m, label: MONTH_LABELS[m], monthly: perMonth[m] || 0, cumulative: run };
  });
}

// Per-group cumulative series (for stacked area over months)
export function groupStackedSeries(data) {
  const groups = [...new Set(data.kpis.map(k => k.group_code))].filter(Boolean);
  const run = {};
  groups.forEach(g => (run[g] = 0));
  const perMonthGroup = {};
  for (const e of data.entries) {
    const k = data.kpis.find(x => x.code === e.kpi_code);
    if (!k || k.unit_kind === 'ratio') continue;
    (perMonthGroup[e.month] ||= {});
    perMonthGroup[e.month][k.group_code] = (perMonthGroup[e.month][k.group_code] || 0) + e.value;
  }
  return MONTHS.map(m => {
    const row = { month: m, label: MONTH_LABELS[m] };
    groups.forEach(g => {
      run[g] += (perMonthGroup[m]?.[g]) || 0;
      row[g] = run[g];
    });
    return row;
  });
}

// Totals per group (count-type)
export function groupTotals(data, upto = 12) {
  const acc = {};
  for (const e of data.entries) {
    if (e.month > upto) continue;
    const k = data.kpis.find(x => x.code === e.kpi_code);
    if (!k || k.unit_kind === 'ratio') continue;
    acc[k.group_code] = (acc[k.group_code] || 0) + e.value;
  }
  return Object.entries(acc).map(([g, v]) => ({
    group: g, name: GROUP_SHORT[g] || g, value: v, color: GROUP_COLORS[g]
  })).sort((a, b) => b.value - a.value);
}

// Totals per unit (count-type), top N
export function unitTotals(data, upto = 12) {
  const acc = {};
  for (const e of data.entries) {
    if (e.month > upto) continue;
    const k = data.kpis.find(x => x.code === e.kpi_code);
    if (!k || k.unit_kind === 'ratio') continue;
    if (!e.value) continue;
    acc[e.unit_code] = (acc[e.unit_code] || 0) + e.value;
  }
  return Object.entries(acc)
    .map(([code, value]) => {
      const u = data.units.find(x => x.code === code);
      return { code, name: u?.name || code, value };
    })
    .sort((a, b) => b.value - a.value);
}

// Contribution of units for one KPI
export function unitBreakdownForKpi(data, kpiCode, upto = 12) {
  const acc = {};
  for (const e of data.entries) {
    if (e.kpi_code !== kpiCode || e.month > upto) continue;
    acc[e.unit_code] = (acc[e.unit_code] || 0) + e.value;
  }
  return Object.entries(acc)
    .map(([code, value]) => {
      const u = data.units.find(x => x.code === code);
      return { code, name: u?.name || code, value };
    })
    .filter(x => x.value)
    .sort((a, b) => b.value - a.value);
}

export function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString('vi-VN');
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 100) / 100).toLocaleString('vi-VN');
}
