import Image from 'next/image';

export const metadata = { title: 'Sin conexión' };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-guinda px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <Image src="/brand/logo-ayuntamiento.png" alt="San Andrés Tuxtla" width={528} height={256} priority className="mx-auto mb-6 h-auto w-48 brightness-0 invert" />
        <div className="rounded-2xl bg-white p-7 shadow-2xl">
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-guinda">Sin conexión</h1>
          <p className="mt-2 text-sm text-gray-600">
            No tienes conexión a internet. Revisa tu red e intenta de nuevo. Tu credencial digital sigue disponible si ya la habías abierto.
          </p>
        </div>
      </div>
    </main>
  );
}
