import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Download } from 'lucide-react'
import type { FilaReporteInventario, ReporteInventarioData, SumaInventario } from '@/api/endpoints'
import { reporteInventarioQuery } from '@/api/queries'
import { DIAS_ALERTA } from '@/api/tipos'
import { ErrorCarga, EsqueletoPagina } from '@/components/estados'
import { FiltroSelect } from '@/components/filter-bar'
import { Bloque, EncabezadoHoja, Hoja, ListaBarras, Numero, Tabla, Vacio } from '@/components/reporte/piezas'
import { Button } from '@/components/ui/button'
import { FASES_REPORTE, listaInventario, validarReporteInventario, type FaseReporte } from '@/lib/filtros'
import { fmtDias, fmtEntero, fmtFecha, fmtQ, fmtQCorto } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/inventario/reporte')({
  validateSearch: validarReporteInventario,
  search: { middlewares: [stripSearchParams({ fase: 'predio' as FaseReporte })] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(reporteInventarioQuery(deps.fase))
  },
  component: ReporteInventario,
})

const OPCIONES = FASES_REPORTE.map((f) => ({ valor: f.valor, etiqueta: f.etiqueta }))

function ReporteInventario() {
  const { fase } = Route.useSearch()
  const navigate = useNavigate({ from: '/inventario/reporte' })
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery(reporteInventarioQuery(fase))

  // El título del documento es el nombre que el navegador propone para el PDF.
  useEffect(() => {
    const anterior = document.title
    document.title = `Inventario VehDemo, ${fmtFecha(Date.now())}`
    return () => {
      document.title = anterior
    }
  }, [])

  return (
    <>
      <Link
        to="/inventario"
        search={listaInventario()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground print:hidden"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Inventario
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reporte de inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Al descargar, elige «Guardar como PDF» en la ventana de impresión.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <FiltroSelect
            etiqueta="Autos"
            valor={fase}
            opciones={OPCIONES}
            onCambio={(v) => navigate({ search: { fase: v as FaseReporte }, replace: true })}
            className="flex-1 sm:flex-none"
          />
          <Button className="h-9" disabled={!data || isPlaceholderData} onClick={() => window.print()}>
            <Download aria-hidden />
            Descargar PDF
          </Button>
        </div>
      </div>

      {isPending ? (
        <EsqueletoPagina tarjetas={0} bloques={['mx-auto h-[1056px] w-full max-w-[816px]']} />
      ) : isError ? (
        <ErrorCarga onReintentar={() => void refetch()} />
      ) : (
        <div aria-busy={isPlaceholderData} className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
          <HojaInventario data={data} />
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------ Hoja (lo que se imprime)

const TITULO: Record<FaseReporte, string> = {
  predio: 'Inventario del predio',
  preparacion: 'Inventario en preparación',
  disponible: 'Inventario a la venta',
}

const autos = (n: number) => `${fmtEntero(n)} ${n === 1 ? 'auto' : 'autos'}`

function HojaInventario({ data }: { data: ReporteInventarioData }) {
  const { propios, consignacion } = data
  const total = propios.unidades + consignacion.unidades
  const sinPrecio = propios.sinPrecio

  return (
    <Hoja>
      <EncabezadoHoja titulo={TITULO[data.fase]}>
        Al {fmtFecha(data.fecha)}
        <br />
        {autos(total)}
        {consignacion.unidades > 0 && `, ${fmtEntero(consignacion.unidades)} en consignación`}
      </EncabezadoHoja>

      {total === 0 ? (
        <div className="mt-8">
          <Vacio>No hay autos en esta parte del inventario.</Vacio>
        </div>
      ) : (
        <>
          {/* Números del predio (solo autos propios) */}
          <section aria-label="Autos propios del predio" className="mt-6">
            <h3 className="text-sm font-semibold">Autos propios</h3>
            <div className="mt-2 grid grid-cols-2 border-y sm:grid-cols-4 print:grid-cols-4">
              <Numero etiqueta="Autos" valor={fmtEntero(propios.unidades)} />
              <Numero etiqueta="Costaron" valor={fmtQCorto(propios.costo)} antes="Compra más gastos" />
              <Numero
                etiqueta="Se pide por ellos"
                valor={fmtQCorto(propios.pedido)}
                antes={sinPrecio > 0 ? `${autos(sinPrecio)} aún sin precio` : undefined}
              />
              <Numero
                etiqueta="Ganancia esperada"
                valor={fmtQCorto(propios.ganancia)}
                antes={sinPrecio > 0 ? 'De los que ya tienen precio' : 'Si se venden al precio pedido'}
              />
            </div>
          </section>

          {consignacion.unidades > 0 && <Consignacion s={consignacion} />}

          {/* Cómo está el inventario */}
          <section className="mt-8 grid break-inside-avoid gap-8 sm:grid-cols-2 print:grid-cols-2">
            {data.porFase.length > 1 && (
              <Bloque titulo="Por fase">
                <ListaBarras
                  items={data.porFase.map((f) => ({ etiqueta: f.etiqueta, valor: f.unidades, texto: autos(f.unidades) }))}
                />
              </Bloque>
            )}
            <Bloque titulo="Días en el predio">
              <ul className="flex flex-col gap-2">
                {data.porDias.map((d) => {
                  const max = Math.max(1, ...data.porDias.map((x) => x.unidades))
                  return (
                    <li key={d.etiqueta} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 text-sm">
                      <span className={cn('truncate', d.alerta && d.unidades > 0 && 'font-medium text-bad-text')}>{d.etiqueta}</span>
                      <span className="font-medium">{autos(d.unidades)}</span>
                      <span aria-hidden className="col-span-2 block h-1.5 rounded-xs bg-muted">
                        <span
                          className={cn('block h-full rounded-xs', d.alerta ? 'bg-bad-text' : 'bg-brand-600')}
                          style={{ width: `${(d.unidades / max) * 100}%` }}
                        />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Bloque>
          </section>

          {/* Lista completa, por fase */}
          {data.grupos.map((g) => (
            <Bloque key={g.fase} titulo={`${g.etiqueta} (${fmtEntero(g.filas.length)})`} className="mt-10">
              {g.filas.length === 0 ? (
                <Vacio>No hay autos {g.etiqueta.toLowerCase()}.</Vacio>
              ) : (
                <Tabla
                  columnas={['Auto', 'Días', 'Costo total', 'Precio pedido', 'Ganancia esperada']}
                  alinearDerecha={[1, 2, 3, 4]}
                  filas={g.filas.map((f) => filaTabla(f))}
                  pie={[
                    'Total',
                    '',
                    fmtQ(g.total.costo),
                    g.total.pedido ? fmtQ(g.total.pedido) : '—',
                    g.total.pedido ? fmtQ(g.total.ganancia) : '—',
                  ]}
                />
              )}
            </Bloque>
          ))}

          <p className="mt-6 text-xs text-muted-foreground">
            Costo total: compra (o lo acordado con el dueño, si está en consignación) más gastos. Ganancia esperada: precio pedido menos
            costo total, sin contar comisión. Resaltados: más de {DIAS_ALERTA} días en el predio.
          </p>
        </>
      )}
    </Hoja>
  )
}

function filaTabla(f: FilaReporteInventario) {
  const atrasado = f.dias > DIAS_ALERTA
  return [
    <span key="a" className="block">
      <span className="font-medium">{f.nombre}</span>
      {f.modalidad === 'consignacion' && <span className="ml-1.5 text-xs text-brand-800">consignación</span>}
      <span className="block text-xs text-muted-foreground">{f.detalle}</span>
    </span>,
    <span key="d" className={cn(atrasado && 'font-semibold text-bad-text')}>
      {fmtDias(f.dias)}
    </span>,
    fmtQ(f.costo),
    f.pedido !== null ? fmtQ(f.pedido) : <span className="text-subtle-foreground">Sin precio</span>,
    f.ganancia !== null ? (
      <span className={cn('font-medium', f.ganancia < 0 && 'text-bad-text')}>{fmtQ(f.ganancia)}</span>
    ) : (
      <span className="text-subtle-foreground">—</span>
    ),
  ]
}

/** Consignación aparte: lo acordado no es dinero que el predio haya puesto; se le paga al dueño al vender. */
function Consignacion({ s }: { s: SumaInventario }) {
  return (
    <section aria-label="Autos en consignación" className="mt-6 break-inside-avoid">
      <h3 className="text-sm font-semibold">En consignación ({autos(s.unidades)})</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        No es dinero del predio: lo acordado se le paga al dueño cuando se vende.
        {s.sinPrecio > 0 && ` ${autos(s.sinPrecio)} aún sin precio; lo que se pide y lo que quedaría cuentan solo los que ya tienen.`}
      </p>
      <dl className="mt-2 grid grid-cols-3 border-y">
        {[
          ['Acordado y gastos', s.costo],
          ['Se pide', s.pedido],
          ['Le quedaría al predio', s.ganancia],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="border-l py-3 pl-4 first:border-l-0 first:pl-0">
            <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
            <dd className="mt-0.5 text-base font-semibold">{fmtQ(valor as number)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
