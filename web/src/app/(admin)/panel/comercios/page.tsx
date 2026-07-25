'use client';
import { useEffect, useState } from 'react';
import { Store, Percent, Power } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, Badge, IconButton, Th, Td, inputCls } from '../_components/ui';

type Commerce = { id: string; nombre: string; email: string; porcentajeDescuento: number; activo: boolean; descripcion?: string };

export default function ComerciosPage() {
  const [items, setItems] = useState<Commerce[]>([]);
  const [f, setF] = useState({ nombre: '', descripcion: '', porcentajeDescuento: '', email: '', password: '', passwordConfirm: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/commerces');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (f.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (f.password !== f.passwordConfirm) { setError('Las contraseñas no coinciden.'); return; }
    const { passwordConfirm, ...rest } = f;
    const res = await api('/admin/commerces', { method: 'POST', body: JSON.stringify({ ...rest, porcentajeDescuento: Number(f.porcentajeDescuento) }) });
    if (res.ok) { setF({ nombre: '', descripcion: '', porcentajeDescuento: '', email: '', password: '', passwordConfirm: '' }); setShowForm(false); await load(); }
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Comercios"
        subtitle="Directorio de comercios afiliados y sus descuentos."
        action={<Button onClick={() => setShowForm((v) => !v)}><Store size={16} />Nuevo comercio</Button>}
      />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={crear} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
            <input className={inputCls} placeholder="% descuento" type="number" min={0} max={100} required value={f.porcentajeDescuento} onChange={(e) => setF({ ...f, porcentajeDescuento: e.target.value })} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Descripción" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Correo" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={inputCls} placeholder="Contraseña (mín. 8)" type="password" minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <div>
              <input
                className={`${inputCls} ${f.passwordConfirm && f.password !== f.passwordConfirm ? 'border-danger focus:border-danger focus:ring-danger/15' : ''}`}
                placeholder="Confirmar contraseña" type="password" required
                value={f.passwordConfirm} onChange={(e) => setF({ ...f, passwordConfirm: e.target.value })}
              />
              {f.passwordConfirm && f.password !== f.passwordConfirm && <p className="mt-1 text-xs text-danger">Las contraseñas no coinciden.</p>}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!f.password || f.password !== f.passwordConfirm}>Crear comercio</Button>
            </div>
          </form>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10"><Th>Comercio</Th><Th>Correo</Th><Th>Descuento</Th><Th className="text-right">Acciones</Th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0">
                <Td className="font-medium">{c.nombre}{c.activo ? '' : ' · (inactivo)'}</Td>
                <Td className="text-gray-600">{c.email}</Td>
                <Td><Badge>{c.porcentajeDescuento}%</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton variant="edit" icon={Percent} label="Editar descuento" onClick={() => editarDescuento(c)} />
                    <IconButton variant="neutral" icon={Power} label={c.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(c)} />
                    <IconButton variant="danger" label="Borrar" onClick={() => borrar(c.id)} />
                  </div>
                </Td>
              </tr>
            ))}
            {items.length === 0 && <tr><Td className="py-6 text-center text-gray-400">Aún no hay comercios.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
