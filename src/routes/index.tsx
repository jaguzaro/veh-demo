import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import type { FilaSinVender, FilaVendido, ResumenData } from '@/api/endpoints'
import { resumenQuery } from '@/api/queries'
import { DIAS_ALERTA } from '@/api/tipos'
import { BarList } from '@/components/bar-list'
import { base, ejeCategoria, ejeValor, fuente, token } from '@/components/charts/chart-theme'
import { EChart, type ChartOption } from '@/components/charts/echart'
import { ErrorCarga, EsqueletoPagina, SinDatos } from '@/components/estados'
import { FiltroSelect } from '@/components/filter-bar'
import { KpiCard, type Alerta } from '@/components/kpi-card'
import { Panel } from '@/components/panel'
import { FILTROS_DEFAULT, RANGOS, validarFiltros, type Filtros } from '@/lib/filtros'
import { fmtDias, fmtEntero, fmtFecha, fmtMesCorto, fmtMesLargo, fmtPct, fmtQ, fmtQCorto, variacion } from '@/lib/format'
import { useTema } from '@/lib/tema'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  validateSearch: validarFiltros,
  search: { middlewares: [stripSearchParams(FILTROS_DEFAULT)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Sin await: la descarga empieza antes de montar la pantalla y no bloquea la navegación.
    void context.queryClient.prefetchQuery(resumenQuery(deps))
  },
  component: Resumen,
})

const OPC_RANGO = RANGOS.map((r) => ({ valor: r.valor, etiqueta: r.etiqueta }))

const TITULO_GANANCIA: Record<Filtros['rango'], string> = {
  mes: 'Ganancia de este mes',
  'mes-pasado': 'Ganancia del mes pasado',
  '3m': 'Ganancia de los últimos 3 meses',
  '6m': 'Ganancia de los últimos 6 meses',
  anio: 'Ganancia de este año',
  '12m': 'Ganancia de los últimos 12 meses',
}

