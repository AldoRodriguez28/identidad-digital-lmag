'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, QrCode, Power } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, Badge, IconButton, Th, Td, inputCls } from '../_components/ui';

type Event = { id: string; titulo: string; categoria: string; fecha: string; lugar: string; puntosOtorgados: number; activo: boolean };
const CATS = ['deportivo', 'cultural', 'taller'];

export default function PanelEventosPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [f, setF] = useState({ titulo: '', descripcion: '', categoria: 'cultural', fecha: '', lugar: '', puntosOtorgados: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/events');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const res = await api('/admin/events', {
      method: 'POST',
      body: JSON.stringify({ ...f, fecha: new Date(f.fecha).toISOString(), puntosOtorgados: Number(f.puntosOtorgados) }),
    });
    if (res.ok) { setF({ titulo: '', descripcion: '', categoria: 'cultural', fecha: '', lugar: '', puntosOtorgados: '' }); setShowForm(false); await load(); }
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Eventos"
        subtitle="Catálogo de eventos y su check-in por QR."
        action={
          <div className="flex gap-2">
            <Link href="/panel/eventos/checkin"><Button variant="outline"><QrCode size={16} />Check-in con QR</Button></Link>
            <Button onClick={() => setShowForm((v) => !v)}><CalendarPlus size={16} />Nuevo evento</Button>
          </div>
        }
      />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={crear} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Título" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
            <select className={inputCls} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className={`${inputCls} sm:col-span-2`} placeholder="Descripción" required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
            <input className={inputCls} type="datetime-local" required value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
            <input className={inputCls} placeholder="Lugar" required value={f.lugar} onChange={(e) => setF({ ...f, lugar: e.target.value })} />
            <input className={`${inputCls} sm:col-span-2`} type="number" min={0} placeholder="Puntos otorgados" required value={f.puntosOtorgados} onChange={(e) => setF({ ...f, puntosOtorgados: e.target.value })} />
            <div className="sm:col-span-2"><Button type="submit">Crear evento</Button></div>
          </form>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10"><Th>Evento</Th><Th>Categoría</Th><Th>Puntos</Th><Th className="text-right">Acciones</Th></tr>
          </thead>
          <tbody>
            {items.map((ev) => (
              <tr key={ev.id} className="border-b border-black/5 last:border-0">
                <Td className="font-medium">{ev.titulo}{ev.activo ? '' : ' · (inactivo)'}</Td>
                <Td><span className="capitalize text-gray-600">{ev.categoria}</span></Td>
                <Td><Badge>{ev.puntosOtorgados} pts</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton variant="neutral" icon={Power} label={ev.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(ev)} />
                    <IconButton variant="danger" label="Borrar" onClick={() => borrar(ev.id)} />
                  </div>
                </Td>
              </tr>
            ))}
            {items.length === 0 && <tr><Td className="py-6 text-center text-gray-400">Aún no hay eventos.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
