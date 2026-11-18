import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** Mensaje cuando un filtro deja un bloque sin datos que mostrar. */
export function SinDatos({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-md border border-dashed px-4 py-8 text-center">
      <div className="max-w-sm text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

export function ErrorCarga({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div role="alert" className="rounded-lg border bg-card px-5 py-10 text-center">
      <p className="text-base font-semibold">No se pudieron cargar los datos</p>
      <p className="mt-1 text-sm text-muted-foreground">Revisa tu conexión y vuelve a intentarlo.</p>
      <Button className="mt-4" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  )
}

/** Esqueleto con las mismas alturas que la página final (evita saltos de layout). */
export function EsqueletoPagina({ tarjetas = 4, bloques }: { tarjetas?: number; bloques: string[] }) {
  return (
    <div aria-busy="true" aria-label="Cargando datos" className="flex flex-col gap-4">
      {tarjetas > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: tarjetas }, (_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-lg" />
          ))}
        </div>
      )}
      {bloques.map((clase, i) => (
        <Skeleton key={i} className={`rounded-lg ${clase}`} />
      ))}
    </div>
  )
}
