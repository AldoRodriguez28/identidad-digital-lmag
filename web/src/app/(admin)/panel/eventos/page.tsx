'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';

type Event = { id: string; titulo: string; categoria: string; fecha: string; lugar: string; puntosOtorgados: number; activo: boolean };

const CATS = ['deportivo', 'cultural', 'taller'];

export default function PanelEventosPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [f, setF] = useState({ titulo: '', descripcion: '', categoria: 'cultural', fecha: '', lugar: '', puntosOtorgados: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/events');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/events', {
      method: 'POST',
      body: JSON.stringify({
        ...f,
        fecha: new Date(f.fecha).toISOString(),
        puntosOtorgados: Number(f.puntosOtorgados),
      }),
    });
    if (res.ok) { setF({ titulo: '', descripcion: '', categoria: 'cultural', fecha: '', lugar: '', puntosOtorgados: '' }); await load(); }
    else setError('Revisa los datos (fecha y puntos).');
  }

  async function toggleActivo(ev: Event) {
    const res = await api(`/admin/events/${ev.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !ev.activo }) });
    if (res.ok) await load(); else setError('No se pudo actualizar.');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este evento?')) return;
    const res = await api(`/admin/events/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eventos</h1>
        <Link href="/panel/eventos/checkin" className="rounded bg-black px-3 py-1 text-sm text-white">Check-in con QR</Link>
      </div>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Título" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
        <select className="rounded border p-2" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
          {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="col-span-2 rounded border p-2" placeholder="Descripción" required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        <input className="rounded border p-2" type="datetime-local" required value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        <input className="rounded border p-2" placeholder="Lugar" required value={f.lugar} onChange={(e) => setF({ ...f, lugar: e.target.value })} />
        <input className="col-span-2 rounded border p-2" type="number" min={0} placeholder="Puntos otorgados" required value={f.puntosOtorgados} onChange={(e) => setF({ ...f, puntosOtorgados: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear evento</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((ev) => (
          <li key={ev.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{ev.titulo} · <span className="capitalize">{ev.categoria}</span> · <b>{ev.puntosOtorgados}pts</b> {ev.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => toggleActivo(ev)}>{ev.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(ev.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
