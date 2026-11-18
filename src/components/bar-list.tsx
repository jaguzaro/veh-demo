import { memo } from 'react'
import { cn } from '@/lib/utils'

export interface BarItem {
  etiqueta: string
  valor: number
  /** Texto del valor principal, ya formateado */
  texto: string
  /** Dato secundario, a la derecha y en gris */
  secundario?: string
}

interface BarListProps {
  items: BarItem[]
  /** Valor que representa el 100 % del ancho; por defecto, el mayor */
  maximo?: number
  className?: string
  /** Clase del relleno de la barra (token de color) */
  tono?: string
}

/**
 * Ranking corto con barras en HTML (pocas filas, no necesita canvas).
 * Los valores están en texto: la barra es solo apoyo visual.
 */
export const BarList = memo(function BarList({ items, maximo, className, tono = 'bg-brand-600' }: BarListProps) {
  const max = maximo ?? Math.max(...items.map((i) => i.valor), 0)
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => (
        <li key={item.etiqueta} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
          <span className="truncate text-sm text-foreground">{item.etiqueta}</span>
          <span className="text-sm font-medium text-foreground">
            {item.texto}
            {item.secundario && <span className="ml-2 font-normal text-subtle-foreground">{item.secundario}</span>}
          </span>
          <span aria-hidden className="col-span-2 h-1.5 overflow-hidden rounded-xs bg-muted">
            <span
              className={cn('block h-full rounded-xs', tono)}
              style={{ width: `${max > 0 ? Math.max(0, (item.valor / max) * 100) : 0}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
})
