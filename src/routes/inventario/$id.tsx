import { useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Camera, ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  fotoQuery,
  useAsignarCliente,
  useEliminarGasto,
  useGuardarFoto,
  useQuitarFoto,
  vehiculoQuery,
} from '@/api/queries'
import type { DetalleVehiculo } from '@/api/endpoints'
import {
  DIA,
  DIAS_ALERTA,
  etiquetaGasto,
  etiquetaModalidad,
  nombreVehiculo,
  type Cliente,
  type VehiculoConTotales,
} from '@/api/tipos'
import { DialogoCliente, SelectorCliente, TarjetaCliente } from '@/components/clientes/clientes'
import { Anotaciones } from '@/components/inventario/anotaciones'
import { ErrorCarga, EsqueletoPagina } from '@/components/estados'
import { EtiquetaConsignacion, EtiquetaFase } from '@/components/inventario/fase'
import { FotoVehiculo } from '@/components/inventario/foto'
import { Dialogo, DialogoALaVenta, DialogoFicha, DialogoGasto, DialogoVenta } from '@/components/inventario/formularios'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtDias, fmtEntero, fmtFecha, fmtQ } from '@/lib/format'
import { listaInventario } from '@/lib/filtros'
import { mensajeDeError } from '@/lib/formulario'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/inventario/$id')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(vehiculoQuery(params.id))
  },
  component: Detalle,
})

type Dialogo = 'gasto' | 'a-la-venta' | 'venta' | 'ficha' | 'proveedor' | 'comprador' | null

