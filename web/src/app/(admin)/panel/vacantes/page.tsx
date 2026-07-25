'use client';
import { useEffect, useState } from 'react';
import { Briefcase, Power } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, IconButton, Th, Td, inputCls } from '../_components/ui';

type Job = { id: string; puesto: string; empresa: string; requisitos: string; contacto: string; activo: boolean };

export default function PanelVacantesPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [f, setF] = useState({ puesto: '', empresa: '', requisitos: '', contacto: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/admin/jobs');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const res = await api('/admin/jobs', { method: 'POST', body: JSON.stringify(f) });
    if (res.ok) { setF({ puesto: '', empresa: '', requisitos: '', contacto: '' }); setShowForm(false); await load(); }
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Bolsa de Trabajo"
        subtitle="Directorio de vacantes para los jóvenes."
        action={<Button onClick={() => setShowForm((v) => !v)}><Briefcase size={16} />Nueva vacante</Button>}
      />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={crear} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Puesto" required value={f.puesto} onChange={(e) => setF({ ...f, puesto: e.target.value })} />
            <input className={inputCls} placeholder="Empresa" required value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
            <textarea className={`${inputCls} sm:col-span-2`} rows={3} placeholder="Requisitos" required value={f.requisitos} onChange={(e) => setF({ ...f, requisitos: e.target.value })} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Contacto (email / teléfono / URL)" required value={f.contacto} onChange={(e) => setF({ ...f, contacto: e.target.value })} />
            <div className="sm:col-span-2"><Button type="submit">Crear vacante</Button></div>
          </form>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10"><Th>Puesto</Th><Th>Empresa</Th><Th>Contacto</Th><Th className="text-right">Acciones</Th></tr>
          </thead>
          <tbody>
            {items.map((j) => (
              <tr key={j.id} className="border-b border-black/5 last:border-0">
                <Td className="font-medium">{j.puesto}{j.activo ? '' : ' · (inactivo)'}</Td>
                <Td className="text-gray-600">{j.empresa}</Td>
                <Td className="text-gray-600">{j.contacto}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton variant="neutral" icon={Power} label={j.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(j)} />
                    <IconButton variant="danger" label="Borrar" onClick={() => borrar(j.id)} />
                  </div>
                </Td>
              </tr>
            ))}
            {items.length === 0 && <tr><Td className="py-6 text-center text-gray-400">Aún no hay vacantes.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
