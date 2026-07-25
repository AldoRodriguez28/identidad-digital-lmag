import Image from 'next/image';
import Link from 'next/link';
import { LogIn, UserPlus } from 'lucide-react';

const FEATURES = [
  { icon: '/brand/icon-beneficios.png', label: 'Beneficios exclusivos' },
  { icon: '/brand/icon-becas.png', label: 'Becas para cursos y certificaciones' },
  { icon: '/brand/icon-descuentos.png', label: 'Descuentos en restaurantes y comercios' },
  { icon: '/brand/icon-eventos.png', label: 'Eventos y conciertos' },
  { icon: '/brand/icon-mentoria.png', label: 'Mentoría y apoyo para emprender' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid lg:grid-cols-2">
        {/* Hero — izquierda */}
        <div className="flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-16">
          <div className="mb-6 flex items-center gap-4">
            <Image src="/brand/logo-ayuntamiento.png" alt="Ayuntamiento de San Andrés Tuxtla" width={528} height={256} priority className="h-14 w-auto" />
            <span className="text-sm font-semibold text-gray-400">2026 – 2029</span>
          </div>

          <h1 className="text-5xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl">
            <span className="block text-guinda">Juventud</span>
            <span className="block text-dorado">San Andrés</span>
          </h1>

          <p className="mt-3 font-cursive text-4xl text-guinda">Tu talento, tu ciudad, tu futuro.</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/registro" className="inline-flex items-center gap-2 rounded-full bg-guinda px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-guinda-700">
              <UserPlus size={16} />Registro
            </Link>
            <Link href="/ingresar" className="inline-flex items-center gap-2 rounded-full border-2 border-guinda px-6 py-3 text-sm font-bold uppercase tracking-wide text-guinda transition-colors hover:bg-guinda/5">
              <LogIn size={16} />Iniciar sesión
            </Link>
          </div>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-gray-500">
            Únete a la comunidad juvenil de <b className="text-guinda">San Andrés Tuxtla</b> y comienza a disfrutar de
            <b className="text-guinda"> beneficios exclusivos, becas, descuentos</b>, eventos y mucho más.
          </p>
        </div>

        {/* Hero — imagen derecha */}
        <div className="relative min-h-[320px] lg:min-h-screen">
          <Image src="/brand/hero-jovenes.jpg" alt="Jóvenes de San Andrés Tuxtla" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-guinda/25" />
          <div className="absolute right-6 top-6 rounded-xl bg-guinda px-4 py-2 text-right text-white shadow-lg">
            <p className="text-sm font-extrabold uppercase leading-tight">Jóvenes fuertes,<br />economía fuerte.</p>
          </div>
        </div>
      </div>

      {/* Franja de features */}
      <div className="bg-guinda text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-3 lg:grid-cols-5">
          {FEATURES.map((feat) => (
            <div key={feat.label} className="flex flex-col items-center gap-2 text-center">
              <Image src={feat.icon} alt="" width={48} height={48} className="h-10 w-10 object-contain" />
              <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-white/90">{feat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
