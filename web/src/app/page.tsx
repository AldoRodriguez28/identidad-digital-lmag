import Image from 'next/image';
import Link from 'next/link';
import { User, LogIn, Users } from 'lucide-react';

const FEATURES: { icon: string; label: React.ReactNode }[] = [
  { icon: '/brand/icon-beneficios.png', label: <>BENEFICIOS<br />EXCLUSIVOS</> },
  { icon: '/brand/icon-becas.png', label: <>BECAS PARA CURSOS<br />Y CERTIFICACIONES</> },
  { icon: '/brand/icon-descuentos.png', label: <>DESCUENTOS EN COMERCIOS<br />LOCALES</> },
  { icon: '/brand/icon-eventos.png', label: <>EVENTOS Y<br />FESTIVALES</> },
  { icon: '/brand/icon-mentoria.png', label: <>MENTORÍA Y APOYO<br />PARA EMPRENDER</> },
];

const ctaCls =
  'inline-flex w-fit items-center gap-3 rounded-full border-2 border-dorado py-2.5 pl-2.5 pr-7 transition-colors';

export default function Home() {
  return (
    <main className="flex flex-col md:h-dvh md:overflow-hidden">
      {/* Hero */}
      <section className="relative flex min-h-[50dvh] bg-[#f8f7f4] md:min-h-0 md:flex-1 md:overflow-hidden">
        <div className="flex w-full flex-col md:flex-row">
          {/* Texto */}
          <div className="relative flex flex-col justify-center gap-5 px-6 py-12 min-[576px]:px-10 md:w-[46%] md:shrink-0 md:gap-[clamp(0.75rem,2vh,1.25rem)] md:px-14 md:py-[clamp(1.5rem,4vh,3rem)]">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo-ayuntamiento.png" alt="Ayuntamiento de San Andrés Tuxtla" width={528} height={256} priority
                className="h-[clamp(4.5rem,4vw+4vh,9rem)] w-auto"
              />
              <p className="text-[0.8125rem] font-semibold tracking-[0.03em] text-[#6b625d]">2026 – 2029</p>
            </div>

            <h1 className="text-[clamp(2.25rem,4.5vw,3.25rem)] font-extrabold uppercase leading-[0.95] md:text-[clamp(1.75rem,3vw+2vh,3.25rem)]">
              <span className="block text-guinda">Juventud</span>
              <span className="block text-dorado">San Andrés</span>
            </h1>

            <p className="font-cursive text-[clamp(1.5rem,2.75vw,1.875rem)] font-semibold leading-[1.1] md:text-[2.5rem]">
              <span className="block text-guinda">Tu talento, tu ciudad,</span>
              <span className="block pl-4 text-dorado">tu futuro.</span>
            </p>

            <span className="block h-[2px] w-24 rounded-full bg-dorado" aria-hidden="true" />

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/registro" className={`${ctaCls} bg-guinda text-white shadow-[0_10px_25px_-10px_#58101f80] hover:bg-guinda-900`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dorado"><User size={20} /></span>
                <span className="text-[1.125rem] font-extrabold tracking-[0.02em]">REGISTRO</span>
              </Link>
              <Link href="/ingresar" className={`${ctaCls} bg-transparent text-guinda hover:bg-guinda/[0.06]`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dorado"><LogIn size={20} /></span>
                <span className="text-[1.125rem] font-extrabold tracking-[0.02em]">INICIAR SESIÓN</span>
              </Link>
            </div>

            <p className="fs-5 max-w-[26rem] leading-relaxed text-[#6b625d]">
              Únete a la comunidad juvenil de <strong className="font-semibold text-guinda">San Andrés Tuxtla</strong> y comienza a disfrutar de beneficios exclusivos, becas, descuentos, eventos y mucho más.
            </p>
          </div>

          {/* Visual */}
          <div className="relative h-[100dvh] min-h-[18rem] overflow-hidden bg-guinda md:h-auto md:min-h-0 md:w-[54%]">
            <Image src="/brand/hero-jovenes.jpg" alt="Jóvenes de San Andrés Tuxtla mostrando su credencial digital." fill priority className="object-cover object-center" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[35%] bg-gradient-to-b from-transparent to-[#0000008c]" />

            <span className="absolute right-4 top-4 z-[2] max-w-[13rem] rounded-2xl bg-guinda p-3 text-white shadow-lg">
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dorado text-dorado"><Users size={18} /></span>
                <span className="text-sm font-bold leading-tight">JÓVENES FUERTES,<br />COMUNIDAD FUERTE.</span>
              </span>
            </span>

            <p className="absolute bottom-5 right-5 z-[2] text-right font-cursive text-xl leading-[1.15] text-dorado [text-shadow:0_2px_10px_#00000073]">
              ¡Juntos construimos<br />una mejor San Andrés Tuxtla!
            </p>
          </div>
        </div>
      </section>

      {/* Franja de features */}
      <section className="bg-[linear-gradient(120deg,#58101f_0%,#3d0b14_100%)] py-12 text-white md:shrink-0 md:py-[clamp(1rem,3vh,3rem)]">
        <div className="mx-auto max-w-6xl px-3">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {FEATURES.map((feat, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-center md:flex-row md:items-start md:gap-3 md:text-left">
                <Image src={feat.icon} alt="" width={44} height={44} aria-hidden className="h-11 w-11 shrink-0 object-contain md:h-[clamp(2rem,4vh,2.75rem)] md:w-[clamp(2rem,4vh,2.75rem)]" />
                <span className="text-[0.8125rem] font-bold uppercase leading-[1.4]">{feat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
