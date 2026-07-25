'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';

export function TarjetaFlip({ token, className = '' }: { token: string; className?: string }) {
  const [flipped, setFlipped] = useState(false);
  const [url, setUrl] = useState(`/c/${token}`);

  useEffect(() => { setUrl(`${window.location.origin}/c/${token}`); }, [token]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label="Voltear tarjeta"
        className="block w-full [perspective:1200px]"
      >
        <div
          className="relative aspect-[1.6/1] w-full transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Frente */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <Image src="/brand/tarjeta-frontal.webp" alt="Tarjeta Juventud" fill className="rounded-xl object-cover shadow-lg" />
          </div>
          {/* Reverso */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-guinda p-4 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="rounded-lg bg-white p-2">
              <QRCodeCanvas value={url} size={104} fgColor="#58101f" />
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/80">Escanea para validar</p>
          </div>
        </div>
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">Toca la tarjeta para {flipped ? 'ver el frente' : 'ver el QR'}</p>
    </div>
  );
}
