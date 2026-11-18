import { memo } from 'react'
import { ArrowDownRight, ArrowUpRight, CircleAlert, Minus, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtPct, variacion } from '@/lib/format'

export interface Alerta {
  nivel: 'warn' | 'bad'
  mensaje: string
}

interface KpiCardProps {
  etiqueta: string
  valor: string
  /** Valor actual y anterior para calcular la variación */
  comparar?: { actual: number; anterior: number; mayorEsMejor: boolean | null; texto?: string }
  detalle?: string
  alerta?: Alerta | null
}

/**
 * Tarjeta KPI del sistema "Libro Mayor Suizo".
 * En alerta, el borde izquierdo pasa a 2 px del color semántico
 * y se añade un texto corto: nunca se depende solo del color.
 */
export const KpiCard = memo(function KpiCard({ etiqueta, valor, comparar, detalle, alerta }: KpiCardProps) {
  const delta = comparar ? variacion(comparar.actual, comparar.anterior) : null
  const sube = delta !== null && delta > 0.001
  const baja = delta !== null && delta < -0.001
  // mayorEsMejor null: la variación se muestra sin juzgarla (ni verde ni roja).
  const favorable =
    comparar && comparar.mayorEsMejor !== null && (sube || baja) ? sube === comparar.mayorEsMejor : null
  const Icono = sube ? ArrowUpRight : baja ? ArrowDownRight : Minus

  return (
    <article className="relative flex flex-col rounded-lg border bg-card px-5 py-4">
      {alerta && (
        <span
          aria-hidden
          className={cn(
            'absolute -top-px -bottom-px -left-px w-0.5 rounded-l-lg',
            alerta.nivel === 'bad' ? 'bg-bad-text' : 'bg-warn-text',
          )}
        />
      )}
      <h3 className="text-sm text-muted-foreground">{etiqueta}</h3>
      <p className="mt-1.5 text-kpi-sm font-semibold text-foreground lg:text-kpi">{valor}</p>

      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {delta !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              favorable === true && 'text-ok-text',
              favorable === false && 'text-bad-text',
              favorable === null && 'text-muted-foreground',
            )}
          >
            <Icono className="size-3.5" aria-hidden />
            <span className="sr-only">{sube ? 'Sube' : baja ? 'Baja' : 'Sin cambio'}{comparar?.texto ? '' : ' respecto al período anterior'}</span>
            {Math.abs(delta) >= 3 ? 'Más de 300 %' : fmtPct(Math.abs(delta))}
            {comparar?.texto && <span className="font-normal text-muted-foreground">{comparar.texto}</span>}
          </span>
        )}
        {alerta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-medium',
              alerta.nivel === 'bad' ? 'text-bad-text' : 'text-warn-text',
            )}
          >
            {alerta.nivel === 'bad' ? (
              <CircleAlert className="size-3.5" aria-hidden />
            ) : (
              <TriangleAlert className="size-3.5" aria-hidden />
            )}
            {alerta.mensaje}
          </span>
        )}
      </div>
      {detalle && <p className="mt-1 text-xs text-subtle-foreground">{detalle}</p>}
    </article>
  )
})
