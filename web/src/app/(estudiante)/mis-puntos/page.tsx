'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Ticket, Rocket, CalendarCheck, BookOpen, TrendingUp } from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';
import { NivelesTiers } from '../../../components/niveles';

type Mov = { id: string; tipo: string; referencia: string | null; puntos: number; createdAt: string };
type Summary = {
  puntosAcumulados: number; nivel: string; siguiente: string | null;
  puntosParaSiguiente: number; porcentaje: number; eventosAsistidos: number; movimientos: Mov[];
};

const TIPO_LABEL: Record<string, string> = {
  evento: 'Evento',
  ajuste: 'Ajuste',
  compra_comercio: 'Compra en comercio',
};
const labelTipo = (tipo: string) => TIPO_LABEL[tipo] ?? tipo;

export default function MisPuntosPage() {
  const router = useRouter();
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api('/students/me/points').then(async (r) => {
      if (r.ok) setS(await r.json()); else router.push('/ingresar');
    }).catch(() => router.push('/ingresar'));
  }, [router]);

  if (!s) return <StudentShell><p className="text-sm text-gray-500">Cargando…</p></StudentShell>;

  const totalNivel = s.siguiente ? s.puntosAcumulados + s.puntosParaSiguiente : s.puntosAcumulados;
  const now = new Date();
  const puntosEsteMes = s.movimientos
    .filter((m) => { const d = new Date(m.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((a, m) => a + m.puntos, 0);

  const features = [
    { icon: GraduationCap, title: 'Becas para cursos y certificaciones' },
    { icon: Ticket, title: 'Entrada gratuita a eventos o conciertos' },
    { icon: Rocket, title: 'Participación en programas de mentoría y emprendimiento' },
  ];
  const stats = [
    { icon: CalendarCheck, label: 'Eventos asistidos', value: s.eventosAsistidos },
    { icon: BookOpen, label: 'Talleres completados', value: 0 },
    { icon: TrendingUp, label: 'Puntos este mes', value: puntosEsteMes },
  ];

  return (
    <StudentShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Mis Puntos</h1>
          <p className="mt-1 text-sm text-gray-500">Conoce tu progreso y los niveles que puedes alcanzar.</p>
        </header>

        {/* Hero */}
        <div className="rounded-2xl bg-guinda p-6 text-white sm:p-8">
          <h2 className="text-2xl font-extrabold uppercase leading-tight sm:text-3xl">Entre más participas, <span className="text-dorado">más oportunidades tienes</span></h2>
          <p className="mt-2 text-sm text-white/80">Conforme aumentan tus puntos, puedes acceder a beneficios como:</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-dorado"><f.icon size={18} /></span>
                <p className="text-sm font-medium">{f.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Puntos + estadísticas */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Puntos acumulados</p>
            <p className="mt-1 text-4xl font-extrabold text-guinda">{s.puntosAcumulados} <span className="text-lg text-gray-400">pts</span></p>
            <p className="mt-1 text-sm text-gray-500">Sigue participando para alcanzar el siguiente nivel.</p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>{s.siguiente ? `Próximo nivel: ${s.siguiente[0].toUpperCase()}${s.siguiente.slice(1)}` : 'Nivel máximo'}</span>
                <span>{s.puntosAcumulados} / {totalNivel} pts</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-guinda" style={{ width: `${s.porcentaje}%` }} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Estadísticas rápidas</p>
            <ul className="space-y-3">
              {stats.map((st) => (
                <li key={st.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600"><st.icon size={16} className="text-guinda" />{st.label}</span>
                  <span className="text-lg font-bold text-ink">{st.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Niveles */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-guinda">Niveles</h2>
          <NivelesTiers nivel={s.nivel} />
        </div>

        {/* Historial */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-guinda">Historial de movimientos</h2>
          {s.movimientos.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no tienes movimientos.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {s.movimientos.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-ink">{labelTipo(m.tipo)}</span>
                  <span className="font-semibold text-success">+{m.puntos}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </StudentShell>
  );
}
