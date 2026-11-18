import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, FileText, LayoutGrid, List, Plus, Search } from 'lucide-react'
import type { FilaInventario } from '@/api/endpoints'
import { inventarioQuery, useRestablecerDatos } from '@/api/queries'
import { DIAS_ALERTA, nombreVehiculo } from '@/api/tipos'
import { ErrorCarga, EsqueletoPagina, SinDatos } from '@/components/estados'
import { FiltroSelect } from '@/components/filter-bar'
import { EtiquetaConsignacion, EtiquetaFase } from '@/components/inventario/fase'
import { FotoVehiculo } from '@/components/inventario/foto'
import { DialogoCompra } from '@/components/inventario/formularios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  FASES_FILTRO,
  faseReporteDe,
  guardarVista,
  INVENTARIO_SIN_URL,
  ORDENES,
  recordarListaInventario,
  POR_PAGINA,
  validarInventario,
  type FiltrosInventario,
  type Vista,
} from '@/lib/filtros'
import { fmtDias, fmtEntero, fmtFecha, fmtQ } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/inventario/')({
  validateSearch: validarInventario,
  search: { middlewares: [stripSearchParams(INVENTARIO_SIN_URL)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(inventarioQuery(deps))
  },
  component: Inventario,
})

const OPC_ORDEN = ORDENES.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))

function Inventario() {
  const filtros = Route.useSearch()
  const navigate = useNavigate({ from: '/inventario/' })
  const [compraAbierta, setCompraAbierta] = useState(false)
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery(inventarioQuery(filtros))

  // Recuerda la vista y la lista actual para volver a ellas desde el detalle.
  useEffect(() => {
    guardarVista(filtros.vista)
    recordarListaInventario(filtros)
  }, [filtros])

  const cambiar = (parcial: Partial<FiltrosInventario>) =>
    navigate({ search: (prev) => ({ ...prev, pagina: 1, ...parcial }), replace: true })

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada vehículo con lo que costó, lo que se le ha gastado y lo que dejó al venderse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9">
            <Link to="/inventario/reporte" search={{ fase: faseReporteDe(filtros.fase) }}>
              <FileText aria-hidden />
              Reporte PDF
            </Link>
          </Button>
          <Button className="h-9" onClick={() => setCompraAbierta(true)}>
            <Plus aria-hidden />
            Registrar ingreso
          </Button>
        </div>
        <DialogoCompra
          abierto={compraAbierta}
          onCambio={setCompraAbierta}
          onGuardado={(id) => void navigate({ to: '/inventario/$id', params: { id } })}
        />
      </div>

      <nav aria-label="Fase del vehículo" className="-mb-px flex gap-5 overflow-x-auto border-b">
        {FASES_FILTRO.map((f) => {
          const activa = filtros.fase === f.valor
          return (
            <Link
              key={f.valor}
              from="/inventario/"
              to="."
              search={(prev) => ({ ...prev, fase: f.valor, pagina: 1 })}
              replace
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'shrink-0 border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                activa
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {f.etiqueta}
              {data && <span className="ml-1.5 font-normal text-muted-foreground">{fmtEntero(data.conteos[f.valor])}</span>}
            </Link>
          )
        })}
      </nav>

      <div role="group" aria-label="Buscar y ordenar" className="mt-4 mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <Buscador valor={filtros.q} onCambio={(q) => cambiar({ q })} />
        <FiltroSelect
          etiqueta="Ordenar por"
          valor={filtros.orden}
          opciones={OPC_ORDEN}
          onCambio={(v) => cambiar({ orden: v as FiltrosInventario['orden'] })}
        />
        <SelectorVista vista={filtros.vista} />
      </div>

      {isPending ? (
        <EsqueletoPagina tarjetas={0} bloques={['h-[760px]']} />
      ) : isError ? (
        <ErrorCarga onReintentar={() => void refetch()} />
      ) : data.total === 0 ? (
        <SinDatos>
          {filtros.q
            ? `Ningún vehículo coincide con “${filtros.q}”. Revisa la búsqueda o cambia de pestaña.`
            : 'No hay vehículos en esta pestaña.'}
        </SinDatos>
      ) : (
        <div aria-busy={isPlaceholderData} className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
          {filtros.vista === 'tarjetas' ? (
            <>
              <Tarjetas filas={data.filas} />
              <Paginacion pagina={data.pagina} paginas={data.paginas} total={data.total} className="mt-4 rounded-lg border bg-card" />
            </>
          ) : (
            <div className="rounded-lg border bg-card">
              <TablaInventario filas={data.filas} sinVender={filtros.fase !== 'vendido' && filtros.fase !== 'todos'} />
              <Paginacion pagina={data.pagina} paginas={data.paginas} total={data.total} className="border-t" />
            </div>
          )}
        </div>
      )}

      <Restablecer />
    </>
  )
}

