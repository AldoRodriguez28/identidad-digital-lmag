'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';
import { TarjetaFlip } from '../../../components/TarjetaFlip';

type Profile = { nombreCompleto: string; nivel: string; credentialToken: string };

export default function MiTarjetaPage() {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => {
    api('/students/me/profile').then(async (r) => {
      if (r.ok) setP(await r.json()); else router.push('/ingresar');
    }).catch(() => router.push('/ingresar'));
  }, [router]);

  if (!p) return <StudentShell><p className="text-sm text-gray-500">Cargando…</p></StudentShell>;

  return (
    <StudentShell>
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Mi Tarjeta Juventud</h1>
          <p className="mt-1 text-sm text-gray-500">Tu identidad digital del joven de San Andrés Tuxtla. Toca la tarjeta para ver tu QR.</p>
        </header>

        <div className="rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
          <TarjetaFlip token={p.credentialToken} className="mx-auto max-w-md" />
          <p className="mt-4 text-lg font-bold text-ink">{p.nombreCompleto}</p>
          <p className="text-sm capitalize text-gray-500">Nivel {p.nivel}</p>
          <Link href={`/c/${p.credentialToken}`} className="mt-5 inline-flex items-center gap-2 rounded-full border border-guinda/25 px-5 py-2.5 text-sm font-semibold text-guinda hover:bg-guinda/5">
            <ArrowUpRight size={16} />Ver credencial completa
          </Link>
        </div>
      </div>
    </StudentShell>
  );
}
