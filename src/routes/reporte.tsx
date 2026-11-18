import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { ArrowDownRight, ArrowUpRight, Download } from 'lucide-react'
import type { ReporteMesData } from '@/api/endpoints'
import { mesesReporteQuery, reporteMesQuery } from '@/api/queries'
import { DIAS_ALERTA } from '@/api/tipos'
import { ErrorCarga, EsqueletoPagina } from '@/components/estados'
import { Bloque, EncabezadoHoja, Hoja, ListaBarras, Numero, Renglon, Tabla, Vacio } from '@/components/reporte/piezas'
import { FiltroSelect } from '@/components/filter-bar'
import { Button } from '@/components/ui/button'
import { MES_ACTUAL, MES_REPORTE_DEFAULT, inicioDeClave, validarReporte } from '@/lib/filtros'
import { fmtDias, fmtEntero, fmtFecha, fmtMesCorto, fmtMesLargo, fmtPct, fmtQ, fmtQCorto, variacion } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/reporte')({
  validateSearch: validarReporte,
  search: { middlewares: [stripSearchParams({ mes: MES_REPORTE_DEFAULT })] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(reporteMesQuery(deps.mes))
    void context.queryClient.prefetchQuery(mesesReporteQuery())
  },
  component: Reporte,
})

function Reporte() {
  const { mes } = Route.useSearch()
  const navigate = useNavigate({ from: '/reporte' })
  const meses = useQuery(mesesReporteQuery())
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery(reporteMesQuery(mes))

  const nombreMes = fmtMesLargo(inicioDeClave(mes))

  // El título del documento es el nombre que el navegador propone para el PDF.
  useEffect(() => {
    const anterior = document.title
    document.title = `Reporte VehDemo, ${nombreMes}`
    return () => {
      document.title = anterior
    }
  }, [nombreMes])

  const opciones = (meses.data ?? [mes]).map((clave) => ({
    valor: clave,
    etiqueta: `${fmtMesLargo(inicioDeClave(clave))}${clave === MES_ACTUAL ? ' (en curso)' : ''}`,
  }))

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reporte mensual</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Al descargar, elige «Guardar como PDF» en la ventana de impresión.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <FiltroSelect
            etiqueta="Mes"
            valor={mes}
            opciones={opciones}
            onCambio={(v) => navigate({ search: { mes: v }, replace: true })}
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
          <HojaMes data={data} />
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------ Hoja (lo que se imprime)

function HojaMes({ data }: { data: ReporteMesData }) {
  const { actual, anterior } = data
  const mes = fmtMesLargo(data.mes)
  const d = new Date(data.mes)
  const mesAnterior = new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleString('es-GT', { month: 'long' })

  return (
    <Hoja>
      <EncabezadoHoja titulo={`Reporte de ${mes}`}>
        Del {fmtFecha(data.desde)} al {fmtFecha(data.hasta)}
        <br />
        {data.completo ? `Generado el ${fmtFecha(data.generado)}` : 'Mes en curso: datos hasta hoy'}
      </EncabezadoHoja>

      {/* Ganancia */}
      <section className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <h3 className="text-sm text-muted-foreground">Ganancia del mes</h3>
          <p className={cn('mt-1 text-kpi font-semibold', actual.ganancia < 0 && 'text-bad-text')}>{fmtQ(actual.ganancia)}</p>
          <Cambio actual={actual.ganancia} anterior={anterior.ganancia} texto={`vs. ${mesAnterior}`} />
        </div>
        <dl className="self-end text-sm">
          <Renglon etiqueta="Vendiste" valor={fmtQ(actual.ventas)} />
          <Renglon etiqueta="Te costaron esos autos" valor={`− ${fmtQ(actual.costoVendidos)}`} />
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-foreground pt-2">
            <dt className="font-semibold">Ganancia</dt>
            <dd className="font-semibold">{fmtQ(actual.ganancia)}</dd>
          </div>
        </dl>
      </section>

      {/* Números del mes */}
      <section aria-label="Números del mes" className="mt-8 grid grid-cols-2 border-y sm:grid-cols-4 print:grid-cols-4">
        <Numero etiqueta="Autos vendidos" valor={fmtEntero(actual.vendidos)} antes={`En ${mesAnterior}: ${fmtEntero(anterior.vendidos)}`} />
        <Numero etiqueta="Autos comprados" valor={fmtEntero(actual.comprados)} antes={`En ${mesAnterior}: ${fmtEntero(anterior.comprados)}`} />
        <Numero etiqueta="Gastos" valor={fmtQCorto(actual.gastos)} antes={`En ${mesAnterior}: ${fmtQCorto(anterior.gastos)}`} />
        <Numero
          etiqueta="En el predio al cierre"
          valor={fmtEntero(data.predio.unidades)}
          antes={`${fmtQCorto(data.predio.invertido)} invertidos`}
        />
      </section>

      {/* Gráficos */}
      <section className="mt-8 grid break-inside-avoid gap-8 sm:grid-cols-2 print:grid-cols-2">
        <Bloque titulo="Ganancia de los últimos 6 meses">
          <BarrasMeses meses={data.meses} actual={data.mes} />
        </Bloque>
        <Bloque titulo="¿En qué se gastó?">
          {data.gastosPorTipo.length === 0 ? (
            <Vacio>No hubo gastos este mes.</Vacio>
          ) : (
            <ListaBarras items={data.gastosPorTipo.map((g) => ({ etiqueta: g.etiqueta, valor: g.monto, texto: fmtQCorto(g.monto) }))} />
          )}
        </Bloque>
      </section>

      {/* Autos vendidos */}
      <Bloque titulo={`Autos vendidos (${fmtEntero(data.vendidos.length)})`} className="mt-10">
        {data.vendidos.length === 0 ? (
          <Vacio>No se vendió ningún auto este mes.</Vacio>
        ) : (
          <Tabla
            columnas={['Fecha', 'Auto', 'Placa', 'Vendido en', 'Costó', 'Ganancia']}
            alinearDerecha={[3, 4, 5]}
            filas={data.vendidos.map((v) => [
              fmtFecha(v.fecha),
              v.nombre,
              v.placa,
              fmtQ(v.precio),
              fmtQ(v.costo),
              <span key="g" className={cn('font-medium', v.ganancia < 0 && 'text-bad-text')}>
                {fmtQ(v.ganancia)}
              </span>,
            ])}
            pie={['Total', '', '', fmtQ(actual.ventas), fmtQ(actual.costoVendidos), fmtQ(actual.ganancia)]}
          />
        )}
      </Bloque>

      {/* Autos con muchos días */}
      <Bloque titulo={`Autos con más de ${DIAS_ALERTA} días sin venderse al cierre (${fmtEntero(data.predio.totalAtrasados)})`} className="mt-10">
        {data.predio.totalAtrasados === 0 ? (
          <Vacio>Ningún auto llevaba más de {DIAS_ALERTA} días en el predio.</Vacio>
        ) : (
          <>
            <Tabla
              columnas={['Auto', 'Placa', 'Días en el predio', 'Costo hasta la fecha']}
              alinearDerecha={[2, 3]}
              filas={data.predio.atrasados.map((a) => [a.nombre, a.placa, fmtDias(a.dias), fmtQ(a.costo)])}
            />
            {data.predio.totalAtrasados > data.predio.atrasados.length && (
              <p className="mt-2 text-xs text-muted-foreground">
                Y {fmtEntero(data.predio.totalAtrasados - data.predio.atrasados.length)} más. Lista completa en Inventario.
              </p>
            )}
          </>
        )}
      </Bloque>
    </Hoja>
  )
}

// ------------------------------------------------------------------ Piezas

function Cambio({ actual, anterior, texto }: { actual: number; anterior: number; texto: string }) {
  const c = variacion(actual, anterior)
  if (c === null || Math.abs(c) < 0.001) return null
  const Flecha = c > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
      <Flecha className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{c > 0 ? 'Sube' : 'Baja'}</span>
      {Math.abs(c) >= 3 ? 'Más de 300 %' : fmtPct(Math.abs(c))} {texto}
    </p>
  )
}

/** Barras verticales en HTML: se imprimen nítidas, sin depender del canvas. */
function BarrasMeses({ meses, actual }: { meses: ReporteMesData['meses']; actual: number }) {
  const max = Math.max(1, ...meses.map((m) => m.ganancia))
  return (
    <figure>
      <div className="flex h-40 items-end gap-2 border-b" role="img" aria-label={meses.map((m) => `${fmtMesLargo(m.mes)}: ${fmtQ(m.ganancia)}`).join('. ')}>
        {meses.map((m) => (
          <div key={m.mes} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] whitespace-nowrap text-muted-foreground">{fmtQCorto(m.ganancia)}</span>
            <span
              className={cn('w-full max-w-10 rounded-t-xs', m.mes === actual ? 'bg-brand-700' : 'bg-brand-200')}
              style={{ height: `${(Math.max(0, m.ganancia) / max) * 100 * 0.8}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {meses.map((m) => (
          <span key={m.mes} className={cn('flex-1 text-center text-xs text-muted-foreground', m.mes === actual && 'font-semibold text-foreground')}>
            {fmtMesCorto(m.mes)}
          </span>
        ))}
      </div>
    </figure>
  )
}
