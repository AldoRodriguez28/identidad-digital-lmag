'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  IdCard, CreditCard, CalendarDays, Star, Store, Rocket, GraduationCap, Dumbbell, Palette,
  Bell, LogOut, LogIn, MessageCircle,
} from 'lucide-react';
import { api } from '../lib/api';

type NavItem = { href: string; label: string; icon: React.ElementType; disabled?: boolean };
const NAV: NavItem[] = [
  { href: '/perfil', label: 'Mi Perfil', icon: IdCard },
  { href: '/mi-tarjeta', label: 'Tarjeta Juventud', icon: CreditCard },
  { href: '/eventos', label: 'Eventos', icon: CalendarDays },
  { href: '/mis-puntos', label: 'Mis Puntos', icon: Star },
  { href: '/beneficios', label: 'Beneficios', icon: Store },
  { href: '/talleres', label: 'Emprendimiento', icon: Rocket },
  { href: '/educacion', label: 'Educación', icon: GraduationCap },
  { href: '/deporte', label: 'Deporte', icon: Dumbbell },
  { href: '/cultura', label: 'Cultura', icon: Palette },
];

function initials(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [nombre, setNombre] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api('/students/me').then(async (r) => {
      if (r.ok) { const m = await r.json(); setNombre(m.nombreCompleto ?? null); }
    }).catch(() => {}).finally(() => setChecked(true));
  }, []);

  async function logout() { await api('/students/logout', { method: 'POST' }); router.push('/ingresar'); }

  return (
    <div className="flex min-h-screen bg-page">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col bg-guinda text-white md:flex">
        <div className="px-6 py-6">
          <Image src="/brand/logo-ayuntamiento.png" alt="Ayuntamiento de San Andrés Tuxtla" width={528} height={256} priority className="h-auto w-44 brightness-0 invert" />
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon, disabled }) => {
            const active = pathname === href || (href !== '/perfil' && pathname.startsWith(href));
            if (disabled) {
              return (
                <span key={href} title="Próximamente" className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/40">
                  <Icon size={18} className="shrink-0" />{label}
                </span>
              );
            }
            return (
              <Link key={href} href={href}
                className={['flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-dorado text-guinda-900 font-semibold shadow-sm' : 'text-white/85 hover:bg-white/10'].join(' ')}>
                <Icon size={18} className="shrink-0" />{label}
              </Link>
            );
          })}
        </nav>
        <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="m-3 flex items-center gap-3 rounded-lg px-3 py-3 text-xs text-white/80 hover:bg-white/10">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-whatsapp text-white"><MessageCircle size={16} /></span>
          <span>¿Necesitas ayuda?<br /><span className="font-semibold text-white">Escríbenos por WhatsApp</span></span>
        </a>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-3 px-6">
          <button className="grid h-10 w-10 place-items-center rounded-full text-guinda ring-1 ring-guinda/20 hover:bg-guinda/5" aria-label="Notificaciones"><Bell size={18} /></button>
          {nombre ? (
            <>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-guinda text-sm font-semibold text-white" title={nombre}>{initials(nombre)}</span>
              <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-full text-guinda ring-1 ring-guinda/20 hover:bg-guinda/5" aria-label="Salir"><LogOut size={18} /></button>
            </>
          ) : checked ? (
            <Link href="/ingresar" className="inline-flex items-center gap-2 rounded-full bg-guinda px-4 py-2 text-sm font-semibold text-white hover:bg-guinda-700"><LogIn size={16} />Ingresar</Link>
          ) : null}
        </header>
        <main className="flex-1 px-6 pb-10">{children}</main>
      </div>
    </div>
  );
}
