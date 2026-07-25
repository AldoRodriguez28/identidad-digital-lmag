'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home, IdCard, Users, GraduationCap, Heart, Store,
  CalendarDays, BookOpen, Briefcase, Bell, LogOut, MessageCircle, Palette,
} from 'lucide-react';
import { api } from '../../../lib/api';

type Me = { nombre: string; rol: string };

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

const NAV: NavItem[] = [
  { href: '/panel', label: 'Inicio', icon: Home },
  { href: '/panel/perfil', label: 'Mi Perfil', icon: IdCard },
  { href: '/panel/usuarios', label: 'Usuarios de la Plataforma', icon: Users, adminOnly: true },
  { href: '/panel/estudiantes', label: 'Usuarios Estudiantes', icon: GraduationCap },
  { href: '/panel/intereses', label: 'Catálogo de Intereses', icon: Heart },
  { href: '/panel/comercios', label: 'Comercios', icon: Store },
  { href: '/panel/eventos', label: 'Eventos', icon: CalendarDays },
  { href: '/panel/talleres', label: 'Talleres', icon: BookOpen },
  { href: '/panel/vacantes', label: 'Vacantes', icon: Briefcase },
  { href: '/panel/recursos', label: 'Educación / Deporte / Cultura', icon: Palette },
];

function initials(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api('/auth/me').then(async (r) => {
      if (r.ok) setMe(await r.json());
      else router.push('/ingresar');
    }).catch(() => router.push('/ingresar'));
  }, [router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.push('/ingresar');
  }

  if (!me) return <main className="grid min-h-screen place-items-center bg-page text-guinda">Cargando…</main>;

  const items = NAV.filter((i) => !i.adminOnly || me.rol === 'admin');

  return (
    <div className="flex min-h-screen bg-page">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col bg-guinda text-white md:flex">
        <div className="px-6 py-6">
          <Image
            src="/brand/logo-ayuntamiento.png"
            alt="Ayuntamiento de San Andrés Tuxtla"
            width={528}
            height={256}
            priority
            className="h-auto w-44 brightness-0 invert"
          />
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === '/panel' ? pathname === '/panel' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-dorado text-guinda-900 font-semibold shadow-sm' : 'text-white/85 hover:bg-white/10',
                ].join(' ')}
              >
                <Icon size={18} className="shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <a
          href="https://wa.me/"
          target="_blank"
          rel="noopener noreferrer"
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-3 text-xs text-white/80 hover:bg-white/10"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-whatsapp text-white">
            <MessageCircle size={16} />
          </span>
          <span>¿Necesitas ayuda?<br /><span className="font-semibold text-white">Escríbenos por WhatsApp</span></span>
        </a>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-3 px-6">
          <button className="relative grid h-10 w-10 place-items-center rounded-full text-guinda ring-1 ring-guinda/20 hover:bg-guinda/5" aria-label="Notificaciones">
            <Bell size={18} />
          </button>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-guinda text-sm font-semibold text-white" title={`${me.nombre} (${me.rol})`}>
            {initials(me.nombre)}
          </span>
          <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-full text-guinda ring-1 ring-guinda/20 hover:bg-guinda/5" aria-label="Salir">
            <LogOut size={18} />
          </button>
        </header>

        <main className="flex-1 px-6 pb-10">{children}</main>
      </div>
    </div>
  );
}
