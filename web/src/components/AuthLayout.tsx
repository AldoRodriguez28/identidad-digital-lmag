import Image from 'next/image';
import type { ReactNode } from 'react';

export const authInput =
  'w-full rounded-lg border border-black/10 bg-gray-50 px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-gray-400 focus:border-guinda focus:bg-white focus:ring-2 focus:ring-guinda/15';

export function AuthLayout({
  title, subtitle, children, footer,
}: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-guinda px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Image
            src="/brand/logo-ayuntamiento.png"
            alt="Ayuntamiento de San Andrés Tuxtla"
            width={528}
            height={256}
            priority
            className="h-auto w-56 brightness-0 invert"
          />
        </div>
        <div className="rounded-2xl bg-white p-7 shadow-2xl">
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-guinda">{title}</h1>
          {subtitle && <p className="mb-5 mt-1 text-sm text-gray-500">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-white/85">{footer}</div>}
      </div>
    </main>
  );
}
