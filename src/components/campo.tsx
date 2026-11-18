import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { descripcionDe } from '@/lib/formulario'
import { cn } from '@/lib/utils'

interface CampoProps {
  id: string
  etiqueta: string
  /** Texto de ayuda bajo el campo */
  ayuda?: ReactNode
  error?: string | null
  opcional?: boolean
  className?: string
  children: ReactNode
}

/**
 * Campo de formulario: etiqueta visible, ayuda y error junto al campo.
 * El control hijo debe usar `id` y `aria-describedby={descripcionDe(id)}` (ver lib/formulario).
 */
export function Campo({ id, etiqueta, ayuda, error, opcional, className, children }: CampoProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {etiqueta}
        {opcional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
      {error ? (
        <p id={descripcionDe(id)} className="text-xs font-medium text-bad-text">
          {error}
        </p>
      ) : ayuda ? (
        <p id={descripcionDe(id)} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
    </div>
  )
}

/** Error general del formulario (p. ej. el que devuelve la API). */
export function ErrorFormulario({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p role="alert" className="rounded-sm border border-bad-text/30 bg-bad-subtle px-3 py-2 text-sm text-bad-text">
      {mensaje}
    </p>
  )
}
