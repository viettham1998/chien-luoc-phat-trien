import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import {
  MONTH_LABELS, GROUP_COLORS, GROUP_SHORT, kpiProgress, groupTotals,
  actualByKpi, targetByKpi, unitTotals, fmt
} from '../lib/compute.js';
import {
  CumulativeChart, GroupStackedArea, KpiProgressBars, GroupDonut,
  UnitRanking, GroupRadar, GroupTreemap
} from '../components/Charts.jsx';

const LAYOUTS = [
  { id: 'cumulative', label: 'Tăng trưởng lũy kế', icon: '📈', desc: 'Số liệu dày lên theo từng tháng' },
  { id: 'stacked', label: 'Miền theo nhóm', icon: '🗻', desc: 'Đóng góp 6 nhóm chiến lược theo thời gian' },
  { id: 'progress', label: 'Tiến độ KPI', icon: '🎯', desc: 'Mức hoàn thành so với chỉ tiêu 2026' },
  { id: 'donut', label: 'Cơ cấu nhóm', icon: '🍩', desc: 'Tỷ trọng theo nhóm chiến lược' },
  { id: 'ranking', label: 'Xếp hạng đơn vị', icon: '🏅', desc: 'Đơn vị đóng góp nhiều nhất' },
  { id: 'radar', label: 'Radar hoàn thành', icon: '🕸️', desc: 'Mức hoàn thành trung bình mỗi nhóm' },
  { id: 'treemap', label: 'Bản đồ khối', icon: '🧩', desc: 'Khối lượng theo nhóm' }
];

