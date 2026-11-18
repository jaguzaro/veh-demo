import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/*
 * Piezas de las hojas imprimibles (reporte mensual y reporte de inventario).
 * Todo en HTML: se imprime nítido y sin depender del canvas.
 */

/** Hoja tamaño carta: con borde en pantalla, sin márgenes propios al imprimir. */
export function Hoja({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-[816px] rounded-lg border bg-card px-6 py-8 text-foreground sm:px-12 sm:py-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
      {children}
    </article>
  )
}

export function EncabezadoHoja({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-4">
      <div>
        <p className="text-sm font-semibold">VehDemo</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight first-letter:uppercase">{titulo}</h2>
      </div>
      <p className="text-xs text-muted-foreground sm:text-right print:text-right">{children}</p>
    </header>
  )
}

export function Renglon({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  )
}

export function Numero({ etiqueta, valor, antes }: { etiqueta: string; valor: string; antes?: string }) {
  return (
    <div className="border-l py-4 pl-4 first:border-l-0 first:pl-0 max-sm:[&:nth-child(3)]:border-l-0 max-sm:[&:nth-child(3)]:pl-0 print:[&:nth-child(3)]:border-l print:[&:nth-child(3)]:pl-4">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold">{valor}</p>
      {antes && <p className="mt-0.5 text-xs text-subtle-foreground">{antes}</p>}
    </div>
  )
}

export function Bloque({ titulo, className, children }: { titulo: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn('min-w-0', className)}>
      <h3 className="mb-3 break-after-avoid text-sm font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function ListaBarras({ items }: { items: { etiqueta: string; valor: number; texto: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.valor))
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.etiqueta} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="truncate">{i.etiqueta}</span>
          <span className="font-medium">{i.texto}</span>
          <span aria-hidden className="col-span-2 block h-1.5 rounded-xs bg-muted">
            <span className="block h-full rounded-xs bg-brand-600" style={{ width: `${(i.valor / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Tabla({
  columnas,
  filas,
  pie,
  alinearDerecha,
}: {
  columnas: string[]
  filas: ReactNode[][]
  pie?: ReactNode[]
  alinearDerecha: number[]
}) {
  const der = (i: number) => alinearDerecha.includes(i) && 'text-right'
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[520px] text-sm tabular-nums print:min-w-0">
        <thead>
          <tr className="border-b border-foreground text-xs text-muted-foreground">
            {columnas.map((c, i) => (
              <th key={c} scope="col" className={cn('py-1.5 pr-3 text-left font-medium last:pr-0', der(i))}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, r) => (
            // La última fila no se separa del total: así el total nunca queda solo en otra página.
            <tr key={r} className={cn('break-inside-avoid border-b', pie && r === filas.length - 1 && 'break-after-avoid')}>
              {f.map((celda, i) => (
                <td key={i} className={cn('py-1.5 pr-3 whitespace-nowrap last:pr-0 print:py-1', der(i))}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
          {/* El total va en el cuerpo: un tfoot se repetiría en cada página impresa. */}
          {pie && (
            <tr className="break-before-avoid break-inside-avoid border-t-2 border-foreground font-semibold">
              {pie.map((celda, i) => (
                <td key={i} className={cn('py-2 pr-3 whitespace-nowrap last:pr-0', der(i))}>
                  {celda}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