function Detalle() {
  const { id } = Route.useParams()
  const { data: v, isPending, isError, refetch } = useQuery(vehiculoQuery(id))
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const cerrar = (abierto: boolean) => !abierto && setDialogo(null)

  return (
    <>
      <Link
        to="/inventario"
        search={listaInventario()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Inventario
      </Link>

      {isPending ? (
        <EsqueletoPagina tarjetas={0} bloques={['h-[72px]', 'h-[140px]', 'h-[220px]', 'h-[320px]']} />
      ) : isError ? (
        <ErrorCarga onReintentar={() => void refetch()} />
      ) : !v ? (
        <div className="rounded-lg border bg-card px-5 py-10 text-center">
          <h1 className="text-base font-semibold">No encontramos este vehículo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Puede que se haya borrado al restablecer los datos.</p>
          <Link to="/inventario" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Volver al inventario
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Encabezado v={v} onAccion={setDialogo} />
          <Cuentas v={v} />
          <Recorrido v={v} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Ficha v={v} onEditar={() => setDialogo('ficha')} />
            <Clientes v={v} onCambiar={setDialogo} />
          </div>
          <Anotaciones vehiculoId={v.id} notas={v.notas} />
          <Gastos v={v} onAgregar={() => setDialogo('gasto')} />

          {/* Se montan solo al abrirse: cada vez empiezan con valores frescos. */}
          {dialogo === 'gasto' && <DialogoGasto vehiculo={v} abierto onCambio={cerrar} />}
          {dialogo === 'a-la-venta' && <DialogoALaVenta vehiculo={v} abierto onCambio={cerrar} />}
          {dialogo === 'venta' && <DialogoVenta vehiculo={v} abierto onCambio={cerrar} />}
          {dialogo === 'ficha' && <DialogoFicha vehiculo={v} abierto onCambio={cerrar} />}
          {(dialogo === 'proveedor' || dialogo === 'comprador') && (
            <DialogoAsignar v={v} rol={dialogo} onCambio={cerrar} />
          )}
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------ Encabezado

function Encabezado({ v, onAccion }: { v: VehiculoConTotales; onAccion: (d: Dialogo) => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <Foto v={v} />
      <div className="flex min-w-0 flex-1 flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{nombreVehiculo(v)}</h1>
            <EtiquetaFase fase={v.fase} />
            {v.modalidad === 'consignacion' && <EtiquetaConsignacion />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[v.placa || 'Sin placa', v.carroceria, v.ficha.color].join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.fase === 'preparacion' && (
            <Button className="h-9" onClick={() => onAccion('a-la-venta')}>
              Poner a la venta
            </Button>
          )}
          {v.fase === 'disponible' && (
            <Button className="h-9" onClick={() => onAccion('venta')}>
              Registrar venta
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Foto({ v }: { v: VehiculoConTotales }) {
  const entrada = useRef<HTMLInputElement>(null)
  const { data: foto } = useQuery(fotoQuery(v.id))
  const guardar = useGuardarFoto(v.id)
  const quitar = useQuitarFoto(v.id)
  const ocupado = guardar.isPending || quitar.isPending

  return (
    <div className="w-full shrink-0 sm:w-64">
      <FotoVehiculo id={v.id} carroceria={v.carroceria} nombre={nombreVehiculo(v)} className="rounded-lg border" />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const archivo = e.target.files?.[0]
            e.target.value = ''
            if (archivo) guardar.mutate(archivo)
          }}
        />
        <Button variant="link" className="h-auto gap-1.5 p-0 text-sm" disabled={ocupado} onClick={() => entrada.current?.click()}>
          <Camera aria-hidden />
          {guardar.isPending ? 'Guardando foto…' : foto ? 'Cambiar foto' : 'Agregar foto'}
        </Button>
        {foto && (
          <Button
            variant="link"
            className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
            disabled={ocupado}
            onClick={() => quitar.mutate()}
          >
            Quitar
          </Button>
        )}
      </div>
      {guardar.isError && (
        <p role="alert" className="mt-1 text-xs font-medium text-bad-text">
          {mensajeDeError(guardar.error)}
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Cuentas del vehículo

function Celda({ etiqueta, children, nota }: { etiqueta: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-4 py-4 sm:px-5">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 text-xl font-semibold">{children}</dd>
      {nota && <dd className="mt-0.5 text-xs text-muted-foreground">{nota}</dd>}
    </div>
  )
}

function Cuentas({ v }: { v: VehiculoConTotales }) {
  const nGastos = v.gastos.length
  const proyectada = v.precioPedido !== null ? v.precioPedido - v.costoTotal : null

  return (
    <section aria-labelledby="titulo-cuentas" className="overflow-hidden rounded-lg border bg-border">
      <h2 id="titulo-cuentas" className="sr-only">
        Cuentas del vehículo
      </h2>
      {/* gap-px sobre fondo de borde: líneas finas entre celdas en cualquier número de columnas */}
      <dl className="grid grid-cols-2 gap-px lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.3fr)]">
        <Celda etiqueta={v.modalidad === 'consignacion' ? 'Acordado con el dueño' : 'Compra'} nota={fmtFecha(v.fechaCompra)}>
          {fmtQ(v.precioCompra)}
        </Celda>
        <Celda etiqueta="Gastos" nota={nGastos === 1 ? '1 gasto' : `${nGastos} gastos`}>
          {fmtQ(v.totalGastos)}
        </Celda>
        <Celda etiqueta="Costo total" nota={v.modalidad === 'consignacion' ? 'Lo acordado más gastos' : 'Compra más gastos'}>
          {fmtQ(v.costoTotal)}
        </Celda>
        {v.venta ? (
          <Celda etiqueta="Venta" nota={fmtFecha(v.venta.fecha)}>
            {fmtQ(v.venta.precio)}
          </Celda>
        ) : (
          <Celda etiqueta="Precio pedido" nota={v.precioPedido === null ? 'Se define al ponerlo a la venta' : undefined}>
            {v.precioPedido === null ? <span className="text-subtle-foreground">—</span> : fmtQ(v.precioPedido)}
          </Celda>
        )}
        <div className="col-span-2 min-w-0 bg-card px-4 py-4 sm:px-5 lg:col-span-1 lg:bg-neutral-50">
          {v.ganancia !== null ? (
            <>
              <dt className="text-sm text-muted-foreground">{v.ganancia < 0 ? 'Pérdida' : 'Ganancia'}</dt>
              <dd className={cn('mt-1 text-kpi-sm font-semibold', v.ganancia < 0 && 'text-bad-text')}>
                {fmtQ(Math.abs(v.ganancia))}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">Venta menos costo total</dd>
            </>
          ) : (
            <>
              <dt className="text-sm text-muted-foreground">Ganancia esperada</dt>
              <dd className={cn('mt-1 text-kpi-sm font-semibold', proyectada !== null && proyectada < 0 && 'text-bad-text')}>
                {proyectada === null ? <span className="text-subtle-foreground">—</span> : fmtQ(proyectada)}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {proyectada === null ? 'Aún en preparación' : 'Si se vende al precio pedido, sin contar comisión'}
              </dd>
            </>
          )}
        </div>
      </dl>
    </section>
  )
}

// ------------------------------------------------------------------ Recorrido (fases)

type EstadoPaso = 'hecho' | 'actual' | 'pendiente'

function Paso({
  n,
  titulo,
  estado,
  children,
}: {
  n: number
  titulo: string
  estado: EstadoPaso
  children: ReactNode
}) {
  const hecho = estado === 'hecho'
  return (
    <li className="relative min-w-0 pl-9 sm:pl-0">
      <div className="flex items-center gap-3 max-sm:absolute max-sm:top-0 max-sm:left-0">
        <span
          aria-hidden
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            hecho && 'bg-brand-600 text-white',
            estado === 'actual' && 'border-2 border-brand-600 text-brand-700',
            estado === 'pendiente' && 'border border-border-strong text-muted-foreground',
          )}
        >
          {n}
        </span>
        <span aria-hidden className={cn('h-px flex-1 max-sm:hidden', hecho ? 'bg-brand-600' : 'bg-border')} />
      </div>
      <h3 className={cn('text-sm font-semibold sm:mt-3', estado === 'pendiente' && 'text-muted-foreground')}>
        {titulo}
        {estado === 'actual' && <span className="font-normal text-brand-700">, en curso</span>}
        {estado === 'pendiente' && <span className="font-normal">, pendiente</span>}
      </h3>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </li>
  )
}

function Recorrido({ v }: { v: VehiculoConTotales }) {
  const [ahora] = useState(() => Date.now())
  const finPrep = v.fechaDisponible ?? v.venta?.fecha ?? null
  const diasPrep = Math.max(0, Math.floor(((finPrep ?? ahora) - v.fechaCompra) / DIA))
  // Gastos de preparación: todo menos lo que se gasta para vender (publicidad y comisión).
  const gastosPrep = v.gastos
    .filter((g) => g.tipo !== 'comision' && g.tipo !== 'publicidad')
    .reduce((s, g) => s + g.monto, 0)
  const diasVenta =
    v.fechaDisponible !== null ? Math.max(0, Math.floor(((v.venta?.fecha ?? ahora) - v.fechaDisponible) / DIA)) : 0
  const atrasado = !v.venta && v.dias > DIAS_ALERTA
  const orden = { preparacion: 2, disponible: 3, vendido: 5 }[v.fase]
  const estado = (n: number): EstadoPaso => (n < orden ? 'hecho' : n === orden ? 'actual' : 'pendiente')

  return (
    <Panel titulo="Recorrido" descripcion={v.modalidad === 'consignacion' ? 'Desde que ingresó hasta que se vende.' : 'Desde que se compró hasta que se vende.'}>
      <ol className="grid gap-5 sm:grid-cols-4 sm:gap-3">
        <Paso n={1} titulo={v.modalidad === 'consignacion' ? 'Ingreso en consignación' : 'Compra'} estado="hecho">
          <p>{fmtFecha(v.fechaCompra)}</p>
          <p>{fmtQ(v.precioCompra)}</p>
        </Paso>
        <Paso n={2} titulo="Preparación" estado={estado(2)}>
          <p>{finPrep !== null ? `${fmtDias(diasPrep)}, hasta el ${fmtFecha(finPrep)}` : `${fmtDias(diasPrep)} hasta hoy`}</p>
          <p>{fmtQ(gastosPrep)} en gastos</p>
        </Paso>
        <Paso n={3} titulo="A la venta" estado={estado(3)}>
          {v.fechaDisponible !== null ? (
            <>
              <p>Desde el {fmtFecha(v.fechaDisponible)}</p>
              <p className={cn(atrasado && 'font-medium text-bad-text')}>
                {v.venta ? `Se vendió en ${fmtDias(diasVenta)}` : `${fmtDias(diasVenta)} esperando comprador`}
              </p>
            </>
          ) : (
            <p>Cuando termine la preparación</p>
          )}
        </Paso>
        <Paso n={4} titulo="Venta" estado={estado(4)}>
          {v.venta ? (
            <>
              <p>
                {fmtFecha(v.venta.fecha)}, {fmtQ(v.venta.precio)}
              </p>
              <p>
                {v.venta.vendedor}, {v.venta.formaPago.toLowerCase()}
              </p>
            </>
          ) : (
            <p>{fmtDias(v.dias)} desde la compra</p>
          )}
        </Paso>
      </ol>
    </Panel>
  )
}

// ------------------------------------------------------------------ Ficha técnica

function Ficha({ v, onEditar }: { v: VehiculoConTotales; onEditar: () => void }) {
  const sinDato = (t: string) => t || <span className="text-subtle-foreground">Sin registrar</span>
  const filas: [string, ReactNode][] = [
    ['Marca', v.marca],
    ['Modelo', v.modelo],
    ['Año', v.anio],
    ['Color', v.ficha.color],
    ['Combustible', v.ficha.combustible],
    ['Kilometraje', `${fmtEntero(v.ficha.kilometraje)} km`],
    ['Carrocería', v.carroceria],
    ['Placa', sinDato(v.placa)],
    ['VIN', <span className="font-mono text-[13px] tracking-wide">{sinDato(v.ficha.vin)}</span>],
    ['Número de motor', sinDato(v.ficha.numeroMotor)],
    ['Modalidad', etiquetaModalidad(v.modalidad)],
  ]
  return (
    <Panel
      titulo="Ficha técnica"
      acciones={
        <Button variant="outline" className="h-9" onClick={onEditar}>
          <Pencil aria-hidden />
          Editar
        </Button>
      }
    >
      <dl className="grid gap-x-6 sm:grid-cols-2">
        {filas.map(([k, val]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b py-2 text-sm">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 truncate text-right font-medium">{val}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

// ------------------------------------------------------------------ Clientes del vehículo

function Clientes({ v, onCambiar }: { v: DetalleVehiculo; onCambiar: (d: Dialogo) => void }) {
  const consignacion = v.modalidad === 'consignacion'
  const cambiar = (rol: 'proveedor' | 'comprador', hay: boolean) => (
    <Button variant="link" className="h-auto p-0 text-sm" onClick={() => onCambiar(rol)}>
      {hay ? 'Cambiar' : 'Asignar'}
    </Button>
  )
  return (
    <Panel titulo="Clientes">
      <div className="flex flex-col gap-5">
        <TarjetaCliente
          rol={consignacion ? 'Dueño (en consignación)' : 'Se le compró a'}
          cliente={v.proveedor}
          vacio="Sin registrar."
          accion={cambiar('proveedor', !!v.proveedor)}
        />
        <div className="border-t pt-5">
          <TarjetaCliente
            rol="Lo compró"
            cliente={v.comprador}
            vacio={v.venta ? 'Sin registrar.' : 'Todavía no se vende. El comprador se elige al registrar la venta.'}
            accion={v.venta ? cambiar('comprador', !!v.comprador) : undefined}
          />
        </div>
      </div>
    </Panel>
  )
}

function DialogoAsignar({
  v,
  rol,
  onCambio,
}: {
  v: DetalleVehiculo
  rol: 'proveedor' | 'comprador'
  onCambio: (abierto: boolean) => void
}) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [editar, setEditar] = useState(false)
  const asignar = useAsignarCliente(v.id, rol)
  const actual = rol === 'proveedor' ? v.proveedor : v.comprador
  const etiqueta = rol === 'comprador' ? 'Comprador' : v.modalidad === 'consignacion' ? 'Dueño del vehículo' : 'Se le compró a'

  return (
    <Dialogo
      abierto
      onCambio={onCambio}
      titulo={rol === 'comprador' ? 'Cambiar comprador' : v.modalidad === 'consignacion' ? 'Cambiar dueño' : 'Cambiar a quién se le compró'}
      descripcion={actual ? `Ahora está registrado: ${actual.nombres} ${actual.apellidos}.` : 'Busca al cliente o regístralo.'}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (cliente) asignar.mutate(cliente.id, { onSuccess: () => onCambio(false) })
        }}
      >
        <SelectorCliente id={`asignar-${rol}`} etiqueta={etiqueta} valor={cliente} onCambio={setCliente} />
        {actual && (
          <Button type="button" variant="link" className="h-auto self-start p-0 text-sm" onClick={() => setEditar(true)}>
            O corrige los datos de {actual.nombres}
          </Button>
        )}
        {asignar.error && (
          <p role="alert" className="text-sm text-bad-text">
            {mensajeDeError(asignar.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-9" onClick={() => onCambio(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="h-9" disabled={!cliente || asignar.isPending}>
            {asignar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
      {editar && actual && <DialogoCliente cliente={actual} abierto onCambio={(a) => !a && onCambio(false)} />}
    </Dialogo>
  )
}

// ------------------------------------------------------------------ Gastos

function Gastos({ v, onAgregar }: { v: VehiculoConTotales; onAgregar: () => void }) {
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const eliminar = useEliminarGasto(v.id)
  const gastos = [...v.gastos].reverse()

  return (
    <Panel
      titulo="Gastos"
      descripcion="Todo lo que se ha gastado en este vehículo, además de la compra."
      acciones={
        <Button variant="outline" className="h-9" onClick={onAgregar}>
          <Plus aria-hidden />
          Agregar gasto
        </Button>
      }
    >
      {gastos.length === 0 ? (
        <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay gastos. Registra aquí reparaciones, trámites o publicidad.
        </p>
      ) : (
        <div className="-mx-5">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Fecha</TableHead>
                <TableHead>Gasto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-0 pr-5">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{fmtFecha(g.fecha)}</TableCell>
                  <TableCell>
                    <span className="block font-medium">{etiquetaGasto(g.tipo)}</span>
                    {g.descripcion !== etiquetaGasto(g.tipo) && (
                      <span className="block text-xs text-muted-foreground">{g.descripcion}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{fmtQ(g.monto)}</TableCell>
                  <TableCell className="pr-5 text-right whitespace-nowrap">
                    {confirmar === g.id ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="mr-1 text-xs text-muted-foreground">¿Eliminar?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={eliminar.isPending}
                          onClick={() => eliminar.mutate(g.id, { onSettled: () => setConfirmar(null) })}
                        >
                          Sí, eliminar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmar(null)}>
                          No
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Eliminar gasto: ${g.descripcion}, ${fmtQ(g.monto)}`}
                        onClick={() => setConfirmar(g.id)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell className="pl-5 font-semibold" colSpan={2}>
                  Total de gastos
                </TableCell>
                <TableCell className="text-right font-semibold">{fmtQ(v.totalGastos)}</TableCell>
                <TableCell className="pr-5" />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </Panel>
  )
}
