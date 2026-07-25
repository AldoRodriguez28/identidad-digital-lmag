'use client';
import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';
import { Star } from 'lucide-react';
import { api } from '../../../lib/api';

type Credential = { nombreCompleto: string; nivel: string };

export default function CredencialPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [cred, setCred] = useState<Credential | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState(`/c/${token}`);

  useEffect(() => { setMounted(true); setUrl(`${window.location.origin}/c/${token}`); }, [token]);
  useEffect(() => {
    api(`/c/${token}`).then(async (r) => {
      if (r.ok) setCred(await r.json());
      else setNotFound(true);
    }).catch(() => {});
  }, [token]);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <main className="grid min-h-screen place-items-center bg-guinda px-4 py-10">{children}</main>
  );

  if (notFound) return <Wrapper><p className="text-white">Credencial no encontrada.</p></Wrapper>;

  return (
    <Wrapper>
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
        <Image src="/brand/logo-ayuntamiento.png" alt="San Andrés Tuxtla" width={528} height={256} priority className="mx-auto h-10 w-auto" />
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-guinda/70">Credencial Digital</p>

        {cred && (
          <div className="mt-3">
            <p className="text-lg font-bold text-ink">{cred.nombreCompleto}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-dorado px-3 py-0.5 text-xs font-bold capitalize text-guinda-900"><Star size={12} />{cred.nivel}</span>
          </div>
        )}

        {mounted && (
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-page p-4">
            <QRCodeCanvas value={url} size={200} fgColor="#58101f" />
          </div>
        )}
        <p className="mt-4 text-sm text-gray-500">Muestra este código para que lo escaneen.</p>
      </div>
    </Wrapper>
  );
}
