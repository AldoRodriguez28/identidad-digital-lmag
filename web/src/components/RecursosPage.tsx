'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { api } from '../lib/api';
import { StudentShell } from './StudentShell';

export type Feature = { icon: React.ElementType; title: string; text: string };
type Recurso = { id: string; titulo: string; categoria: string; descripcion: string; contacto: string | null };

export function RecursosPage({
  tipo, title, subtitle, heroLead, heroLeadGold, heroText, features, sectionTitle, cardIcon: CardIcon,
}: {
  tipo: string; title: string; subtitle: string;
  heroLead: string; heroLeadGold: string; heroText: string;
  features: Feature[]; sectionTitle: string; cardIcon: React.ElementType;
}) {
  const [items, setItems] = useState<Recurso[]>([]);
  useEffect(() => { api(`/recursos?tipo=${tipo}`).then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {}); }, [tipo]);

  return (
    <StudentShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </header>

        {/* Hero banner */}
        <div className="rounded-2xl bg-guinda p-6 text-white sm:p-8">
          <h2 className="text-2xl font-extrabold uppercase leading-tight sm:text-3xl">
            {heroLead} <span className="text-dorado">{heroLeadGold}</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/80">{heroText}</p>
          {features.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-dorado"><f.icon size={20} /></span>
                  <div>
                    <p className="font-bold">{f.title}</p>
                    <p className="text-sm text-white/70">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catálogo */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-guinda">{sectionTitle}</h3>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay contenido disponible.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it, idx) => (
                <article key={it.id} className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-guinda text-xs font-bold text-white">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="rounded-full bg-guinda/10 px-2.5 py-0.5 text-xs font-semibold text-guinda">{it.categoria}</span>
                  </div>
                  <span className="mb-3 grid h-16 w-16 place-items-center self-center rounded-full bg-page text-guinda"><CardIcon size={30} /></span>
                  <h4 className="text-center font-bold text-ink">{it.titulo}</h4>
                  <p className="mt-1 text-center text-sm text-gray-600">{it.descripcion}</p>
                  {it.contacto && (
                    <a href={it.contacto.startsWith('http') ? it.contacto : `mailto:${it.contacto}`} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center justify-center gap-1 rounded-full border border-guinda/25 px-3 py-1.5 text-xs font-semibold text-guinda hover:bg-guinda/5">
                      <ArrowUpRight size={14} />Más información
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
