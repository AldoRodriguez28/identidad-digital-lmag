'use client';
import { useEffect, useState } from 'react';
import { Eye, UserPlus } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, IconButton, IconLink, Th, Td, inputCls } from '../_components/ui';

type Row = { id: string; nombreCompleto: string; correo: string; curp: string; telefono: string; nivel: string; puntosAcumulados: number };
type Resp = { items: Row[]; total: number; page: number; pageSize: number };

export default function EstudiantesPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const pageSize = 20;

  async function load() {
    const r = await api(`/admin/students?page=${page}&pageSize=${pageSize}`);
    if (r.ok) setData(await r.json());
  }
  useEffect(() => { load().catch(() => {}); /* eslint-disable-next-line */ }, [page]);

  async function borrar(id: string) {
    if (!confirm('¿Borrar este estudiante?')) return;
    const r = await api(`/admin/students/${id}`, { method: 'DELETE' });
    if (r.ok) await load();
  }

  if (!data) return <p className="text-sm text-gray-500">Cargando…</p>;
  const pages = Math.max(1, Math.ceil(data.total / pageSize));
  const term = q.trim().toLowerCase();
  const visibles = term
    ? data.items.filter((s) => s.nombreCompleto.toLowerCase().includes(term) || s.correo.toLowerCase().includes(term))
    : data.items;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Usuarios Estudiantes"
        subtitle="Administra las cuentas de los jóvenes registrados en la plataforma."
        action={<Button onClick={() => window.open('/registro', '_blank')}><UserPlus size={16} />Nuevo estudiante</Button>}
      />

      <Card>
        <input className={`${inputCls} mb-4`} placeholder="Buscar por nombre o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-black/10">
                <Th>Nombre</Th><Th>Correo</Th><Th>CURP</Th><Th>Teléfono</Th><Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((s) => (
                <tr key={s.id} className="border-b border-black/5 last:border-0">
                  <Td className="font-medium">{s.nombreCompleto}</Td>
                  <Td className="text-gray-600">{s.correo}</Td>
                  <Td className="font-mono text-xs text-gray-600">{s.curp}</Td>
                  <Td className="text-gray-600">{s.telefono}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <IconLink href={`/panel/estudiantes/${s.id}`} icon={Eye} label="Ver" variant="gold" />
                      <IconButton variant="danger" label="Borrar" onClick={() => borrar(s.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
              {visibles.length === 0 && <tr><Td className="py-6 text-center text-gray-400">Sin resultados.</Td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{data.total} estudiantes · Página {page} de {pages}</span>
          <div className="flex gap-2">
            <button className="rounded-full border border-guinda/25 px-4 py-1.5 text-guinda disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="rounded-full border border-guinda/25 px-4 py-1.5 text-guinda disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
