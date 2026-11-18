import { etiquetaFase, type Fase } from '@/api/tipos'
import { cn } from '@/lib/utils'

const ESTILO: Record<Fase, string> = {
  preparacion: 'bg-muted text-muted-foreground',
  disponible: 'bg-brand-50 text-brand-800',
  vendido: 'border text-muted-foreground',
}

/** Fase del vehículo. No usa colores semánticos: no es una alerta. */
export function EtiquetaFase({ fase, className }: { fase: Fase; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-xs px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', ESTILO[fase], className)}>
      {etiquetaFase(fase)}
    </span>
  )
}

/** Consignación sí se marca: cambia de quién es el auto y a quién se le paga al venderlo. */
export function EtiquetaConsignacion({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex rounded-xs border border-brand-300 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-brand-800', className)}>
      Consignación
    </span>
  )
}
