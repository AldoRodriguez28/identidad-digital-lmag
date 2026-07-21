'use client';
import { use, useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Credential = {
  nombreCompleto: string; nivel: string; edad: number; escolaridad: string; colonia: string;
  intereses: string[]; redes: { facebook?: string; instagram?: string; tiktok?: string; whatsapp?: string };
};

export default function CredencialPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [cred, setCred] = useState<Credential | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api(`/c/${token}`).then(async (r) => {
      if (r.ok) setCred(await r.json());
      else setNotFound(true);
    }).catch(() => setNotFound(true));
  }, [token]);

  if (notFound) return <main className="p-6">Credencial no encontrada.</main>;
  if (!cred) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto mt-10 max-w-sm p-6">
      <div className="rounded-2xl border p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">Credencial digital</p>
        <h1 className="mt-1 text-2xl font-semibold">{cred.nombreCompleto}</h1>
        <p className="mt-1 text-sm">Nivel <b>{cred.nivel}</b> · {cred.edad} años</p>
        <dl className="mt-4 space-y-1 text-sm">
          <div><dt className="inline text-gray-500">Escolaridad: </dt><dd className="inline">{cred.escolaridad}</dd></div>
          <div><dt className="inline text-gray-500">Colonia: </dt><dd className="inline">{cred.colonia}</dd></div>
        </dl>
        {cred.intereses.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cred.intereses.map((i) => (
              <span key={i} className="rounded-full border px-3 py-1 text-xs">{i}</span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