function Resumen() {
  const filtros = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery(resumenQuery(filtros))
  const cambiar = (parcial: Partial<Filtros>) =>
    navigate({ search: (prev) => ({ ...prev, ...parcial }), replace: true })

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
          <p className="mt-1 min-h-5 text-sm text-muted-foreground">
            {data && `${fmtFecha(data.periodo.desde)} al ${fmtFecha(data.periodo.hasta)}`}
          </p>
        </div>
        <FiltroSelect
          etiqueta="Período"
          valor={filtros.rango}
          opciones={OPC_RANGO}
          onCambio={(v) => cambiar({ rango: v as Filtros['rango'] })}
          className="w-full sm:w-auto"
        />
      </div>

      {isPending ? (
        <EsqueletoPagina tarjetas={0} bloques={['h-[340px]', 'h-[112px]', 'h-[360px]', 'h-[380px]']} />
      ) : isError ? (
        <ErrorCarga onReintentar={() => void refetch()} />
      ) : (
        <div
          aria-busy={isPlaceholderData}
          className={cn('flex flex-col gap-4 transition-opacity', isPlaceholderData && 'opacity-60')}
        >
          <Ganancia data={data} />
          <Kpis data={data} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <GastosPorMes data={data} />
            <EnQueSeGasta data={data} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <AutosVendidos data={data} />
            <AutosAtrasados data={data} />
          </div>
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------ Ganancia (indicador principal)

function Ganancia({ data }: { data: ResumenData }) {
  const { actual, anterior, meses, periodo } = data
  const cambio = variacion(actual.ganancia, anterior.ganancia)
  const sube = cambio !== null && cambio > 0.001
  const baja = cambio !== null && cambio < -0.001
  const Flecha = sube ? ArrowUpRight : ArrowDownRight

  const tema = useTema() // los colores del canvas dependen del tema: repinta al cambiarlo
  const opcion = useMemo<ChartOption>(() => {
    void tema // token() lee el tema activo: sin esta dependencia el canvas no se repinta
    const d = new Date(periodo.desde)
    const inicioPeriodo = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    const etiquetas = token('color-brand-100')
    const reticula = token('color-brand-600')
    return {
      ...base(),
      grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        ...base().tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: token('color-brand-600') } },
        formatter: (ps: { dataIndex: number }[]) => {
          const m = meses[ps[0].dataIndex]
          return `<strong>${fmtMesLargo(m.mes)}</strong><br/>Ganancia: ${fmtQ(m.ganancia)}<br/>${fmtEntero(m.vendidos)} autos vendidos`
        },
      },
      xAxis: {
        type: 'category',
        data: meses.map((m) => fmtMesCorto(m.mes)),
        axisLine: { lineStyle: { color: reticula } },
        axisTick: { show: false },
        axisLabel: { color: etiquetas, fontFamily: fuente(), fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: etiquetas, fontFamily: fuente(), formatter: (v: number) => fmtQCorto(v).replace(/\.00 M$/, ' M') },
        splitLine: { lineStyle: { color: reticula } },
      },
      series: [
        {
          name: 'Ganancia',
          type: 'bar',
          data: meses.map((m) => ({
            value: m.ganancia,
            itemStyle: { color: token(m.mes >= inicioPeriodo ? 'color-white' : 'color-brand-400') },
          })),
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 40,
        },
      ],
    }
  }, [meses, periodo.desde, tema])

  const resumenGrafico = `Ganancia por mes. ${meses.map((m) => `${fmtMesLargo(m.mes)}: ${fmtQ(m.ganancia)}`).join('. ')}`

  return (
    <section
      aria-labelledby="titulo-ganancia"
      className="grid gap-8 rounded-lg bg-brand-700 p-5 text-white lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-10 lg:p-6"
    >
      <div className="flex flex-col">
        <h2 id="titulo-ganancia" className="text-base font-medium text-brand-100">
          {TITULO_GANANCIA[periodo.rango]}
        </h2>
        <p className={cn('mt-2 text-[2.5rem] leading-tight font-semibold sm:text-hero', actual.ganancia < 0 && 'text-bad-onbrand')}>
          {fmtQ(actual.ganancia)}
        </p>
        {cambio !== null && (sube || baja) && (
          <p className="mt-3 flex items-center gap-1 text-sm text-brand-50">
            <Flecha className="size-4 shrink-0" aria-hidden />
            {Math.abs(cambio) >= 3 ? 'Más de 300 %' : fmtPct(Math.abs(cambio))} {periodo.comparacion}
          </p>
        )}

        <dl className="mt-8 text-sm lg:mt-auto">
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-brand-100">Vendiste</dt>
            <dd className="font-semibold">{fmtQ(actual.ventas)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-brand-100">Te costaron esos autos</dt>
            <dd className="font-semibold">− {fmtQ(actual.costoVendidos)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-brand-400 pt-2.5">
            <dt className="font-medium">Ganancia</dt>
            <dd className="text-lg font-semibold">{fmtQ(actual.ganancia)}</dd>
          </div>
        </dl>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-brand-100">Ganancia por mes</p>
        <EChart option={opcion} label={resumenGrafico} className="h-[260px]" />
      </div>
    </section>
  )
}

// ------------------------------------------------------------------ Números rápidos

function Kpis({ data }: { data: ResumenData }) {
  const { actual, anterior, sinVender } = data

  const pctAtrasado = sinVender.invertido ? sinVender.atrasados.invertido / sinVender.invertido : 0
  const mensajeAtrasados = `${fmtEntero(sinVender.atrasados.unidades)} con más de ${DIAS_ALERTA} días`
  const alertaPredio: Alerta | null =
    pctAtrasado > 0.3
      ? { nivel: 'bad', mensaje: mensajeAtrasados }
      : pctAtrasado > 0.2
        ? { nivel: 'warn', mensaje: mensajeAtrasados }
        : null

  return (
    <section aria-labelledby="titulo-kpis" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <h2 id="titulo-kpis" className="sr-only">
        Números del período
      </h2>
      <KpiCard
        etiqueta="Autos vendidos"
        valor={fmtEntero(actual.vendidos)}
        comparar={{ actual: actual.vendidos, anterior: anterior.vendidos, mayorEsMejor: true }}
      />
      <KpiCard
        etiqueta="Autos comprados"
        valor={fmtEntero(actual.comprados)}
        comparar={{ actual: actual.comprados, anterior: anterior.comprados, mayorEsMejor: null }}
      />
      <KpiCard
        etiqueta="Gastos"
        valor={fmtQCorto(actual.gastos)}
        comparar={{ actual: actual.gastos, anterior: anterior.gastos, mayorEsMejor: null }}
      />
      <KpiCard
        etiqueta="Autos en el predio"
        valor={fmtEntero(sinVender.unidades)}
        detalle={`${fmtQCorto(sinVender.invertido)} invertidos`}
        alerta={alertaPredio}
      />
    </section>
  )
}

// ------------------------------------------------------------------ Gastos por mes

function GastosPorMes({ data }: { data: ResumenData }) {
  const { meses } = data

  const tema = useTema() // los colores del canvas dependen del tema: repinta al cambiarlo
  const opcion = useMemo<ChartOption>(() => {
    void tema // token() lee el tema activo: sin esta dependencia el canvas no se repinta
    const serie = (nombre: string, clave: 'compras' | 'otrosGastos', color: string) => ({
      name: nombre,
      type: 'bar',
      stack: 'gastos',
      data: meses.map((m) => m[clave]),
      itemStyle: { color: token(color), borderColor: token('color-neutral-0'), borderWidth: 1 },
      barMaxWidth: 40,
      emphasis: { disabled: true },
    })
    return {
      ...base(),
      grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        ...base().tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: token('color-neutral-100') } },
        formatter: (ps: { dataIndex: number }[]) => {
          const m = meses[ps[0].dataIndex]
          return `<strong>${fmtMesLargo(m.mes)}</strong><br/>Compra de autos: ${fmtQ(m.compras)}<br/>Otros gastos: ${fmtQ(m.otrosGastos)}<br/>Total: ${fmtQ(m.compras + m.otrosGastos)}`
        },
      },
      xAxis: { type: 'category', data: meses.map((m) => fmtMesCorto(m.mes)), ...ejeCategoria() },
      yAxis: {
        type: 'value',
        ...ejeValor(),
        axisLabel: { ...ejeValor().axisLabel, formatter: (v: number) => fmtQCorto(v).replace(/\.00 M$/, ' M') },
      },
      series: [serie('Compra de autos', 'compras', 'color-series-1'), serie('Otros gastos', 'otrosGastos', 'color-series-2')],
    }
  }, [meses, tema])

  const resumenGrafico = `Gastos por mes. ${meses
    .map((m) => `${fmtMesLargo(m.mes)}: compra de autos ${fmtQ(m.compras)}, otros gastos ${fmtQ(m.otrosGastos)}`)
    .join('. ')}`

  return (
    <Panel titulo="Gastos por mes" acciones={<Leyenda items={[['bg-series-1', 'Compra de autos'], ['bg-series-2', 'Otros gastos']]} />}>
      <EChart option={opcion} label={resumenGrafico} className="h-[260px] xl:h-full xl:min-h-[260px]" />
    </Panel>
  )
}

