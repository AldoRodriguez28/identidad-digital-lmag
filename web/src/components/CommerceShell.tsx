'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { QrCode, ReceiptText, User, LogOut } from 'lucide-react';
import { api } from '../lib/api';

const NAV = [
  { href: '/comercio/validar', label: 'Escanear', icon: QrCode },
  { href: '/comercio/compras', label: 'Compras', icon: ReceiptText },
  { href: '/comercio/perfil', label: 'Mi perfil', icon: User },
];

export function CommerceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    api('/commerce/me').then((r) => {
      if (!mounted) return;
      if (r.ok) setReady(true); else router.push('/ingresar');
    }).catch(() => { if (mounted) router.push('/ingresar'); });
    return () => { mounted = false; };
  }, [router]);

  async function logout() { await api('/commerce/logout', { method: 'POST' }); router.push('/ingresar'); }

  if (!ready) return <main className="grid min-h-screen place-items-center bg-page text-guinda">Cargando…</main>;

  return (
    <div className="min-h-screen bg-page">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-guinda px-6 py-3 text-white">
        <div className="flex items-center gap-6">
          <Image src="/brand/logo-ayuntamiento.png" alt="San Andrés Tuxtla" width={528} height={256} className="h-9 w-auto brightness-0 invert" />
          <nav className="flex gap-1">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link key={n.href} href={n.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${active ? 'bg-dorado text-guinda-900 font-semibold' : 'text-white/85 hover:bg-white/10'}`}>
                  <n.icon size={15} />{n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/25 hover:bg-white/20"><LogOut size={16} />Salir</button>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
