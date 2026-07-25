'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, IconButton, Th, Td, inputCls } from '../_components/ui';

type Categoria = 'deporte' | 'cultura' | 'arte' | 'tecnologia';
type Interest = { id: string; nombre: string; categoria: Categoria };

const CATS: { value: Categoria; label: string }[] = [
  { value: 'deporte', label: 'Deporte' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'arte', label: 'Arte' },
  { value: 'tecnologia', label: 'Tecnología' },
];
const labelOf = (c: Categoria) => CATS.find((x) => x.value === c)?.label ?? c;

export default function InteresesPage() {
  const [items, setItems] = useState<Interest[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [cat, setCat] = useState<Categoria>('tecnologia');
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/interests');
    if (r.ok) setItems(await r.json());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await api('/admin/interests', { method: 'POST', body: JSON.stringify({ nombre: nuevo, categoria: cat }) });
    if (res.ok) { setNuevo(''); await load(); }
    else if (res.status === 409) setError('Ese interés ya existe.');
    else setError('No se pudo crear.');
  }

  async function editar(i: Interest) {
    const nombre = prompt('Nuevo nombre', i.nombre);
    if (!nombre || nombre === i.nombre) return;
    const res = await api(`/admin/interests/${i.id}`, { method: 'PATCH', body: JSON.stringify({ nombre, categoria: i.categoria }) });
    if (res.ok) await load();
  }
  async function cambiarCategoria(i: Interest, categoria: Categoria) {
    const res = await api(`/admin/interests/${i.id}`, { method: 'PATCH', body: JSON.stringify({ nombre: i.nombre, categoria }) });
    if (res.ok) await load();
  }
  async function borrar(id: string) {
    if (!confirm('¿Borrar este interés?')) return;
    const res = await api(`/admin/interests/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Catálogo de Intereses" subtitle="Gestiona los intereses y su categoría (Deporte, Cultura, Arte, Tecnología)." />

      <Card className="mb-4">
        <form onSubmit={crear} className="flex flex-col gap-2 sm:flex-row">
          <input className={inputCls} placeholder="Nuevo interés (p. ej. Fotografía)" value={nuevo} onChange={(e) => setNuevo(e.target.value)} required />
          <select className={`${inputCls} sm:w-48`} value={cat} onChange={(e) => setCat(e.target.value as Categoria)}>
            {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <Button type="submit" className="shrink-0"><Plus size={16} />Agregar</Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/10"><Th>Interés</Th><Th>Categoría</Th><Th className="text-right">Acciones</Th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-black/5 last:border-0">
                <Td className="font-medium">
                  <span className="inline-flex items-center gap-2"><span className="text-guinda">♥</span>{i.nombre}</span>
                </Td>
                <Td>
                  <select
                    className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15"
                    value={i.categoria}
                    onChange={(e) => cambiarCategoria(i, e.target.value as Categoria)}
                    aria-label={`Categoría de ${i.nombre}`}
                  >
                    {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <IconButton variant="edit" label="Editar nombre" onClick={() => editar(i)} />
                    <IconButton variant="danger" label="Borrar" onClick={() => borrar(i.id)} />
                  </div>
                </Td>
              </tr>
            ))}
            {items.length === 0 && <tr><Td className="py-6 text-center text-gray-400">Aún no hay intereses.</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
