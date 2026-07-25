'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Login unificado: todo el mundo entra por /ingresar.
export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/ingresar'); }, [router]);
  return <main className="grid min-h-screen place-items-center bg-guinda text-white/80">Redirigiendo…</main>;
}
