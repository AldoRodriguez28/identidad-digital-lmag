'use client';
import { useEffect, useState } from 'react';
import { GraduationCap, UserCog, Store, Users } from 'lucide-react';
import { api } from '../../../lib/api';

type Categoria = 'deporte' | 'cultura' | 'arte' | 'tecnologia';
const CAT_LABEL: Record<Categoria, string> = { deporte: 'Deporte', cultura: 'Cultura', arte: 'Arte', tecnologia: 'Tecnología' };

type Dash = {
  usuarios: { estudiantes: number; internos: number; comercios: number };
  topIntereses: { nombre: string; categoria: Categoria | null; count: number }[];
};

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-guinda">
        <Icon size={18} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className="mt-3 text-4xl font-extrabold text-ink">{value}</p>
    </div>
  );
}

export default function PanelPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api('/admin/dashboard')
      .then(async (r) => { if (r.ok) setD(await r.json()); else setError(true); })
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-sm text-danger">No se pudo cargar el dashboard.</p>;
  if (!d) return <p className="text-sm text-gray-500">Cargando…</p>;

  const total = d.usuarios.estudiantes + d.usuarios.internos + d.usuarios.comercios;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Inicio</h1>
        <p className="mt-1 text-sm text-gray-500">Resumen general de la plataforma.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Usuarios estudiantes" value={d.usuarios.estudiantes} />
        <StatCard icon={UserCog} label="Usuarios internos" value={d.usuarios.internos} />
        <StatCard icon={Store} label="Comercios" value={d.usuarios.comercios} />
        <StatCard icon={Users} label="Usuarios totales" value={total} />
      </div>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-guinda">Top 5 intereses más elegidos</h2>
        {(d.topIntereses ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay intereses registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-gray-500">
                <th className="w-10 pb-2 font-semibold">#</th>
                <th className="pb-2 font-semibold">Interés</th>
                <th className="pb-2 font-semibold">Categoría</th>
                <th className="pb-2 text-right font-semibold">Estudiantes</th>
              </tr>
            </thead>
            <tbody>
              {d.topIntereses.map((t, idx) => (
                <tr key={`${t.nombre}-${idx}`} className="border-b border-black/5 last:border-0">
                  <td className="py-3 text-gray-500">{idx + 1}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <span className="text-guinda">♥</span>{t.nombre}
                    </span>
                  </td>
                  <td className="py-3 text-gray-600">{t.categoria ? CAT_LABEL[t.categoria] : '—'}</td>
                  <td className="py-3 text-right font-semibold text-ink">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
