import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../store.jsx';
import { MONTH_LABELS, GROUP_COLORS, fmt } from '../lib/compute.js';

const REPORT_MONTHS = [6, 7, 8, 9, 10, 11, 12];

export default function Editor() {
  const { user } = useAuth();
  const isAdmin = user.role === 'super_admin';
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState(isAdmin ? '' : user.unit?.id);
  const [year] = useState(2026);
  const [kpis, setKpis] = useState(null);
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (isAdmin) api('/meta/units').then(setUnits);
  }, [isAdmin]);

  function load() {
    if (!unitId) { setKpis(null); return; }
    const q = isAdmin ? `?year=${year}&unit_id=${unitId}` : `?year=${year}`;
    api('/entries/my-kpis' + q).then(setKpis).catch(e => flash(e.message, true));
  }
  useEffect(load, [unitId]);

  function flash(msg, isErr) {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 2500);
  }

  async function save(kpi, month, value, note) {
    try {
      await api('/entries/submit', {
        method: 'POST',
        body: { kpi_id: kpi.id, unit_id: isAdmin ? Number(unitId) : undefined, year, month, value: Number(value), note }
      });
      flash(`Đã lưu ${kpi.code} · ${MONTH_LABELS[month]} = ${value}`);
      load();
    } catch (e) {
      flash(e.message, true);
    }
  }

  const unitName = isAdmin
    ? units.find(u => u.id === Number(unitId))?.name
    : user.unit?.name;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Nhập số liệu báo cáo tháng</h1>
          <p className="mt-1 text-sm text-white/50">
            Ghi số liệu <span className="text-white/80">phát sinh của từng tháng</span> (không nhập lũy kế). Mỗi lần lưu được ghi thêm vào lịch sử — không ghi đè dữ liệu cũ.
          </p>
        </div>
        {isAdmin && (
          <div>
            <label className="label mb-1 block">Chọn đơn vị</label>
            <select value={unitId} onChange={e => setUnitId(e.target.value)} className="input w-72">
              <option value="">— Chọn đơn vị —</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.code} · {u.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="card p-4 text-sm">
          <span className="label">Đơn vị của bạn</span>
          <div className="mt-1 text-lg font-bold text-white">{user.unit?.name} <span className="text-white/40">({user.unit?.code})</span></div>
        </div>
      )}

      {isAdmin && !unitId && (
        <div className="card p-10 text-center text-white/40">Chọn một đơn vị để nhập / chỉnh sửa số liệu.</div>
      )}

      {unitId && !kpis && <div className="card p-10 text-center text-white/40">Đang tải…</div>}

      {kpis && kpis.length === 0 && (
        <div className="card p-10 text-center text-white/40">Đơn vị này chưa được phân bổ KPI nào.</div>
      )}

      {kpis && kpis.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-white/10 px-5 py-3 text-sm font-semibold text-white/80">
            {unitName} — {kpis.length} chỉ tiêu · Năm {year}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-white/[0.02]">
                <tr className="text-xs uppercase tracking-wider text-white/40">
                  <th className="sticky left-0 bg-[#0a0f1f] px-4 py-3 text-left font-medium">KPI</th>
                  <th className="px-3 py-3 text-right font-medium">Chỉ tiêu</th>
                  {REPORT_MONTHS.map(m => <th key={m} className="px-2 py-3 text-center font-medium">{MONTH_LABELS[m]}</th>)}
                  <th className="px-3 py-3 text-right font-medium">Lũy kế</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map(k => (
                  <KpiRow key={k.id} kpi={k} unitId={Number(unitId)} year={year} onSave={save} onHistory={setHistory} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl ${toast.isErr ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {history && <HistoryModal {...history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function KpiRow({ kpi, unitId, year, onSave, onHistory }) {
  const total = REPORT_MONTHS.reduce((s, m) => s + (kpi.months[m]?.value || 0), 0);
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="sticky left-0 z-10 max-w-[360px] bg-[#0a0f1f] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="chip text-[10px] font-bold" style={{ background: (GROUP_COLORS[kpi.group_code] || '#666') + '22', color: GROUP_COLORS[kpi.group_code] }}>{kpi.code}</span>
          <span className="text-white/85">{kpi.name}</span>
        </div>
        {kpi.method && <div className="mt-0.5 pl-1 text-[11px] text-white/35">Cách tính: {kpi.method}</div>}
      </td>
      <td className="px-3 py-3 text-right text-white/50">{kpi.my_target != null ? fmt(kpi.my_target) : '—'}</td>
      {REPORT_MONTHS.map(m => (
        <td key={m} className="px-1.5 py-2">
          <MonthCell
            value={kpi.months[m]?.value}
            onCommit={(v, note) => onSave(kpi, m, v, note)}
            onHistory={() => onHistory({ kpi, unitId, year, month: m })}
          />
        </td>
      ))}
      <td className="px-3 py-3 text-right font-bold text-brand-300">{fmt(total)}</td>
    </tr>
  );
}

function MonthCell({ value, onCommit, onHistory }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => { setV(value ?? ''); }, [value]);
  const dirty = String(v) !== String(value ?? '');
  return (
    <div className="group relative">
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && dirty && v !== '') onCommit(v); }}
        onBlur={() => { if (dirty && v !== '') onCommit(v); }}
        inputMode="decimal"
        className={`w-16 rounded-lg border px-2 py-1.5 text-center text-sm outline-none transition ${
          dirty ? 'border-amber-400/60 bg-amber-400/10 text-white' :
          value != null ? 'border-white/10 bg-white/[0.04] text-white' : 'border-white/5 bg-transparent text-white/30'
        } focus:border-brand-400/60`}
        placeholder="–"
      />
      {value != null && (
        <button onClick={onHistory} title="Lịch sử chỉnh sửa"
          className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-brand-500 text-[9px] text-white group-hover:grid">↻</button>
      )}
    </div>
  );
}

function HistoryModal({ kpi, unitId, year, month, onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`/entries/history?kpi_id=${kpi.id}&unit_id=${unitId}&year=${year}&month=${month}`).then(setRows);
  }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-1 text-sm font-bold text-white">Lịch sử ghi số liệu · {kpi.code} · {MONTH_LABELS[month]}/{year}</div>
        <div className="mb-4 text-xs text-white/45">Mỗi lần chỉnh sửa được lưu thành bản ghi mới (append-only), không xóa dữ liệu cũ.</div>
        <div className="space-y-2">
          {!rows && <div className="text-white/40">Đang tải…</div>}
          {rows?.map((r, i) => (
            <div key={r.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${r.is_current ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-white/10 bg-white/[0.02] opacity-60'}`}>
              <div>
                <span className="font-bold text-white">{fmt(r.value)}</span>
                {r.note && <span className="ml-2 text-xs text-white/50">“{r.note}”</span>}
              </div>
              <div className="text-right text-[11px] text-white/40">
                {r.is_current ? <span className="text-emerald-300">Hiện hành</span> : 'Đã thay thế'} · {r.created_at}
                {r.by_name && <div>{r.by_name}</div>}
              </div>
            </div>
          ))}
          {rows?.length === 0 && <div className="text-white/40">Chưa có dữ liệu.</div>}
        </div>
        <button onClick={onClose} className="btn-ghost mt-5 w-full">Đóng</button>
      </div>
    </div>
  );
}
