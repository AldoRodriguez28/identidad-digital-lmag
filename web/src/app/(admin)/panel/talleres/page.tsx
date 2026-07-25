'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Power } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, Badge, IconButton, Th, Td, inputCls } from '../_components/ui';

type Workshop = { id: string; titulo: string; precio: number; horario: string; modalidad: string; activo: boolean };
const MODS = ['presencial', 'virtual', 'hibrido'];

export default function PanelTalleresPage() {
  const [items, setItems] = useState<Workshop[]>([]);
  const [f, setF] = useState({ titulo: '', descripcion: '', precio: '', horario: '', modalidad: 'presencial' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/workshops');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const res = await api('/admin/workshops', { method: 'POST', body: JSON.stringify({ ...f, precio: Number(f.precio) }) });
    if (res.ok) { setF({ titulo: '', descripcion: '', precio: '', horario: '', modalidad: 'presencial' }); setShowForm(false); await load(); }
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Cursos y Talleres"
        subtitle="Catálogo informativo de talleres (precio, horario y modalidad)."
        action={<Button onClick={() => setShowForm((v) => !v)}><BookOpen size={16} />Nuevo taller</Button>}
      />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={crear} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Título" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
            <select className={inputCls} value={f.modalidad} onChange={(e) => setF({ ...f, modalidad: e.target.value })}>
              {MODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className={`${inputCls} sm:col-span-2`} placeholder="Descripción" required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
            <input className={inputCls} placeholder="Horario (ej. Sáb 9-13h)" required value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} />
            <input className={inputCls} type="number" min={0} placeholder="Precio (0 = gratis)" required value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} />
            <div className="sm:col-span-2"><Button type="submit">Crear taller</Button></div>
          </form>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10"><Th>Taller</Th><Th>Modalidad</Th><Th>Precio</Th><Th className="text-right">Acciones</Th></tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id} className="border-b border-black/5 last:border-0">
                <Td className="font-medium">{w.titulo}{w.activo ? '' : ' · (inactivo)'}</Td>
                <Td><span className="capitalize text-gray-600">{w.modalidad}</span></Td>
                <Td><Badge>{w.precio === 0 ? 'Gratis' : `$${w.precio}`}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton variant="neutral" icon={Power} label={w.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(w)} />
                    <IconButton variant="danger" label="Borrar" onClick={() => borrar(w.id)} />
                  </div>
                </Td>
              </tr>
            ))}
            {items.length === 0 && <tr><Td className="py-6 text-center text-gray-400">Aún no hay talleres.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
