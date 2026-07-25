'use client';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '../../../../lib/api';
import { CommerceShell } from '../../../../components/CommerceShell';

type Uso = { id: string; fecha: string; estudiante: string; nivel: string; monto: number | null; porcentajeDescuento: number | null; descuento: number | null };
type Data = { total: number; totalMonto: number; totalDescuento: number; usos: Uso[] };

const inputCls = 'rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15';

export default function ComercioComprasPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<Data | null>(null);

  async function load(f = from, t = to) {
    const params = new URLSearchParams();
    if (f) params.set('from', f);
    if (t) params.set('to', t);
    const qs = params.toString();
    const r = await api(`/commerce/usages${qs ? `?${qs}` : ''}`);
    if (r.ok) setData(await r.json());
  }
  useEffect(() => { load('', '').catch(() => {}); /* eslint-disable-next-line */ }, []);

  function limpiar() { setFrom(''); setTo(''); load('', ''); }
  const money = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`);

  return (
    <CommerceShell>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight text-guinda">Compras registradas</h1>
      <p className="mt-1 text-sm text-gray-500">Clientes que escanearon su credencial y usaron su descuento en tu comercio.</p>

      {/* Filtros */}
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Desde</label>
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Hasta</label>
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-guinda px-5 py-2 text-sm font-semibold text-white hover:bg-guinda-700"><Search size={15} />Filtrar</button>
        {(from || to) && <button type="button" onClick={limpiar} className="inline-flex items-center gap-1 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-black/5"><X size={14} />Limpiar</button>}
      </form>

      {/* Resumen */}
      {data && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm"><p className="text-2xl font-extrabold text-guinda">{data.total}</p><p className="text-xs uppercase tracking-wide text-gray-500">Visitas</p></div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm"><p className="text-2xl font-extrabold text-ink">${data.totalMonto.toFixed(2)}</p><p className="text-xs uppercase tracking-wide text-gray-500">Monto total</p></div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm"><p className="text-2xl font-extrabold text-guinda">${data.totalDescuento.toFixed(2)}</p><p className="text-xs uppercase tracking-wide text-gray-500">Descuentos</p></div>
        </div>
      )}

      {/* Tabla */}
      <div className="mt-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        {!data ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : data.usos.length === 0 ? (
          <p className="text-sm text-gray-500">No hay compras registradas en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                  <th className="pb-3">Fecha y hora</th><th className="pb-3">Cliente</th><th className="pb-3 text-right">Monto</th><th className="pb-3 text-right">Descuento</th>
                </tr>
              </thead>
              <tbody>
                {data.usos.map((u) => (
                  <tr key={u.id} className="border-b border-black/5 last:border-0">
                    <td className="py-3 text-gray-600">{new Date(u.fecha).toLocaleString('es-MX')}</td>
                    <td className="py-3 font-medium text-ink">{u.estudiante}</td>
                    <td className="py-3 text-right font-semibold text-ink">{money(u.monto)}</td>
                    <td className="py-3 text-right text-guinda">{u.descuento == null ? '—' : `−$${u.descuento.toFixed(2)}`}{u.porcentajeDescuento != null && <span className="text-xs text-gray-400"> ({u.porcentajeDescuento}%)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CommerceShell>
  );
}
