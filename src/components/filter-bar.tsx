import { useId } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Opcion } from '@/lib/filtros'
import { cn } from '@/lib/utils'

/** Selector con etiqueta visible, usado en las barras de filtros. */
export function FiltroSelect({
  etiqueta,
  valor,
  opciones,
  onCambio,
  className,
}: {
  etiqueta: string
  valor: string
  opciones: Opcion[]
  onCambio: (v: string) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span id={id} className="text-xs text-muted-foreground">
        {etiqueta}
      </span>
      <Select value={valor} onValueChange={onCambio}>
        <SelectTrigger aria-labelledby={id} className="h-9 w-full bg-card sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {opciones.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
