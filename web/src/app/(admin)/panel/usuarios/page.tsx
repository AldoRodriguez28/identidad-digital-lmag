'use client';
import { useEffect, useState } from 'react';
import { UserPlus, Power } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, Badge, IconButton, Th, Td, inputCls } from '../_components/ui';

type User = { id: string; email: string; nombre: string; rol: 'admin' | 'gestor'; activo: boolean };

export default function UsuariosPage() {
  const [items, setItems] = useState<User[]>([]);
  const [f, setF] = useState({ email: '', nombre: '', rol: 'gestor', password: '' });
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState('');
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
    if (res.ok) { setF({ email: '', nombre: '', rol: 'gestor', password: '' }); setShowForm(false); await load(); }
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

  const term = q.trim().toLowerCase();
  const visibles = term ? items.filter((u) => u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) : items;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Usuarios de la Plataforma"
        subtitle="Administra las cuentas de Administradores y Gestores."
        action={<Button onClick={() => setShowForm((v) => !v)}><UserPlus size={16} />Nuevo usuario</Button>}
      />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={crear} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Correo" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={inputCls} placeholder="Nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
            <select className={inputCls} value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
              <option value="gestor">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
            <input className={inputCls} placeholder="Contraseña (mín. 8)" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <div className="sm:col-span-2"><Button type="submit">Crear usuario</Button></div>
          </form>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <Card>
        <input className={`${inputCls} mb-4`} placeholder="Buscar por nombre o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10">
              <Th>Nombre</Th><Th>Correo</Th><Th>Rol</Th><Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.id} className="border-b border-black/5 last:border-0">
                <Td className="font-medium">{u.nombre}{u.activo ? '' : ' · (inactivo)'}</Td>
                <Td className="text-gray-600">{u.email}</Td>
                <Td><Badge>{u.rol === 'admin' ? 'Administrador' : 'Gestor'}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton variant="edit" label="Cambiar rol" onClick={() => cambiarRol(u)} />
                    <button type="button" title={u.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(u)}
                      className="grid h-9 w-9 place-items-center rounded-full text-guinda ring-1 ring-guinda/25 hover:bg-guinda/5">
                      <Power size={16} />
                    </button>
                    <IconButton variant="danger" label="Borrar" onClick={() => borrar(u.id)} />
                  </div>
                </Td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><Td className="py-6 text-center text-gray-400">Sin resultados.</Td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
