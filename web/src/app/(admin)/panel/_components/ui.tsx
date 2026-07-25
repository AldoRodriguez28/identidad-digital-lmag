'use client';
import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

// Clases compartidas (patrón del referente: inputs redondeados, foco guinda)
export const inputCls =
  'w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-gray-400 focus:border-guinda focus:ring-2 focus:ring-guinda/15';

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children, variant = 'primary', className = '', ...props
}: { children: ReactNode; variant?: 'primary' | 'outline' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50';
  const styles = variant === 'primary'
    ? 'bg-guinda text-white hover:bg-guinda-700'
    : 'border border-guinda/25 text-guinda hover:bg-guinda/5';
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-guinda px-2.5 py-0.5 text-xs font-semibold text-white">
      {children}
    </span>
  );
}

const TONES = {
  edit: 'text-guinda ring-guinda/25 hover:bg-guinda/5',
  neutral: 'text-guinda ring-guinda/25 hover:bg-guinda/5',
  gold: 'text-dorado ring-dorado/30 hover:bg-dorado/5',
  danger: 'text-danger ring-danger/30 hover:bg-danger/5',
} as const;

export function IconButton({
  variant = 'edit', icon, label, onClick,
}: { variant?: keyof typeof TONES; icon?: React.ElementType; label: string; onClick?: () => void }) {
  const Icon = icon ?? (variant === 'danger' ? Trash2 : Pencil);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full ring-1 transition-colors ${TONES[variant]}`}
    >
      <Icon size={16} />
    </button>
  );
}

export function IconLink({
  href, icon: Icon, label, variant = 'gold',
}: { href: string; icon: React.ElementType; label: string; variant?: keyof typeof TONES }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-full ring-1 transition-colors ${TONES[variant]}`}
    >
      <Icon size={16} />
    </a>
  );
}

// Contenedor de tabla con estilos consistentes
export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`pb-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 ${className}`}>{children}</th>;
}
export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`py-3.5 align-middle text-sm text-ink ${className}`}>{children}</td>;
}