function StatTile({ label, value, sub, accent, icon }) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div className="label">{label}</div>
        <div className="text-lg">{icon}</div>
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight" style={{ color: accent }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/45">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [years, setYears] = useState([2026]);
  const [year, setYear] = useState(2026);
  const [layout, setLayout] = useState('cumulative');
  const [upto, setUpto] = useState(12);
  const [groupFilter, setGroupFilter] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/dashboard/years', { auth: false }).then(setYears).catch(() => {});
  }, []);
  useEffect(() => {
    setData(null);
    api(`/dashboard/data?year=${year}`, { auth: false })
      .then(d => {
        setData(d);
        const months = d.entries.map(e => e.month);
        setUpto(months.length ? Math.max(...months) : 12);
      })
      .catch(e => setErr(e.message));
  }, [year]);

  const filtered = useMemo(() => {
    if (!data) return null;
    if (!groupFilter) return data;
    const kpis = data.kpis.filter(k => k.group_code === groupFilter);
    const codes = new Set(kpis.map(k => k.code));
    return {
      ...data,
      kpis,
      entries: data.entries.filter(e => codes.has(e.kpi_code)),
      allocations: data.allocations.filter(a => codes.has(a.kpi_code))
    };
  }, [data, groupFilter]);

  const stats = useMemo(() => {
    if (!data) return null;
    const prog = kpiProgress(data, upto).filter(r => r.kind === 'count' && r.target);
    const onTrack = prog.filter(r => (r.pct ?? 0) >= 100).length;
    const totalActual = Object.entries(actualByKpi(data, upto)).reduce((s, [code, v]) => {
      const k = data.kpis.find(x => x.code === code);
      return s + (k && k.unit_kind === 'count' ? v : 0);
    }, 0);
    const activeUnits = new Set(data.entries.filter(e => e.month <= upto && e.value).map(e => e.unit_code)).size;
    const monthsReported = new Set(data.entries.map(e => e.month)).size;
    return { onTrack, counted: prog.length, totalActual, activeUnits, monthsReported };
  }, [data, upto]);

  if (err) return <div className="card p-8 text-center text-red-300">{err}</div>;
  if (!data) return <Skeleton />;

  const monthsWithData = [...new Set(data.entries.map(e => e.month))].sort((a, b) => a - b);
  const maxMonth = monthsWithData.length ? Math.max(...monthsWithData) : 12;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="animate-floatIn overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-950/60 via-[#0a1130]/40 to-transparent p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="chip bg-brand-500/15 text-brand-200">Biểu mẫu số 02 · Báo cáo VNU</div>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">
              Kết quả thực hiện KPIs Chiến lược phát triển
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Giai đoạn 2021–2030, tầm nhìn 2045 · Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM.
              Số liệu được cập nhật <span className="text-white/80">bổ sung theo từng tháng</span> — bức tranh KPI ngày càng rõ nét.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="label">Năm báo cáo</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-auto">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatTile label="Tổng số KPIs" value={data.kpis.length} sub="chỉ tiêu chiến lược" accent="#8b5cf6" icon="🎯" />
          <StatTile label="Đơn vị tham gia" value={stats.activeUnits} sub={`/ ${data.units.length} đơn vị`} accent="#3b82f6" icon="🏛️" />
          <StatTile label="Tháng có số liệu" value={stats.monthsReported} sub="kỳ báo cáo đã ghi nhận" accent="#06b6d4" icon="🗓️" />
          <StatTile label="KPI đạt chỉ tiêu 2026" value={`${stats.onTrack}/${stats.counted}`} sub="đã hoàn thành mục tiêu năm" accent="#22c55e" icon="✅" />
          <StatTile label="Tổng sản phẩm đầu ra" value={fmt(stats.totalActual)} sub="lũy kế các KPI định lượng" accent="#f59e0b" icon="📦" />
        </div>
      </section>

      {/* GROUP FILTER CHIPS */}
      <section className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setGroupFilter(null)}
          className={`chip border ${!groupFilter ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-white/50 hover:text-white'}`}
        >Tất cả nhóm</button>
        {Object.keys(GROUP_COLORS).filter(g => data.kpis.some(k => k.group_code === g)).map(g => (
          <button
            key={g}
            onClick={() => setGroupFilter(groupFilter === g ? null : g)}
            className={`chip border transition ${groupFilter === g ? 'text-white' : 'text-white/60 hover:text-white'}`}
            style={{
              borderColor: groupFilter === g ? GROUP_COLORS[g] : 'rgba(255,255,255,0.1)',
              background: groupFilter === g ? GROUP_COLORS[g] + '22' : 'transparent'
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLORS[g] }} />
            {g}. {GROUP_SHORT[g]}
          </button>
        ))}
      </section>

      {/* MAIN VISUAL */}
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-6">
          {/* Layout switcher */}
          <div className="mb-5 flex flex-wrap gap-2">
            {LAYOUTS.map(l => (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  layout === l.id ? 'border-brand-400/60 bg-brand-500/15 text-white shadow-glow' : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white'
                }`}
                title={l.desc}
              >
                <span>{l.icon}</span> {l.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <div className="text-lg font-bold text-white">{LAYOUTS.find(l => l.id === layout)?.label}</div>
            <div className="text-xs text-white/45">{LAYOUTS.find(l => l.id === layout)?.desc}
              {groupFilter && <span className="ml-1 text-brand-300">· Lọc: {GROUP_SHORT[groupFilter]}</span>}</div>
          </div>

          <ChartArea layout={layout} data={filtered} upto={upto} />

          {/* Month time slider */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="label">Xem số liệu lũy kế đến hết tháng</div>
              <div className="text-sm font-bold text-brand-300">{MONTH_LABELS[upto]} / {year}</div>
            </div>
            <input
              type="range" min={1} max={12} value={upto}
              onChange={e => setUpto(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-white/30">
              {[1, 3, 6, 9, 12].map(m => <span key={m}>{MONTH_LABELS[m]}</span>)}
            </div>
            <div className="mt-2 text-xs text-white/40">
              Kéo thanh trượt để thấy dữ liệu dày lên theo thời gian. Đã ghi nhận đến <span className="text-white/70">{MONTH_LABELS[maxMonth]}</span>.
            </div>
          </div>
        </div>

        {/* Side: group leaderboard */}
        <GroupSidebar data={data} upto={upto} onPick={setGroupFilter} active={groupFilter} />
      </section>

      {/* KPI TABLE */}
      <KpiTable data={filtered} upto={upto} />
    </div>
  );
}

function ChartArea({ layout, data, upto }) {
  switch (layout) {
    case 'cumulative': return <CumulativeChart data={data} upto={upto} />;
    case 'stacked': return <GroupStackedArea data={data} />;
    case 'progress': return <KpiProgressBars data={data} upto={upto} />;
    case 'donut': return <GroupDonut data={data} upto={upto} />;
    case 'ranking': return <UnitRanking data={data} upto={upto} />;
    case 'radar': return <GroupRadar data={data} upto={upto} />;
    case 'treemap': return <GroupTreemap data={data} upto={upto} />;
    default: return null;
  }
}

function GroupSidebar({ data, upto, onPick, active }) {
  const totals = groupTotals(data, upto);
  const max = Math.max(1, ...totals.map(t => t.value));
  return (
    <div className="card p-6">
      <div className="mb-4 text-sm font-bold text-white">Đóng góp theo nhóm chiến lược</div>
      <div className="space-y-3">
        {totals.map(t => (
          <button key={t.group} onClick={() => onPick(active === t.group ? null : t.group)} className="w-full text-left">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-white/70">{t.group}. {t.name}</span>
              <span className="font-bold text-white">{fmt(t.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full transition-all" style={{ width: `${(t.value / max) * 100}%`, background: t.color }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function KpiTable({ data, upto }) {
  const rows = kpiProgress(data, upto);
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4 text-sm font-bold text-white">
        Chi tiết các chỉ tiêu (đến {MONTH_LABELS[upto]})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-6 py-3 font-medium">Mã</th>
              <th className="px-4 py-3 font-medium">Chỉ tiêu</th>
              <th className="px-4 py-3 font-medium">Chủ trì</th>
              <th className="px-4 py-3 text-right font-medium">Thực hiện</th>
              <th className="px-4 py-3 text-right font-medium">Chỉ tiêu 2026</th>
              <th className="px-4 py-3 font-medium">Tiến độ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.code} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-6 py-3">
                  <span className="chip text-[11px] font-bold" style={{ background: (GROUP_COLORS[r.group] || '#666') + '22', color: GROUP_COLORS[r.group] }}>{r.code}</span>
                </td>
                <td className="max-w-[380px] px-4 py-3 text-white/80">{r.name}</td>
                <td className="px-4 py-3 text-white/50">{r.lead || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-white">{r.kind === 'ratio' ? '—' : fmt(r.actual)}</td>
                <td className="px-4 py-3 text-right text-white/60">{r.target ? fmt(r.target) : (r.kind === 'ratio' ? 'tỷ lệ' : '—')}</td>
                <td className="px-4 py-3">
                  {r.pct != null ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 100 ? '#22c55e' : r.pct >= 50 ? '#3b82f6' : '#f59e0b' }} />
                      </div>
                      <span className="text-xs text-white/60">{r.pct}%</span>
                    </div>
                  ) : <span className="text-xs text-white/30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-52 animate-pulse rounded-3xl bg-white/5" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="h-[560px] animate-pulse rounded-2xl bg-white/5" />
        <div className="h-[560px] animate-pulse rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}
