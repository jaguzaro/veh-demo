import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { MARCAS, VENDEDORES } from '@/api/catalogo'
import {
  useActualizarFicha,
  useAgregarGasto,
  usePonerALaVenta,
  useRegistrarCompra,
  useRegistrarVenta,
} from '@/api/queries'
import {
  CARROCERIAS,
  COLORES,
  COMBUSTIBLES,
  COMISION_SUGERIDA,
  FORMAS_PAGO,
  MODALIDADES,
  TIPOS_GASTO,
  type Carroceria,
  type Cliente,
  type Combustible,
  type FichaTecnica,
  type FormaPago,
  type Modalidad,
  type TipoGasto,
  type Vehiculo,
  type VehiculoConTotales,
} from '@/api/tipos'
import { SelectorCliente } from '@/components/clientes/clientes'
import { validarVin } from '@/lib/validar'
import { Campo, ErrorFormulario } from '@/components/campo'
import { descripcionDe, limpiarAlEditar, mensajeDeError, quitarError, texto, type Errores } from '@/lib/formulario'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { aFechaInput, deFechaInput, fmtEntero, fmtQ, leerMonto } from '@/lib/format'
import { cn } from '@/lib/utils'


// ------------------------------------------------------------------ Piezas comunes

export function Monto({
  id,
  name,
  error,
  value,
  onChange,
  defaultValue,
}: {
  id: string
  name: string
  error?: string
  value?: string
  onChange?: (v: string) => void
  defaultValue?: string
}) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        Q
      </span>
      <Input
        id={id}
        name={name}
        inputMode="decimal"
        autoComplete="off"
        className="pl-7"
        aria-invalid={!!error}
        aria-describedby={descripcionDe(id)}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </div>
  )
}

/** Hoy en formato de fecha; se fija al montar el formulario. */
function useHoy() {
  const [hoy] = useState(() => aFechaInput(Date.now()))
  return hoy
}

function Fecha({ id, name, error, min }: { id: string; name: string; error?: string; min?: string }) {
  const hoy = useHoy()
  return (
    <Input
      id={id}
      name={name}
      type="date"
      defaultValue={hoy}
      min={min}
      max={hoy}
      aria-invalid={!!error}
      aria-describedby={descripcionDe(id)}
    />
  )
}

