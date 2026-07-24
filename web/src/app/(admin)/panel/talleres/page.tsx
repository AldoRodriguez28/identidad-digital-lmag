'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Workshop = { id: string; titulo: string; precio: number; horario: string; modalidad: string; activo: boolean };
const MODS = ['presencial', 'virtual', 'hibrido'];

export default function PanelTalleresPage() {
  const [items, setItems] = useState<Workshop[]>([]);
  const [f, setF] = useState({ titulo: '', descripcion: '', precio: '', horario: '', modalidad: 'presencial' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/workshops');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/workshops', {
      method: 'POST',
      body: JSON.stringify({ ...f, precio: Number(f.precio) }),
    });
    if (res.ok) { setF({ titulo: '', descripcion: '', precio: '', horario: '', modalidad: 'presencial' }); await load(); }
    else setError('Revisa los datos (precio entero ≥ 0).');
  }

  async function toggleActivo(w: Workshop) {
    const res = await api(`/admin/workshops/${w.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !w.activo }) });
    if (res.ok) await load(); else setError('No se pudo actualizar.');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este taller?')) return;
    const res = await api(`/admin/workshops/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Cursos y talleres</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Título" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
        <select className="rounded border p-2" value={f.modalidad} onChange={(e) => setF({ ...f, modalidad: e.target.value })}>
          {MODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="col-span-2 rounded border p-2" placeholder="Descripción" required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        <input className="rounded border p-2" placeholder="Horario (ej. Sáb 9-13h)" required value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} />
        <input className="rounded border p-2" type="number" min={0} placeholder="Precio (0 = gratis)" required value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear taller</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((w) => (
          <li key={w.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{w.titulo} · <span className="capitalize">{w.modalidad}</span> · <b>{w.precio === 0 ? 'Gratis' : `$${w.precio}`}</b> {w.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => toggleActivo(w)}>{w.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(w.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
