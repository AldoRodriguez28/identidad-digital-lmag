'use client';
import { useEffect, useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, Badge, IconButton, Th, Td, inputCls } from '../_components/ui';

type Tipo = 'educacion' | 'deporte' | 'cultura';
type Recurso = { id: string; tipo: Tipo; titulo: string; categoria: string; descripcion: string; contacto: string | null; activo: boolean };
const TIPOS: { value: Tipo; label: string }[] = [
  { value: 'educacion', label: 'Educación' },
  { value: 'deporte', label: 'Deporte' },
  { value: 'cultura', label: 'Cultura' },
];
const labelOf = (t: Tipo) => TIPOS.find((x) => x.value === t)?.label ?? t;

export default function PanelRecursosPage() {
  const [items, setItems] = useState<Recurso[]>([]);
  const [filtro, setFiltro] = useState<'' | Tipo>('');
  const [f, setF] = useState({ tipo: 'educacion' as Tipo, titulo: '', categoria: '', descripcion: '', contacto: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await api(`/admin/recursos${filtro ? `?tipo=${filtro}` : ''}`);
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); /* eslint-disable-next-line */ }, [filtro]);

  async function crear(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const res = await api('/admin/recursos', { method: 'POST', body: JSON.stringify(f) });
    if (res.ok) { setF({ tipo: f.tipo, titulo: '', categoria: '', descripcion: '', contacto: '' }); setShowForm(false); await load(); }
    else setError('Revisa los datos.');
  }
  async function toggleActivo(it: Recurso) {
    const res = await api(`/admin/recursos/${it.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !it.activo }) });
    if (res.ok) await load();
  }
  async function borrar(id: string) {
    if (!confirm('¿Borrar este recurso?')) return;
    const res = await api(`/admin/recursos/${id}`, { method: 'DELETE' });
    if (res.ok) await load(); else setError('No se pudo borrar.');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Educación, Deporte y Cultura"
        subtitle="Administra universidades, try-outs deportivos y programas culturales."
        action={<Button onClick={() => setShowForm((v) => !v)}><Plus size={16} />Nuevo recurso</Button>}
      />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={crear} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select className={inputCls} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as Tipo })}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input className={inputCls} placeholder="Categoría (ubicación / disciplina / área)" required value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Título" required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
            <textarea className={`${inputCls} sm:col-span-2`} rows={2} placeholder="Descripción" required value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Contacto / URL (opcional)" value={f.contacto} onChange={(e) => setF({ ...f, contacto: e.target.value })} />
            <div className="sm:col-span-2"><Button type="submit">Crear recurso</Button></div>
          </form>
        </Card>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {[{ value: '', label: 'Todos' }, ...TIPOS].map((t) => (
            <button key={t.value} onClick={() => setFiltro(t.value as '' | Tipo)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${filtro === t.value ? 'bg-guinda text-white' : 'border border-guinda/25 text-guinda hover:bg-guinda/5'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10"><Th>Título</Th><Th>Tipo</Th><Th>Categoría</Th><Th className="text-right">Acciones</Th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-black/5 last:border-0">
                <Td className="font-medium">{it.titulo}{it.activo ? '' : ' · (inactivo)'}</Td>
                <Td><Badge>{labelOf(it.tipo)}</Badge></Td>
                <Td className="text-gray-600">{it.categoria}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton variant="neutral" icon={Power} label={it.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(it)} />
                    <IconButton variant="danger" label="Borrar" onClick={() => borrar(it.id)} />
                  </div>
                </Td>
              </tr>
            ))}
            {items.length === 0 && <tr><Td className="py-6 text-center text-gray-400">Aún no hay recursos.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
