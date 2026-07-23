'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Commerce = { id: string; nombre: string; email: string; porcentajeDescuento: number; activo: boolean; descripcion?: string };

export default function ComerciosPage() {
  const [items, setItems] = useState<Commerce[]>([]);
  const [f, setF] = useState({ nombre: '', descripcion: '', porcentajeDescuento: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/commerces');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/commerces', {
      method: 'POST',
      body: JSON.stringify({ ...f, porcentajeDescuento: Number(f.porcentajeDescuento) }),
    });
    if (res.ok) { setF({ nombre: '', descripcion: '', porcentajeDescuento: '', email: '', password: '' }); await load(); }
    else if (res.status === 409) setError('Ese correo ya existe.');
    else setError('Revisa los datos.');
  }

  async function toggleActivo(c: Commerce) {
    const res = await api(`/admin/commerces/${c.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !c.activo }) });
    if (res.ok) await load();
  }

  async function editarDescuento(c: Commerce) {
    const v = prompt('Nuevo % de descuento (0-100)', String(c.porcentajeDescuento));
    if (v === null) return;
    const res = await api(`/admin/commerces/${c.id}`, { method: 'PATCH', body: JSON.stringify({ porcentajeDescuento: Number(v) }) });
    if (res.ok) await load(); else setError('No se pudo actualizar (¿0-100?).');
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este comercio?')) return;
    const res = await api(`/admin/commerces/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Comercios</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <input className="rounded border p-2" placeholder="% descuento" type="number" min={0} max={100} required value={f.porcentajeDescuento} onChange={(e) => setF({ ...f, porcentajeDescuento: e.target.value })} />
        <input className="col-span-2 rounded border p-2" placeholder="Descripción" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        <input className="rounded border p-2" placeholder="Correo" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="rounded border p-2" placeholder="Contraseña (mín. 8)" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear comercio</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{c.nombre} · {c.email} · <b>{c.porcentajeDescuento}%</b> {c.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => editarDescuento(c)}>% Dcto</button>
              <button className="text-blue-600" onClick={() => toggleActivo(c)}>{c.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(c.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