function Leyenda({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([color, texto]) => (
        <span key={texto} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn('size-2.5 rounded-xs', color)} />
          {texto}
        </span>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ ¿En qué se gasta?

function EnQueSeGasta({ data }: { data: ResumenData }) {
  const compra = data.gastosPorTipo.find((g) => g.clave === 'compra')?.monto ?? 0
  const otros = data.gastosPorTipo.filter((g) => g.clave !== 'compra')
  const totalOtros = otros.reduce((s, g) => s + g.monto, 0)
  const total = compra + totalOtros

  return (
    <Panel titulo="¿En qué se gasta?">
      {total === 0 ? (
        <SinDatos>No hay gastos en este período.</SinDatos>
      ) : (
        <>
          <div aria-hidden className="flex h-3 overflow-hidden rounded-xs bg-series-2">
            <span className="h-full bg-series-1" style={{ width: `${(compra / total) * 100}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden className="size-2.5 rounded-xs bg-series-1" />
                Compra de autos
              </dt>
              <dd className="mt-1 text-xl font-semibold">{fmtQCorto(compra)}</dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden className="size-2.5 rounded-xs bg-series-2" />
                Otros gastos
              </dt>
              <dd className="mt-1 text-xl font-semibold">{fmtQCorto(totalOtros)}</dd>
            </div>
          </dl>
          {otros.length > 0 && (
            <>
              <h3 className="mt-6 mb-3 border-t pt-4 text-sm font-medium text-foreground">Otros gastos</h3>
              <BarList
                tono="bg-series-2"
                items={otros.map((g) => ({ etiqueta: g.etiqueta, valor: g.monto, texto: fmtQCorto(g.monto) }))}
              />
            </>
          )}
        </>
      )}
    </Panel>
  )
}

// ------------------------------------------------------------------ Filas de autos con barra

function FilaAuto({
  id,
  nombre,
  valor,
  barra,
  tono,
  tonoValor,
}: {
  id: string
  nombre: string
  valor: string
  /** Proporción 0–1 del ancho de la barra */
  barra: number
  tono: string
  tonoValor?: string
}) {
  return (
    <li>
      <Link
        to="/inventario/$id"
        params={{ id }}
        className="group -mx-2 flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-foreground">{nombre}</span>
            <span className={cn('text-sm font-semibold whitespace-nowrap', tonoValor)}>{valor}</span>
          </span>
          <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-xs bg-muted">
            <span className={cn('block h-full rounded-xs', tono)} style={{ width: `${Math.max(2, barra * 100)}%` }} />
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
      </Link>
    </li>
  )
}

// ------------------------------------------------------------------ Autos vendidos

function ListaVendidos({ titulo, filas, maximo }: { titulo: string; filas: FilaVendido[]; maximo: number }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-sm font-medium text-muted-foreground">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Sin autos para mostrar.</p>
      ) : (
        <ul>
          {filas.map((f) => (
            <FilaAuto
              key={f.id}
              id={f.id}
              nombre={f.nombre}
              valor={f.ganancia < 0 ? `−${fmtQ(-f.ganancia)}` : fmtQ(f.ganancia)}
              barra={maximo ? Math.abs(f.ganancia) / maximo : 0}
              tono={f.ganancia < 0 ? 'bg-bad-fill' : 'bg-brand-600 dark:bg-brand-400'}
              tonoValor={f.ganancia < 0 ? 'text-bad-text' : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AutosVendidos({ data }: { data: ResumenData }) {
  const { masRentables, menosRentables } = data
  const maximo = Math.max(0, ...[...masRentables, ...menosRentables].map((f) => Math.abs(f.ganancia)))
  return (
    <Panel titulo="Ganancia por auto vendido">
      {masRentables.length === 0 ? (
        <SinDatos>No se vendió ningún auto en este período.</SinDatos>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <ListaVendidos titulo="Los que más dejaron" filas={masRentables} maximo={maximo} />
          <ListaVendidos titulo="Los que menos dejaron" filas={menosRentables} maximo={maximo} />
        </div>
      )}
    </Panel>
  )
}

// ------------------------------------------------------------------ Autos con muchos días

function AutosAtrasados({ data }: { data: ResumenData }) {
  const { atrasados, listaAtrasados } = data.sinVender
  const maxDias = Math.max(0, ...listaAtrasados.map((f) => f.dias))

  return (
    <Panel
      titulo={`Más de ${DIAS_ALERTA} días sin venderse`}
      acciones={
        atrasados.unidades > 0 ? (
          <Link
            to="/inventario"
            search={{ fase: 'predio', orden: 'dias' }}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver todos
          </Link>
        ) : undefined
      }
    >
      {atrasados.unidades === 0 ? (
        <SinDatos>Ningún auto lleva más de {DIAS_ALERTA} días en el predio.</SinDatos>
      ) : (
        <>
          <dl className="mb-3 grid grid-cols-2 gap-3 border-b pb-3">
            <div>
              <dt className="text-xs text-muted-foreground">Autos</dt>
              <dd className="mt-1 text-xl font-semibold text-bad-text">{fmtEntero(atrasados.unidades)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Dinero detenido</dt>
              <dd className="mt-1 text-xl font-semibold">{fmtQCorto(atrasados.invertido)}</dd>
            </div>
          </dl>
          <ul>
            {listaAtrasados.map((f: FilaSinVender) => (
              <FilaAuto
                key={f.id}
                id={f.id}
                nombre={f.nombre}
                valor={fmtDias(f.dias)}
                barra={maxDias ? f.dias / maxDias : 0}
                tono="bg-warn-fill"
              />
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}
