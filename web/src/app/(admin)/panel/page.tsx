'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function PanelPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    api('/auth/me').then(async (r) => {
      if (r.ok) setMe(await r.json());
      else router.push('/login');
    });
  }, [router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!me) return <main className="p-6">Cargando…</main>;
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Hola, {me.nombre} ({me.rol})</h1>
      <button className="mt-4 rounded bg-gray-200 px-3 py-1" onClick={logout}>Cerrar sesión</button>
    </main>
  );
}
