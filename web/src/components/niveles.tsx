import { ChevronRight } from 'lucide-react';

export const NIVELES = [
  { key: 'bronce', label: 'Bronce', inicial: 'B' },
  { key: 'plata', label: 'Plata', inicial: 'P' },
  { key: 'oro', label: 'Oro', inicial: 'O' },
  { key: 'diamante', label: 'Diamante', inicial: 'D' },
] as const;

export function NivelesTiers({ nivel }: { nivel: string }) {
  return (
    <div className="flex items-center gap-1">
      {NIVELES.map((n, i) => (
        <div key={n.key} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1">
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${n.key === nivel ? 'bg-guinda text-white ring-2 ring-dorado' : 'bg-guinda/10 text-guinda'}`}>
              {n.inicial}
            </span>
            <span className={`text-[10px] ${n.key === nivel ? 'font-semibold text-guinda' : 'text-gray-400'}`}>{n.label}</span>
          </div>
          {i < NIVELES.length - 1 && <ChevronRight size={14} className="mb-4 text-gray-300" />}
        </div>
      ))}
    </div>
  );
}
