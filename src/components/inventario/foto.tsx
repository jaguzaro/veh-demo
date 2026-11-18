import { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fotoQuery } from '@/api/queries'
import type { Carroceria } from '@/api/tipos'
import { cn } from '@/lib/utils'

/*
 * Siluetas de perfil (frente a la derecha) en un lienzo de 120 × 48.
 * Se usan cuando el vehículo aún no tiene foto: dicen el tipo de auto de un vistazo.
 */
const SILUETA: Record<Carroceria, { cuerpo: string; ventana: string; ruedas: [number, number]; r: number }> = {
  Sedán: {
    cuerpo: 'M8 36 L8 29 Q9 25 22 24 L38 15 Q42 13 50 13 L72 13 Q79 13 85 17 L95 24 Q110 25 112 30 L112 36 Z',
    ventana: 'M41 22 L49 16 L66 16 L66 22 Z M70 16 Q78 16 83 20 L86 22 L70 22 Z',
    ruedas: [28, 92],
    r: 7,
  },
  Hatchback: {
    cuerpo: 'M12 36 L12 18 Q12 13 18 13 L70 13 Q77 13 82 17 L92 24 Q108 25 110 30 L110 36 Z',
    ventana: 'M18 17 L46 17 L46 23 L18 23 Z M50 17 L68 17 Q75 17 80 21 L82 23 L50 23 Z',
    ruedas: [28, 90],
    r: 7,
  },
  SUV: {
    cuerpo: 'M8 36 L8 13 Q8 8 14 8 L76 8 Q82 8 86 12 L96 21 Q110 22 112 27 L112 36 Z',
    ventana: 'M14 12 L44 12 L44 20 L14 20 Z M48 12 L74 12 Q80 12 84 16 L88 20 L48 20 Z',
    ruedas: [28, 92],
    r: 8,
  },
  Pickup: {
    cuerpo: 'M6 36 L6 22 L52 22 L52 11 Q52 8 56 8 L76 8 Q81 8 85 12 L93 20 Q110 21 112 26 L112 36 Z',
    ventana: 'M57 12 L74 12 Q79 12 83 16 L86 20 L57 20 Z',
    ruedas: [26, 92],
    r: 8,
  },
  Microbús: {
    cuerpo: 'M8 36 L8 9 Q8 5 13 5 L96 5 Q102 5 106 10 L113 21 L113 36 Z',
    ventana: 'M14 10 L32 10 L32 18 L14 18 Z M36 10 L54 10 L54 18 L36 18 Z M58 10 L76 10 L76 18 L58 18 Z M80 10 L98 10 Q102 10 105 14 L108 18 L80 18 Z',
    ruedas: [26, 94],
    r: 7,
  },
}

function Silueta({ carroceria }: { carroceria: Carroceria }) {
  const s = SILUETA[carroceria] ?? SILUETA.Sedán
  return (
    <svg viewBox="0 0 120 48" className="h-auto w-3/4" aria-hidden>
      <path d={s.cuerpo} className="fill-brand-200 dark:fill-brand-700" />
      <path d={s.ventana} className="fill-brand-50 dark:fill-brand-950" />
      {s.ruedas.map((x) => (
        <g key={x}>
          <circle cx={x} cy={37} r={s.r + 2} className="fill-brand-50 dark:fill-brand-950" />
          <circle cx={x} cy={37} r={s.r} className="fill-brand-800 dark:fill-brand-200" />
          <circle cx={x} cy={37} r={s.r * 0.4} className="fill-brand-300 dark:fill-brand-800" />
        </g>
      ))}
    </svg>
  )
}

/** Foto del vehículo; si no tiene, la silueta de su carrocería. Siempre en proporción 4:3. */
export const FotoVehiculo = memo(function FotoVehiculo({
  id,
  carroceria,
  nombre,
  className,
}: {
  id: string
  carroceria: Carroceria
  nombre: string
  className?: string
}) {
  const { data: foto } = useQuery(fotoQuery(id))
  return (
    <div className={cn('flex aspect-[4/3] items-center justify-center overflow-hidden bg-brand-50 dark:bg-brand-950', className)}>
      {foto ? (
        <img src={foto} alt={`Foto del ${nombre}`} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <Silueta carroceria={carroceria} />
      )}
    </div>
  )
})
