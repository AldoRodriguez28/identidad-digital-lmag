'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Interest = { id: string; nombre: string };

export default function InteresesPage() {
  const [items, setItems] = useState<Interest[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/interests');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/interests', { method: 'POST', body: JSON.stringify({ nombre: nuevo }) });
    if (res.ok) { setNuevo(''); await load(); }
    else if (res.status === 409) setError('Ese interés ya existe.');
    else setError('No se pudo crear.');
  }

  async function editar(id: string, actual: string) {
    const nombre = prompt('Nuevo nombre', actual);
    if (!nombre || nombre === actual) return;
    const res = await api(`/admin/interests/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
    if (res.ok) await load();
  }

  async function borrar(id: string) {
    if (!confirm('¿Borrar este interés?')) return;
    const res = await api(`/admin/interests/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Intereses</h1>
      <form onSubmit={crear} className="mb-4 flex gap-2">
        <input className="flex-1 rounded border p-2" placeholder="Nuevo interés" value={nuevo}
          onChange={(e) => setNuevo(e.target.value)} required />
        <button className="rounded bg-black px-4 text-white" type="submit">Agregar</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{i.nombre}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => editar(i.id, i.nombre)}>Editar</button>
              <button className="text-red-600" onClick={() => borrar(i.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
