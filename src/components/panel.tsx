import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
  children: ReactNode
  className?: string
}

/** Contenedor de sección: borde fino, sin sombra. */
export function Panel({ titulo, descripcion, acciones, children, className }: PanelProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col rounded-lg border bg-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
        <div className="min-w-0">
          <h2 id={id} className="text-base font-semibold text-foreground">
            {titulo}
          </h2>
          {descripcion && <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {acciones}
      </header>
      <div className="flex-1 px-5 pt-4 pb-5">{children}</div>
    </section>
  )
}