export function Opciones({
  id,
  name,
  defaultValue,
  opciones,
  error,
  placeholder,
}: {
  id: string
  name: string
  defaultValue?: string
  opciones: { valor: string; etiqueta: string }[]
  error?: string
  placeholder?: string
}) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id} className="h-9 w-full bg-card" aria-invalid={!!error} aria-describedby={descripcionDe(id)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Resumen de cuentas dentro de un formulario (p. ej. "Ganarías Q 12,000"). */
function Cuenta({ filas }: { filas: { etiqueta: string; valor: ReactNode; fuerte?: boolean }[] }) {
  return (
    <dl className="rounded-sm border bg-muted/50 px-3 py-2 text-sm">
      {filas.map((f) => (
        <div key={f.etiqueta} className={cn('flex justify-between gap-4 py-0.5', f.fuerte && 'mt-1 border-t pt-1.5 font-semibold')}>
          <dt className={f.fuerte ? 'text-foreground' : 'text-muted-foreground'}>{f.etiqueta}</dt>
          <dd>{f.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Dialogo({
  abierto,
  onCambio,
  titulo,
  descripcion,
  ancho = 'sm:max-w-md',
  children,
}: {
  abierto: boolean
  onCambio: (v: boolean) => void
  titulo: string
  descripcion: string
  ancho?: string
  children: ReactNode
}) {
  return (
    <Dialog open={abierto} onOpenChange={onCambio}>
      <DialogContent className={ancho}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function Botones({ guardando, texto }: { guardando: boolean; texto: string }) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="outline" className="h-9">
          Cancelar
        </Button>
      </DialogClose>
      <Button type="submit" className="h-9" disabled={guardando}>
        {guardando ? 'Guardando…' : texto}
      </Button>
    </DialogFooter>
  )
}

/** Valida una fecha del formulario contra la compra y el día de hoy. */
function validarFecha(valor: string, errores: Errores, campo: string, minimo?: number) {
  const fecha = deFechaInput(valor)
  if (fecha === null) errores[campo] = 'Elige una fecha.'
  // La fecha se guarda a mediodía: hoy es válido aunque aún no sean las 12:00.
  else if (fecha > new Date().setHours(23, 59, 59, 999)) errores[campo] = 'La fecha no puede ser futura.'
  else if (minimo !== undefined && fecha < new Date(minimo).setHours(0, 0, 0, 0))
    errores[campo] = 'No puede ser anterior a la fecha de compra.'
  return fecha ?? 0
}

function validarMonto(valor: string, errores: Errores, campo: string, permitirCero = false) {
  const n = leerMonto(valor)
  if (n === null) errores[campo] = 'Escribe un monto en quetzales.'
  else if (n < 0 || (!permitirCero && n === 0)) errores[campo] = 'El monto debe ser mayor que cero.'
  return n ?? 0
}

// ------------------------------------------------------------------ Vehículo y ficha técnica

type DatosVehiculo = Pick<Vehiculo, 'marca' | 'modelo' | 'anio' | 'carroceria' | 'placa'> & { ficha: FichaTecnica }

/** Lee y valida los datos del vehículo (los mismos al comprar y al editar la ficha). */
function leerVehiculo(fd: FormData, err: Errores, anioMax: number): DatosVehiculo {
  const marca = texto(fd, 'marca')
  const modelo = texto(fd, 'modelo')
  const anio = Number(texto(fd, 'anio'))
  const carroceria = texto(fd, 'carroceria') as Carroceria
  const color = texto(fd, 'color')
  const km = Number(texto(fd, 'kilometraje').replace(/[\s,.]/g, ''))
  const vin = validarVin(texto(fd, 'vin'))
  if (!marca) err.marca = 'Escribe la marca.'
  if (!modelo) err.modelo = 'Escribe el modelo.'
  if (!Number.isInteger(anio) || anio < 1980 || anio > anioMax) err.anio = `Escribe un año entre 1980 y ${anioMax}.`
  if (!carroceria) err.carroceria = 'Elige el tipo de carrocería.'
  if (!color) err.color = 'Escribe el color.'
  if (!texto(fd, 'kilometraje') || !Number.isInteger(km) || km < 0 || km >= 2_000_000)
    err.kilometraje = 'Escribe los kilómetros que marca el tablero.'
  if (!vin.ok) err.vin = vin.error
  return {
    marca,
    modelo,
    anio,
    carroceria,
    placa: texto(fd, 'placa'),
    ficha: {
      color,
      combustible: (texto(fd, 'combustible') || 'Gasolina') as Combustible,
      kilometraje: km,
      vin: vin.ok ? vin.valor : '',
      numeroMotor: texto(fd, 'motor'),
    },
  }
}

function CamposVehiculo({ id, errores, inicial }: { id: string; errores: Errores; inicial?: DatosVehiculo }) {
  const campo = (nombre: string, extra?: Partial<React.ComponentProps<'input'>>) => (
    <Input
      id={`${id}-${nombre}`}
      name={nombre}
      autoComplete="off"
      aria-invalid={!!errores[nombre]}
      aria-describedby={descripcionDe(`${id}-${nombre}`)}
      {...extra}
    />
  )
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo id={`${id}-marca`} etiqueta="Marca" error={errores.marca}>
        {campo('marca', { list: `${id}-marcas`, defaultValue: inicial?.marca })}
        <datalist id={`${id}-marcas`}>
          {MARCAS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Campo>
      <Campo id={`${id}-modelo`} etiqueta="Modelo" error={errores.modelo}>
        {campo('modelo', { defaultValue: inicial?.modelo })}
      </Campo>
      <Campo id={`${id}-anio`} etiqueta="Año" error={errores.anio}>
        {campo('anio', { inputMode: 'numeric', defaultValue: inicial?.anio })}
      </Campo>
      <Campo id={`${id}-carroceria`} etiqueta="Carrocería" error={errores.carroceria}>
        <Opciones
          id={`${id}-carroceria`}
          name="carroceria"
          placeholder="Elegir"
          defaultValue={inicial?.carroceria}
          opciones={CARROCERIAS.map((c) => ({ valor: c, etiqueta: c }))}
          error={errores.carroceria}
        />
      </Campo>
      <Campo id={`${id}-color`} etiqueta="Color" error={errores.color}>
        {campo('color', { list: `${id}-colores`, defaultValue: inicial?.ficha.color })}
        <datalist id={`${id}-colores`}>
          {COLORES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Campo>
      <Campo id={`${id}-combustible`} etiqueta="Combustible">
        <Opciones
          id={`${id}-combustible`}
          name="combustible"
          defaultValue={inicial?.ficha.combustible ?? 'Gasolina'}
          opciones={COMBUSTIBLES.map((c) => ({ valor: c, etiqueta: c }))}
        />
      </Campo>
      <Campo id={`${id}-kilometraje`} etiqueta="Kilometraje actual" error={errores.kilometraje}>
        <div className="relative">
          {campo('kilometraje', {
            inputMode: 'numeric',
            className: 'pr-10',
            defaultValue: inicial ? fmtEntero(inicial.ficha.kilometraje) : undefined,
          })}
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            km
          </span>
        </div>
      </Campo>
      <Campo id={`${id}-placa`} etiqueta="Placa" opcional>
        {campo('placa', { className: 'uppercase', defaultValue: inicial?.placa })}
      </Campo>
      <Campo
        id={`${id}-vin`}
        etiqueta="VIN (número de chasis)"
        opcional
        error={errores.vin}
        ayuda="17 caracteres. Está en la tarjeta de circulación y al pie del parabrisas."
      >
        {campo('vin', { className: 'uppercase', maxLength: 20, defaultValue: inicial?.ficha.vin })}
      </Campo>
      <Campo id={`${id}-motor`} etiqueta="Número de motor" opcional ayuda="Grabado en el bloque del motor.">
        {campo('motor', { className: 'uppercase', maxLength: 24, defaultValue: inicial?.ficha.numeroMotor })}
      </Campo>
    </div>
  )
}

/** Propio o en consignación: dos opciones que se ven a la vez. */
function ElegirModalidad({ valor, onCambio }: { valor: Modalidad; onCambio: (m: Modalidad) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">Modalidad de ingreso</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODALIDADES.map((m) => (
          <label
            key={m.valor}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-sm border bg-card px-3 py-2.5 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
              valor === m.valor ? 'border-brand-600 bg-brand-50' : 'hover:border-neutral-400',
            )}
          >
            <input
              type="radio"
              name="modalidad"
              value={m.valor}
              checked={valor === m.valor}
              onChange={() => onCambio(m.valor)}
              className="mt-0.5 accent-brand-600"
            />
            <span className="text-sm">
              <span className="block font-medium">{m.etiqueta}</span>
              <span className="block text-xs text-muted-foreground">
                {m.valor === 'propio' ? 'El predio lo compró y es dueño.' : 'Sigue siendo del dueño; se le paga al venderse.'}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

// ------------------------------------------------------------------ Registrar compra

export function DialogoCompra({
  abierto,
  onCambio,
  onGuardado,
}: {
  abierto: boolean
  onCambio: (v: boolean) => void
  onGuardado: (id: string) => void
}) {
  const id = useId()
  const [errores, setErrores] = useState<Errores>({})
  const [modalidad, setModalidad] = useState<Modalidad>('propio')
  const [proveedor, setProveedor] = useState<Cliente | null>(null)
  const registrar = useRegistrarCompra()
  const [anioMax] = useState(() => new Date().getFullYear() + 1)
  const consignacion = modalidad === 'consignacion'

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const err: Errores = {}
    const vehiculo = leerVehiculo(fd, err, anioMax)
    const fechaCompra = validarFecha(texto(fd, 'fecha'), err, 'fecha')
    const precioCompra = validarMonto(texto(fd, 'precio'), err, 'precio')
    if (!proveedor) err.proveedor = consignacion ? 'Elige o registra al dueño del vehículo.' : 'Elige o registra a quién se le compró.'
    setErrores(err)
    if (Object.keys(err).length || !proveedor) return
    try {
      const nuevo = await registrar.mutateAsync({
        ...vehiculo,
        fechaCompra,
        precioCompra,
        modalidad,
        proveedorId: proveedor.id,
      })
      onCambio(false)
      onGuardado(nuevo)
    } catch {
      // El mensaje se muestra con registrar.error
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      onCambio={(v) => {
        if (!v) {
          setErrores({})
          setProveedor(null)
          setModalidad('propio')
          registrar.reset()
        }
        onCambio(v)
      }}
      titulo="Registrar ingreso"
      descripcion="Agrega un vehículo al inventario con su ficha técnica. Los gastos de preparación se registran después, en su detalle."
      ancho="sm:max-w-2xl"
    >
      <form noValidate onSubmit={enviar} onChange={limpiarAlEditar(setErrores)} className="flex flex-col gap-4">
        <ErrorFormulario mensaje={registrar.error ? mensajeDeError(registrar.error) : null} />
        <Seccion titulo="Ficha técnica">
          <CamposVehiculo id={id} errores={errores} />
        </Seccion>
        <Seccion titulo="Ingreso">
          <ElegirModalidad valor={modalidad} onCambio={setModalidad} />
          <SelectorCliente
            id={`${id}-proveedor`}
            etiqueta={consignacion ? 'Dueño del vehículo' : 'Se le compró a'}
            valor={proveedor}
            onCambio={(c) => {
              setProveedor(c)
              if (c) setErrores(quitarError('proveedor'))
            }}
            error={errores.proveedor}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={`${id}-fecha`} etiqueta={consignacion ? 'Fecha de ingreso' : 'Fecha de compra'} error={errores.fecha}>
              <Fecha id={`${id}-fecha`} name="fecha" error={errores.fecha} />
            </Campo>
            <Campo
              id={`${id}-precio`}
              etiqueta={consignacion ? 'Acordado con el dueño' : 'Precio de compra'}
              error={errores.precio}
              ayuda={consignacion ? 'Lo que se le paga al venderse.' : undefined}
            >
              <Monto id={`${id}-precio`} name="precio" error={errores.precio} />
            </Campo>
          </div>
        </Seccion>
        <Botones guardando={registrar.isPending} texto="Registrar ingreso" />
      </form>
    </Dialogo>
  )
}

// ------------------------------------------------------------------ Editar ficha técnica

export function DialogoFicha({
  vehiculo,
  abierto,
  onCambio,
}: {
  vehiculo: VehiculoConTotales
  abierto: boolean
  onCambio: (v: boolean) => void
}) {
  const id = useId()
  const [errores, setErrores] = useState<Errores>({})
  const [modalidad, setModalidad] = useState<Modalidad>(vehiculo.modalidad)
  const actualizar = useActualizarFicha(vehiculo.id)
  const [anioMax] = useState(() => new Date().getFullYear() + 1)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const err: Errores = {}
    const datos = leerVehiculo(fd, err, anioMax)
    setErrores(err)
    if (Object.keys(err).length) return
    try {
      await actualizar.mutateAsync({ ...datos, modalidad })
      onCambio(false)
    } catch {
      // El mensaje se muestra con actualizar.error
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      onCambio={onCambio}
      titulo="Editar ficha técnica"
      descripcion="Actualiza el kilometraje o corrige los datos del vehículo."
      ancho="sm:max-w-2xl"
    >
      <form noValidate onSubmit={enviar} onChange={limpiarAlEditar(setErrores)} className="flex flex-col gap-4">
        <ErrorFormulario mensaje={actualizar.error ? mensajeDeError(actualizar.error) : null} />
        <CamposVehiculo id={id} errores={errores} inicial={vehiculo} />
        <ElegirModalidad valor={modalidad} onCambio={setModalidad} />
        <Botones guardando={actualizar.isPending} texto="Guardar ficha" />
      </form>
    </Dialogo>
  )
}

// ------------------------------------------------------------------ Agregar gasto

export function DialogoGasto({
  vehiculo,
  abierto,
  onCambio,
}: {
  vehiculo: VehiculoConTotales
  abierto: boolean
  onCambio: (v: boolean) => void
}) {
  const id = useId()
  const [errores, setErrores] = useState<Errores>({})
  const agregar = useAgregarGasto(vehiculo.id)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const err: Errores = {}
    const tipo = texto(fd, 'tipo') as TipoGasto
    if (!tipo) err.tipo = 'Elige el tipo de gasto.'
    const monto = validarMonto(texto(fd, 'monto'), err, 'monto')
    const fecha = validarFecha(texto(fd, 'fecha'), err, 'fecha', vehiculo.fechaCompra)
    setErrores(err)
    if (Object.keys(err).length) return
    try {
      await agregar.mutateAsync({ tipo, monto, fecha, descripcion: texto(fd, 'descripcion') })
      onCambio(false)
    } catch {
      // El mensaje se muestra con agregar.error
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      onCambio={(v) => {
        if (!v) {
          setErrores({})
          agregar.reset()
        }
        onCambio(v)
      }}
      titulo="Agregar gasto"
      descripcion="Reparaciones, trámites, publicidad o cualquier dinero que se gastó en este vehículo."
    >
      <form noValidate onSubmit={enviar} onChange={limpiarAlEditar(setErrores)} className="flex flex-col gap-4">
        <ErrorFormulario mensaje={agregar.error ? mensajeDeError(agregar.error) : null} />
        <Campo id={`${id}-tipo`} etiqueta="Tipo de gasto" error={errores.tipo}>
          <Opciones
            id={`${id}-tipo`}
            name="tipo"
            defaultValue="mecanica"
            opciones={TIPOS_GASTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
            error={errores.tipo}
          />
        </Campo>
        <Campo id={`${id}-descripcion`} etiqueta="Descripción" opcional ayuda="Por ejemplo: cambio de frenos delanteros.">
          <Input
            id={`${id}-descripcion`}
            name="descripcion"
            autoComplete="off"
            maxLength={80}
            aria-describedby={descripcionDe(`${id}-descripcion`)}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id={`${id}-monto`} etiqueta="Monto" error={errores.monto}>
            <Monto id={`${id}-monto`} name="monto" error={errores.monto} />
          </Campo>
          <Campo id={`${id}-fecha`} etiqueta="Fecha" error={errores.fecha}>
            <Fecha
              id={`${id}-fecha`}
              name="fecha"
              min={aFechaInput(vehiculo.fechaCompra)}
              error={errores.fecha}
            />
          </Campo>
        </div>
        <Botones guardando={agregar.isPending} texto="Agregar gasto" />
      </form>
    </Dialogo>
  )
}

// ------------------------------------------------------------------ Poner a la venta

export function DialogoALaVenta({
  vehiculo,
  abierto,
  onCambio,
}: {
  vehiculo: VehiculoConTotales
  abierto: boolean
  onCambio: (v: boolean) => void
}) {
  const id = useId()
  const [errores, setErrores] = useState<Errores>({})
  const [precio, setPrecio] = useState('')
  const poner = usePonerALaVenta(vehiculo.id)
  const precioNum = leerMonto(precio)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const err: Errores = {}
    const precioPedido = validarMonto(precio, err, 'precio')
    const fecha = validarFecha(texto(fd, 'fecha'), err, 'fecha', vehiculo.fechaCompra)
    setErrores(err)
    if (Object.keys(err).length) return
    try {
      await poner.mutateAsync({ fecha, precioPedido })
      onCambio(false)
    } catch {
      // El mensaje se muestra con poner.error
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      onCambio={(v) => {
        if (!v) {
          setErrores({})
          setPrecio('')
          poner.reset()
        }
        onCambio(v)
      }}
      titulo="Poner a la venta"
      descripcion="Marca el fin de la preparación y define el precio que vas a pedir."
    >
      <form noValidate onSubmit={enviar} onChange={limpiarAlEditar(setErrores)} className="flex flex-col gap-4">
        <ErrorFormulario mensaje={poner.error ? mensajeDeError(poner.error) : null} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id={`${id}-precio`} etiqueta="Precio de venta" error={errores.precio}>
            <Monto id={`${id}-precio`} name="precio" value={precio} onChange={setPrecio} error={errores.precio} />
          </Campo>
          <Campo id={`${id}-fecha`} etiqueta="A la venta desde" error={errores.fecha}>
            <Fecha
              id={`${id}-fecha`}
              name="fecha"
              min={aFechaInput(vehiculo.fechaCompra)}
              error={errores.fecha}
            />
          </Campo>
        </div>
        <Cuenta
          filas={[
            { etiqueta: 'Costo hasta hoy', valor: fmtQ(vehiculo.costoTotal) },
            {
              etiqueta: 'Ganarías, si se vende a este precio',
              valor: precioNum ? fmtQ(precioNum - vehiculo.costoTotal) : '—',
              fuerte: true,
            },
          ]}
        />
        <Botones guardando={poner.isPending} texto="Poner a la venta" />
      </form>
    </Dialogo>
  )
}

// ------------------------------------------------------------------ Registrar venta

export function DialogoVenta({
  vehiculo,
  abierto,
  onCambio,
}: {
  vehiculo: VehiculoConTotales
  abierto: boolean
  onCambio: (v: boolean) => void
}) {
  const id = useId()
  const [errores, setErrores] = useState<Errores>({})
  const [precio, setPrecio] = useState(vehiculo.precioPedido ? String(vehiculo.precioPedido) : '')
  const [comision, setComision] = useState<string | null>(null)
  const [comprador, setComprador] = useState<Cliente | null>(null)
  const vender = useRegistrarVenta(vehiculo.id)

  const precioNum = leerMonto(precio) ?? 0
  // Mientras no se edite, la comisión sigue al precio (1.5 % sugerido).
  const comisionTexto = comision ?? (precioNum ? String(Math.round(precioNum * COMISION_SUGERIDA)) : '')
  const comisionNum = leerMonto(comisionTexto) ?? 0

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const err: Errores = {}
    const precioVenta = validarMonto(precio, err, 'precio')
    const com = validarMonto(comisionTexto || '0', err, 'comision', true)
    const fecha = validarFecha(texto(fd, 'fecha'), err, 'fecha', vehiculo.fechaCompra)
    const vendedor = texto(fd, 'vendedor')
    if (!vendedor) err.vendedor = 'Elige quién lo vendió.'
    if (!comprador) err.comprador = 'Elige o registra a quién se le vendió.'
    setErrores(err)
    if (Object.keys(err).length || !comprador) return
    try {
      await vender.mutateAsync({
        fecha,
        precio: precioVenta,
        vendedor,
        formaPago: texto(fd, 'pago') as FormaPago,
        comision: com,
        compradorId: comprador.id,
      })
      onCambio(false)
    } catch {
      // El mensaje se muestra con vender.error
    }
  }

  const ganancia = precioNum - vehiculo.costoTotal - comisionNum

  return (
    <Dialogo
      abierto={abierto}
      onCambio={(v) => {
        if (!v) {
          setErrores({})
          setComprador(null)
          vender.reset()
        }
        onCambio(v)
      }}
      titulo="Registrar venta"
      descripcion="El vehículo sale del inventario y su ganancia se suma al resumen."
      ancho="sm:max-w-lg"
    >
      <form noValidate onSubmit={enviar} onChange={limpiarAlEditar(setErrores)} className="flex flex-col gap-4">
        <ErrorFormulario mensaje={vender.error ? mensajeDeError(vender.error) : null} />
        <SelectorCliente
          id={`${id}-comprador`}
          etiqueta="Comprador"
          valor={comprador}
          onCambio={(c) => {
            setComprador(c)
            if (c) setErrores(quitarError('comprador'))
          }}
          error={errores.comprador}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id={`${id}-precio`} etiqueta="Precio de venta" error={errores.precio}>
            <Monto id={`${id}-precio`} name="precio" value={precio} onChange={setPrecio} error={errores.precio} />
          </Campo>
          <Campo id={`${id}-fecha`} etiqueta="Fecha de venta" error={errores.fecha}>
            <Fecha
              id={`${id}-fecha`}
              name="fecha"
              min={aFechaInput(vehiculo.fechaCompra)}
              error={errores.fecha}
            />
          </Campo>
          <Campo id={`${id}-vendedor`} etiqueta="Vendedor" error={errores.vendedor}>
            <Opciones
              id={`${id}-vendedor`}
              name="vendedor"
              placeholder="Elegir"
              opciones={VENDEDORES.map((v) => ({ valor: v.nombre, etiqueta: v.nombre }))}
              error={errores.vendedor}
            />
          </Campo>
          <Campo id={`${id}-pago`} etiqueta="Forma de pago">
            <Opciones
              id={`${id}-pago`}
              name="pago"
              defaultValue="Contado"
              opciones={FORMAS_PAGO.map((p) => ({ valor: p, etiqueta: p }))}
            />
          </Campo>
          <Campo
            id={`${id}-comision`}
            etiqueta="Comisión del vendedor"
            error={errores.comision}
            ayuda="Se sugiere 1.5 % del precio. Se guarda como gasto."
            className="sm:col-span-2"
          >
            <Monto
              id={`${id}-comision`}
              name="comision"
              value={comisionTexto}
              onChange={setComision}
              error={errores.comision}
            />
          </Campo>
        </div>
        <Cuenta
          filas={[
            { etiqueta: 'Precio de venta', valor: precioNum ? fmtQ(precioNum) : '—' },
            {
              etiqueta: vehiculo.modalidad === 'consignacion' ? 'Pago al dueño y gastos' : 'Compra y gastos',
              valor: `−${fmtQ(vehiculo.costoTotal)}`,
            },
            { etiqueta: 'Comisión', valor: `−${fmtQ(comisionNum)}` },
            {
              etiqueta: ganancia < 0 ? 'Pérdida' : 'Ganancia',
              valor: precioNum ? (
                <span className={ganancia < 0 ? 'text-bad-text' : undefined}>{fmtQ(Math.abs(ganancia))}</span>
              ) : (
                '—'
              ),
              fuerte: true,
            },
          ]}
        />
        <Botones guardando={vender.isPending} texto="Registrar venta" />
      </form>
    </Dialogo>
  )
}