// ------------------------------------------------------------------ Búsqueda

function Buscador({ valor, onCambio }: { valor: string; onCambio: (q: string) => void }) {
  const id = useId()
  const [texto, setTexto] = useState(valor)

  // Espera a que se deje de escribir antes de buscar.
  useEffect(() => {
    if (texto.trim() === valor) return
    const t = setTimeout(() => onCambio(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto, valor, onCambio])

  return (
    <div className="flex min-w-0 flex-col gap-1 sm:w-72">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Buscar
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          id={id}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Marca, modelo, placa o VIN"
          autoComplete="off"
          className="pl-8"
        />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Tabla

function Dias({ fila }: { fila: FilaInventario }) {
  const atrasado = fila.fase !== 'vendido' && fila.dias > DIAS_ALERTA
  return (
    <span className={cn(atrasado && 'font-medium text-bad-text')}>
      {fmtDias(fila.dias)}
      {atrasado && <span className="sr-only">, más de {DIAS_ALERTA} días sin venderse</span>}
    </span>
  )
}

function Ganancia({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-subtle-foreground">—</span>
  return valor < 0 ? (
    <span className="text-bad-text">−{fmtQ(-valor)}</span>
  ) : (
    <span className="font-medium">{fmtQ(valor)}</span>
  )
}

const guion = <span className="text-subtle-foreground">—</span>

/** Venta real o, si aún no se vende, el precio pedido (solo en pestañas de autos sin vender). */
const precioDe = (f: FilaInventario, sinVender: boolean) =>
  f.venta ? f.venta.precio : sinVender ? f.precioPedido : null
const gananciaDe = (f: FilaInventario, sinVender: boolean) =>
  f.ganancia ?? (sinVender && f.precioPedido !== null ? f.precioPedido - f.costoTotal : null)

/**
 * Con autos sin vender, las dos últimas columnas muestran el precio pedido
 * y la ganancia esperada; con vendidos, la venta y la ganancia real.
 */
function TablaInventario({ filas, sinVender }: { filas: FilaInventario[]; sinVender: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Vehículo</TableHead>
          <TableHead className="max-md:hidden">Estado</TableHead>
          <TableHead className="text-right max-md:hidden">Días</TableHead>
          <TableHead className="text-right max-lg:hidden">Compra</TableHead>
          <TableHead className="text-right max-lg:hidden">Gastos</TableHead>
          <TableHead className="text-right">Costo total</TableHead>
          <TableHead className="text-right max-sm:hidden">{sinVender ? 'Precio pedido' : 'Venta'}</TableHead>
          <TableHead className="pr-4 text-right">
            {sinVender ? (
              <>
                Ganancia<span className="max-sm:sr-only"> esperada</span>
              </>
            ) : (
              'Ganancia'
            )}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => (
          <TableRow key={f.id} className="relative">
            <TableCell className="min-w-44 pl-4 whitespace-normal">
              <Link
                to="/inventario/$id"
                params={{ id: f.id }}
                className="font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
              >
                {nombreVehiculo(f)}
              </Link>
              <span className="block text-xs text-muted-foreground">
                {f.placa || 'Sin placa'}, {f.modalidad === 'consignacion' ? 'en consignación desde' : 'comprado'} el{' '}
                {fmtFecha(f.fechaCompra)}
              </span>
              <span className="mt-1 flex items-center gap-2 text-xs md:hidden">
                <EtiquetaFase fase={f.fase} />
                <Dias fila={f} />
              </span>
            </TableCell>
            <TableCell className="max-md:hidden">
              <EtiquetaFase fase={f.fase} />
            </TableCell>
            <TableCell className="text-right max-md:hidden">
              <Dias fila={f} />
            </TableCell>
            <TableCell className="text-right max-lg:hidden">{fmtQ(f.precioCompra)}</TableCell>
            <TableCell className="text-right max-lg:hidden">{fmtQ(f.totalGastos)}</TableCell>
            <TableCell className="text-right font-medium">{fmtQ(f.costoTotal)}</TableCell>
            <TableCell className="text-right max-sm:hidden">
              {precioDe(f, sinVender) !== null ? fmtQ(precioDe(f, sinVender)!) : guion}
            </TableCell>
            <TableCell className="pr-4 text-right">
              <Ganancia valor={gananciaDe(f, sinVender)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ------------------------------------------------------------------ Vista: tabla o tarjetas

function SelectorVista({ vista }: { vista: Vista }) {
  const opciones = [
    { valor: 'tabla' as const, etiqueta: 'Tabla', Icono: List },
    { valor: 'tarjetas' as const, etiqueta: 'Tarjetas', Icono: LayoutGrid },
  ]
  return (
    <div className="flex flex-col gap-1 sm:ml-auto">
      <span className="text-xs text-muted-foreground" id="etiqueta-vista">
        Ver como
      </span>
      <div role="group" aria-labelledby="etiqueta-vista" className="inline-flex h-9 rounded-sm border bg-card p-0.5">
        {opciones.map(({ valor, etiqueta, Icono }) => (
          <Link
            key={valor}
            from="/inventario/"
            to="."
            search={(prev) => ({ ...prev, vista: valor })}
            replace
            aria-current={vista === valor ? 'true' : undefined}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xs px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              vista === valor ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-100' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icono className="size-4" aria-hidden />
            {etiqueta}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** En tarjetas, cada auto muestra su propio precio: el de venta o, si no se ha vendido, el pedido. */
function Tarjetas({ filas }: { filas: FilaInventario[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filas.map((f) => {
        const nombre = nombreVehiculo(f)
        const precio = precioDe(f, true)
        const ganancia = gananciaDe(f, true)
        return (
          <li key={f.id}>
            <Link
              to="/inventario/$id"
              params={{ id: f.id }}
              className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-neutral-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <FotoVehiculo id={f.id} carroceria={f.carroceria} nombre={nombre} className="aspect-[16/10] border-b" />
              <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-base font-semibold text-foreground group-hover:text-primary">{nombre}</h2>
                  <EtiquetaFase fase={f.fase} className="mt-0.5" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {[f.placa || 'Sin placa', f.ficha.color, `${fmtEntero(f.ficha.kilometraje)} km`].join(', ')}
                </p>
                {f.modalidad === 'consignacion' && <EtiquetaConsignacion className="mt-2 self-start" />}

                <dl className="mt-auto grid grid-cols-2 gap-3 pt-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">{f.venta ? 'Vendido en' : 'Precio'}</dt>
                    <dd className="mt-0.5 text-lg font-semibold">
                      {precio !== null ? fmtQ(precio) : <span className="text-sm font-normal text-subtle-foreground">Sin precio aún</span>}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs text-muted-foreground">Costó</dt>
                    <dd className="mt-0.5 text-lg">{fmtQ(f.costoTotal)}</dd>
                  </div>
                </dl>
                <p className="mt-3 flex items-baseline justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
                  {ganancia !== null ? (
                    <span>
                      {f.venta ? 'Ganancia' : 'Ganancia esperada'}{' '}
                      <span className="text-sm">
                        <Ganancia valor={ganancia} />
                      </span>
                    </span>
                  ) : (
                    <span>Comprado el {fmtFecha(f.fechaCompra)}</span>
                  )}
                  <Dias fila={f} />
                </p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Paginacion({ pagina, paginas, total, className }: { pagina: number; paginas: number; total: number; className?: string }) {
  const desde = (pagina - 1) * POR_PAGINA + 1
  const hasta = Math.min(pagina * POR_PAGINA, total)
  const boton = 'inline-flex h-9 items-center gap-1 rounded-sm border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
  const inactivo = 'pointer-events-none opacity-50'
  return (
    <nav aria-label="Páginas" className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3', className)}>
      <p className="text-sm text-muted-foreground">
        {fmtEntero(desde)} a {fmtEntero(hasta)} de {fmtEntero(total)} vehículos
      </p>
      <div className="flex gap-2">
        <Link
          from="/inventario/"
          to="."
          search={(prev) => ({ ...prev, pagina: pagina - 1 })}
          aria-disabled={pagina <= 1}
          tabIndex={pagina <= 1 ? -1 : undefined}
          className={cn(boton, pagina <= 1 && inactivo)}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Anterior
        </Link>
        <Link
          from="/inventario/"
          to="."
          search={(prev) => ({ ...prev, pagina: pagina + 1 })}
          aria-disabled={pagina >= paginas}
          tabIndex={pagina >= paginas ? -1 : undefined}
          className={cn(boton, pagina >= paginas && inactivo)}
        >
          Siguiente
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </nav>
  )
}

// ------------------------------------------------------------------ Datos de ejemplo

function Restablecer() {
  const [abierto, setAbierto] = useState(false)
  const restablecer = useRestablecerDatos()
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
      <p>Mientras no se conecte el sistema, lo que registres se guarda solo en este navegador.</p>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger asChild>
          <Button variant="link" className="h-auto p-0 text-xs">
            Restablecer datos de ejemplo
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Restablecer los datos de ejemplo?</DialogTitle>
            <DialogDescription>
              Se borran las compras, gastos y ventas que registraste en este navegador. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="h-9">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="h-9"
              disabled={restablecer.isPending}
              onClick={() => restablecer.mutate(undefined, { onSuccess: () => setAbierto(false) })}
            >
              {restablecer.isPending ? 'Restableciendo…' : 'Restablecer datos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
