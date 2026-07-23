'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type User = { id: string; email: string; nombre: string; rol: 'admin' | 'gestor'; activo: boolean };

export default function UsuariosPage() {
  const [items, setItems] = useState<User[]>([]);
  const [f, setF] = useState({ email: '', nombre: '', rol: 'gestor', password: '' });
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/internal-users');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/internal-users', { method: 'POST', body: JSON.stringify(f) });
    if (res.ok) { setF({ email: '', nombre: '', rol: 'gestor', password: '' }); await load(); }
    else if (res.status === 409) setError('Ese correo ya existe.');
    else setError('Revisa los datos.');
  }

  async function toggleActivo(u: User) {
    const res = await api(`/admin/internal-users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !u.activo }) });
    if (res.ok) await load();
  }

  async function cambiarRol(u: User) {
    const rol = u.rol === 'admin' ? 'gestor' : 'admin';
    const res = await api(`/admin/internal-users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ rol }) });
    if (res.ok) await load();
  }

  async function borrar(id: string) {
    setError('');
    if (!confirm('¿Borrar este usuario?')) return;
    const res = await api(`/admin/internal-users/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    else if (res.status === 400) setError('No puedes eliminar tu propia cuenta.');
    else setError('No se pudo borrar.');
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Usuarios internos</h1>
      <form onSubmit={crear} className="mb-4 grid grid-cols-2 gap-2">
        <input className="rounded border p-2" placeholder="Correo" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="rounded border p-2" placeholder="Nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        <select className="rounded border p-2" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
          <option value="gestor">Gestor</option>
          <option value="admin">Administrador</option>
        </select>
        <input className="rounded border p-2" placeholder="Contraseña (mín. 8)" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="col-span-2 rounded bg-black p-2 text-white" type="submit">Crear usuario</button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{u.nombre} · {u.email} · <b>{u.rol}</b> {u.activo ? '' : '(inactivo)'}</span>
            <span className="flex gap-2">
              <button className="text-blue-600" onClick={() => cambiarRol(u)}>Rol</button>
              <button className="text-blue-600" onClick={() => toggleActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="text-red-600" onClick={() => borrar(u.id)}>Borrar</button>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
