'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/eventos', label: 'Eventos' },
  { href: '/beneficios', label: 'Beneficios' },
  { href: '/talleres', label: 'Talleres' },
  { href: '/vacantes', label: 'Vacantes' },
  { href: '/mis-puntos', label: 'Mis Puntos' },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-guinda text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/logo-ayuntamiento.png" alt="San Andrés Tuxtla" width={528} height={256} className="h-9 w-auto brightness-0 invert" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-dorado text-guinda-900 font-semibold' : 'text-white/85 hover:bg-white/10'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/perfil" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20">
          <UserRound size={16} />Mi perfil
        </Link>
      </div>
    </header>
  );
}

export function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
