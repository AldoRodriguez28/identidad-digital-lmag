'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    api('/auth/me').then(async (r) => {
      if (r.ok) setMe(await r.json());
      else router.push('/login');
    }).catch(() => router.push('/login'));
  }, [router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!me) return <main className="p-6">Cargando…</main>;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/panel" className="font-medium">Inicio</Link>
          <Link href="/panel/estudiantes">Estudiantes</Link>
          <Link href="/panel/intereses">Intereses</Link>
          <Link href="/panel/comercios">Comercios</Link>
          <Link href="/panel/eventos">Eventos</Link>
          {me.rol === 'admin' && <Link href="/panel/usuarios">Usuarios</Link>}
          <Link href="/panel/perfil">Mi perfil</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">{me.nombre} ({me.rol})</span>
          <button className="rounded bg-gray-200 px-3 py-1" onClick={logout}>Salir</button>
        </div>
      </header>
      {children}
    </div>
  );
}
