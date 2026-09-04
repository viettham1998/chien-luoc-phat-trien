import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap, ComposedChart
} from 'recharts';
import {
  MONTH_LABELS, GROUP_COLORS, GROUP_SHORT, PALETTE,
  cumulativeSeries, groupStackedSeries, groupTotals, unitTotals, kpiProgress, fmt
} from '../lib/compute.js';

function themeColors() {
  const light = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  return {
    light,
    axis: { stroke: light ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.25)', fontSize: 11 },
    grid: light ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.06)',
    tick: light ? 'rgba(30,41,59,0.72)' : 'rgba(255,255,255,0.6)',
    tickDim: light ? 'rgba(30,41,59,0.45)' : 'rgba(255,255,255,0.3)',
    legend: light ? '#334155' : '#cbd5e1'
  };
}

function TT({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[rgb(var(--fg-rgb)_/_0.15)] bg-[rgb(var(--elevated-rgb)_/_0.96)] px-3 py-2 text-xs shadow-xl">
      {label != null && <div className="mb-1 font-semibold text-[rgb(var(--fg-rgb))]">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[rgb(var(--fg-rgb)_/_0.8)]">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}:</span>
          <span className="font-semibold text-[rgb(var(--fg-rgb))]">{fmt(p.value)}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// 1. Cumulative growth over months — the "clearer every month" story
export function CumulativeChart({ data, upto }) {
  const series = cumulativeSeries(data).map(d => ({ ...d, faded: d.month > upto }));
  const { axis, grid } = themeColors();
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} />
        <Tooltip content={<TT />} />
        <Bar dataKey="monthly" name="Phát sinh trong tháng" barSize={22} radius={[4, 4, 0, 0]} fill="#1f36f5" fillOpacity={0.55} />
        <Area type="monotone" dataKey="cumulative" name="Lũy kế" stroke="#60a5fa" strokeWidth={3} fill="url(#cumFill)" dot={{ r: 3, fill: '#60a5fa' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// 2. Stacked area per strategic group over months
export function GroupStackedArea({ data }) {
  const series = groupStackedSeries(data);
  const groups = Object.keys(GROUP_COLORS).filter(g => series.some(r => r[g] > 0));
  const { axis, grid, legend } = themeColors();
  return (
    <ResponsiveContainer width="100%" height={380}>
      <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} />
        <Tooltip content={<TT />} />
        <Legend wrapperStyle={{ fontSize: 12, color: legend }} formatter={v => GROUP_SHORT[v] || v} />
        {groups.map(g => (
          <Area key={g} type="monotone" dataKey={g} stackId="1" name={g}
            stroke={GROUP_COLORS[g]} fill={GROUP_COLORS[g]} fillOpacity={0.35} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 3. KPI progress vs target (horizontal bars)
export function KpiProgressBars({ data, upto }) {
  const rows = kpiProgress(data, upto)
    .filter(r => r.kind === 'count' && r.target)
    .map(r => ({ ...r, label: `${r.code}` }))
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const { axis, grid } = themeColors();
  return (
    <ResponsiveContainer width="100%" height={Math.max(360, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 6, right: 40, left: 8, bottom: 6 }}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" {...axis} />
        <YAxis type="category" dataKey="label" width={54} {...axis} />
        <Tooltip content={<TT unit="%" />} />
        <Bar dataKey="pct" name="Hoàn thành" radius={[0, 6, 6, 0]} barSize={18}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.pct >= 100 ? '#22c55e' : r.pct >= 50 ? '#3b82f6' : '#f59e0b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 4. Donut per group
export function GroupDonut({ data, upto }) {
  const rows = groupTotals(data, upto);
  const { legend } = themeColors();
  return (
    <ResponsiveContainer width="100%" height={380}>
      <PieChart>
        <Tooltip content={<TT />} />
        <Legend wrapperStyle={{ fontSize: 12, color: legend }} />
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={80} outerRadius={140} paddingAngle={2} stroke="none">
          {rows.map((r, i) => <Cell key={i} fill={r.color || PALETTE[i % PALETTE.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

// 5. Unit ranking
export function UnitRanking({ data, upto, top = 14 }) {
  const rows = unitTotals(data, upto).slice(0, top);
  const { axis, grid } = themeColors();
  return (
    <ResponsiveContainer width="100%" height={Math.max(360, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 6, right: 30, left: 8, bottom: 6 }}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="code" width={70} {...axis} />
        <Tooltip content={<TT />} />
        <Bar dataKey="value" name="Số liệu đóng góp" radius={[0, 6, 6, 0]} barSize={16}>
          {rows.map((r, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 6. Radar of group completion %
export function GroupRadar({ data, upto }) {
  const prog = kpiProgress(data, upto).filter(r => r.kind === 'count' && r.target);
  const byGroup = {};
  prog.forEach(r => {
    (byGroup[r.group] ||= []).push(r.pct ?? 0);
  });
  const rows = Object.keys(GROUP_COLORS)
    .filter(g => byGroup[g])
    .map(g => ({
      group: GROUP_SHORT[g] || g,
      pct: Math.round(byGroup[g].reduce((a, b) => a + b, 0) / byGroup[g].length)
    }));
  const { tick, tickDim, light } = themeColors();
  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={rows} outerRadius={140}>
        <PolarGrid stroke={light ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.12)'} />
        <PolarAngleAxis dataKey="group" tick={{ fill: tick, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: tickDim, fontSize: 10 }} />
        <Tooltip content={<TT unit="%" />} />
        <Radar name="Mức hoàn thành TB" dataKey="pct" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// 7. Treemap per group
export function GroupTreemap({ data, upto }) {
  const rows = groupTotals(data, upto).map(r => ({ name: r.name, size: r.value, fill: r.color }));
  const { light } = themeColors();
  return (
    <ResponsiveContainer width="100%" height={380}>
      <Treemap data={rows} dataKey="size" stroke={light ? '#eef1f7' : '#060912'} content={<TreemapCell gap={light ? '#eef1f7' : '#060912'} />} />
    </ResponsiveContainer>
  );
}
function TreemapCell({ x, y, width, height, name, size, fill, gap = '#060912' }) {
  if (width < 1 || height < 1) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: gap, strokeWidth: 2 }} rx={6} />
      {width > 70 && height > 40 && (
        <>
          <text x={x + 10} y={y + 24} fill="#fff" fontSize={13} fontWeight={700}>{name}</text>
          <text x={x + 10} y={y + 44} fill="rgba(255,255,255,0.85)" fontSize={16} fontWeight={800}>{fmt(size)}</text>
        </>
      )}
    </g>
  );
}
