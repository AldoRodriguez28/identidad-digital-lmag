'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Job = { id: string; puesto: string; empresa: string; requisitos: string; contacto: string; activo: boolean };

export default function PanelVacantesPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [f, setF] = useState({ puesto: '', empresa: '', requisitos: '', contacto: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/jobs');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/jobs', { method: 'POST', body: JSON.stringify(f) });
    if (res.ok) { setF({ puesto: '', empresa: '', requisitos: '', contacto: '' }); await load(); }
    else setError('Revisa los datos (todos los campos son obligatorios).');
  }

  async function toggleActivo(j: Job) {
    const res = await api(`/admin/jobs/${j.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !j.activo }) });
    if (res.ok) await load(); else setError('No se pudo actualizar.');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar esta vacante?')) return;
    const res = await api(`/admin/jobs/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Bolsa de trabajo</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Puesto" required value={f.puesto} onChange={(e) => setF({ ...f, puesto: e.target.value })} />
        <input className="rounded border p-2" placeholder="Empresa" required value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
        <textarea className="col-span-2 rounded border p-2" placeholder="Requisitos" required value={f.requisitos} onChange={(e) => setF({ ...f, requisitos: e.target.value })} />
        <input className="col-span-2 rounded border p-2" placeholder="Contacto (email / teléfono / URL)" required value={f.contacto} onChange={(e) => setF({ ...f, contacto: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear vacante</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((j) => (
          <li key={j.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{j.puesto} · <span className="text-gray-600">{j.empresa}</span> {j.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => toggleActivo(j)}>{j.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(j.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
