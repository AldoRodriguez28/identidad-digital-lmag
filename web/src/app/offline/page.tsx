export const metadata = { title: 'Sin conexión' };

export default function OfflinePage() {
  return (
    <main className="mx-auto mt-16 max-w-sm p-6 text-center">
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="mt-2 text-sm text-gray-600">
        No tienes conexión a internet. Revisa tu red e intenta de nuevo.
        Tu credencial digital sigue disponible si ya la habías abierto.
      </p>
    </main>
  );
}
