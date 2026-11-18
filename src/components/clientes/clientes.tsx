import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Search, UserPlus } from 'lucide-react'
import { buscarClientesQuery, useActualizarCliente, useRegistrarCliente } from '@/api/queries'
import { nombreCliente, type Cliente } from '@/api/tipos'
import { Campo, ErrorFormulario } from '@/components/campo'
import { Botones, Dialogo } from '@/components/inventario/formularios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { descripcionDe, limpiarAlEditar, mensajeDeError, texto, type Errores } from '@/lib/formulario'
import { fmtDpi, fmtNit, fmtTelefono, validarCorreo, validarDpi, validarNit, validarTelefono } from '@/lib/validar'
import { cn } from '@/lib/utils'

// ------------------------------------------------------------------ Registrar o editar un cliente

function CampoTexto({
  id,
  name,
  etiqueta,
  error,
  ayuda,
  opcional,
  className,
  defaultValue,
  ...resto
}: {
  id: string
  name: string
  etiqueta: string
  error?: string
  ayuda?: ReactNode
  opcional?: boolean
  className?: string
  defaultValue?: string
} & Pick<React.ComponentProps<'input'>, 'inputMode' | 'autoComplete' | 'type' | 'placeholder' | 'maxLength'>) {
  return (
    <Campo id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional} className={className}>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={descripcionDe(id)}
        {...resto}
      />
    </Campo>
  )
}

/** Valida en el navegador con las mismas reglas que la API (DPI y NIT con su dígito verificador). */
function validarCampos(fd: FormData) {
  const err: Errores = {}
  if (!texto(fd, 'nombres')) err.nombres = 'Escribe los nombres.'
  if (!texto(fd, 'apellidos')) err.apellidos = 'Escribe los apellidos.'
  const reglas = [
    ['dpi', validarDpi(texto(fd, 'dpi'))],
    ['nit', validarNit(texto(fd, 'nit'))],
    ['telefono', validarTelefono(texto(fd, 'telefono'))],
    ['correo', validarCorreo(texto(fd, 'correo'))],
  ] as const
  for (const [campo, r] of reglas) if (!r.ok) err[campo] = r.error
  return err
}

/**
 * Registra un cliente nuevo o edita uno existente.
 * Se usa también dentro de otros formularios (compra y venta): su envío no sube al formulario de afuera.
 */
export function DialogoCliente({
  cliente,
  inicial,
  abierto,
  onCambio,
  onGuardado,
}: {
  cliente?: Cliente
  /** Valores iniciales al registrar (p. ej. lo que se escribió en la búsqueda) */
  inicial?: Partial<Pick<Cliente, 'nombres' | 'dpi'>>
  abierto: boolean
  onCambio: (v: boolean) => void
  onGuardado?: (c: Cliente) => void
}) {
  const id = useId()
  const [errores, setErrores] = useState<Errores>({})
  const registrar = useRegistrarCliente()
  const actualizar = useActualizarCliente(cliente?.id ?? '')
  const mutacion = cliente ? actualizar : registrar
  const base = cliente ?? inicial

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    const fd = new FormData(e.currentTarget)
    const err = validarCampos(fd)
    setErrores(err)
    if (Object.keys(err).length) return
    const datos = {
      nombres: texto(fd, 'nombres'),
      apellidos: texto(fd, 'apellidos'),
      dpi: texto(fd, 'dpi'),
      nit: texto(fd, 'nit'),
      telefono: texto(fd, 'telefono'),
      correo: texto(fd, 'correo'),
      direccion: texto(fd, 'direccion'),
    }
    try {
      if (cliente) {
        await actualizar.mutateAsync(datos)
        onGuardado?.({ ...cliente, ...datos })
      } else {
        onGuardado?.(await registrar.mutateAsync(datos))
      }
      onCambio(false)
    } catch (error) {
      // Errores por campo (p. ej. DPI ya registrado) junto al campo; el resto arriba.
      if (error && typeof error === 'object' && 'campos' in error) setErrores(error.campos as Errores)
    }
  }

  const errorGeneral = mutacion.error && !('campos' in mutacion.error) ? mensajeDeError(mutacion.error) : null

  return (
    <Dialogo
      abierto={abierto}
      onCambio={(v) => {
        if (!v) {
          setErrores({})
          mutacion.reset()
        }
        onCambio(v)
      }}
      titulo={cliente ? 'Editar cliente' : 'Registrar cliente'}
      descripcion="Datos para el traspaso y para contactarlo. El DPI y el NIT se revisan con su dígito verificador."
      ancho="sm:max-w-lg"
    >
      <form
        noValidate
        onSubmit={enviar}
        onChange={(e) => {
          e.stopPropagation()
          limpiarAlEditar(setErrores)(e)
        }}
        className="flex flex-col gap-4"
      >
        <ErrorFormulario mensaje={errorGeneral} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id={`${id}-nombres`}
            name="nombres"
            etiqueta="Nombres"
            autoComplete="off"
            defaultValue={base?.nombres}
            error={errores.nombres}
          />
          <CampoTexto
            id={`${id}-apellidos`}
            name="apellidos"
            etiqueta="Apellidos"
            autoComplete="off"
            defaultValue={cliente?.apellidos}
            error={errores.apellidos}
          />
          <CampoTexto
            id={`${id}-dpi`}
            name="dpi"
            etiqueta="DPI (CUI)"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0000 00000 0000"
            defaultValue={base?.dpi ? fmtDpi(base.dpi) : undefined}
            error={errores.dpi}
          />
          <CampoTexto
            id={`${id}-nit`}
            name="nit"
            etiqueta="NIT"
            autoComplete="off"
            placeholder="1234567-9"
            defaultValue={cliente ? fmtNit(cliente.nit) : undefined}
            error={errores.nit}
            ayuda="Escribe CF si es consumidor final."
          />
          <CampoTexto
            id={`${id}-telefono`}
            name="telefono"
            etiqueta="Teléfono"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="5512 3456"
            defaultValue={cliente ? fmtTelefono(cliente.telefono) : undefined}
            error={errores.telefono}
          />
          <CampoTexto
            id={`${id}-correo`}
            name="correo"
            etiqueta="Correo"
            type="email"
            autoComplete="off"
            opcional
            defaultValue={cliente?.correo}
            error={errores.correo}
          />
          <CampoTexto
            id={`${id}-direccion`}
            name="direccion"
            etiqueta="Dirección"
            autoComplete="off"
            opcional
            maxLength={120}
            className="sm:col-span-2"
            defaultValue={cliente?.direccion}
            ayuda="Como aparece en el DPI o en un recibo de luz. Se usa en el traspaso."
          />
        </div>
        <Botones guardando={mutacion.isPending} texto={cliente ? 'Guardar cambios' : 'Registrar cliente'} />
      </form>
    </Dialogo>
  )
}

// ------------------------------------------------------------------ Datos de un cliente

/** Datos de contacto y documentos de un cliente, en una lista compacta. */
export function DatosCliente({ c, className }: { c: Cliente; className?: string }) {
  const filas: [string, string][] = [
    ['Teléfono', fmtTelefono(c.telefono)],
    ['DPI', fmtDpi(c.dpi)],
    ['NIT', fmtNit(c.nit)],
  ]
  if (c.correo) filas.push(['Correo', c.correo])
  return (
    <dl className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm', className)}>
      {filas.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="truncate">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

// ------------------------------------------------------------------ Elegir un cliente dentro de un formulario

/**
 * Busca un cliente por nombre, DPI, NIT o teléfono, o registra uno nuevo sin salir del formulario.
 * El formulario de afuera recibe el cliente elegido con `onCambio`.
 */
export function SelectorCliente({
  id,
  etiqueta,
  valor,
  onCambio,
  error,
  ayuda,
}: {
  id: string
  etiqueta: string
  valor: Cliente | null
  onCambio: (c: Cliente | null) => void
  error?: string
  ayuda?: ReactNode
}) {
  const [q, setQ] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const { data: resultados, isFetching } = useQuery(buscarClientesQuery(busqueda))

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(q.trim()), 200)
    return () => clearTimeout(t)
  }, [q])

  const soloNumeros = /^[\d\s-]+$/.test(q.trim())
  const inicial = soloNumeros ? { dpi: q.replace(/\D/g, '') } : { nombres: q.trim() }
  const lista = busqueda.length >= 2 ? (resultados ?? []) : []

  if (valor) {
    return (
      <Campo id={id} etiqueta={etiqueta} error={error}>
        <div className="flex items-start justify-between gap-3 rounded-sm border bg-card px-3 py-2.5">
          <div className="min-w-0">
            <p id={id} className="font-medium">
              {nombreCliente(valor)}
            </p>
            <p className="text-xs text-muted-foreground">
              DPI {fmtDpi(valor.dpi)}, tel. {fmtTelefono(valor.telefono)}
            </p>
          </div>
          <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => onCambio(null)}>
            Cambiar
          </Button>
        </div>
      </Campo>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Campo id={id} etiqueta={etiqueta} error={error} ayuda={ayuda}>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground"
          />
          <Input
            id={id}
            type="search"
            value={q}
            onChange={(e) => {
              e.stopPropagation()
              setQ(e.target.value)
            }}
            onKeyDown={(e) => {
              // Enter elige el primer resultado en lugar de enviar el formulario.
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (lista[0]) onCambio(lista[0])
            }}
            autoComplete="off"
            placeholder="Buscar por nombre, DPI, NIT o teléfono"
            className="pl-8"
            aria-invalid={!!error}
            aria-describedby={descripcionDe(id)}
            aria-controls={`${id}-resultados`}
          />
        </div>
        <div id={`${id}-resultados`} aria-live="polite" className="flex flex-col">
          {lista.length > 0 && (
            <ul className="divide-y rounded-sm border bg-card">
              {lista.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onCambio(c)}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="min-w-0 truncate font-medium">{nombreCliente(c)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">DPI {fmtDpi(c.dpi)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {busqueda.length >= 2 && !isFetching && lista.length === 0 && (
            <p className="text-xs text-muted-foreground">Nadie coincide con “{busqueda}”.</p>
          )}
        </div>
      </Campo>
      <Button type="button" variant="outline" className="h-9 self-start" onClick={() => setNuevo(true)}>
        <UserPlus aria-hidden />
        Registrar cliente nuevo
      </Button>
      {nuevo && (
        <DialogoCliente
          abierto
          inicial={inicial}
          onCambio={setNuevo}
          onGuardado={(c) => {
            setQ('')
            onCambio(c)
          }}
        />
      )}
    </div>
  )
}

/** Tarjeta de un cliente en el detalle del vehículo. */
export function TarjetaCliente({
  rol,
  cliente,
  vacio,
  accion,
}: {
  rol: string
  cliente: Cliente | null
  vacio: string
  accion?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm text-muted-foreground">{rol}</h3>
        {accion}
      </div>
      {cliente ? (
        <>
          <Link
            to="/clientes/$id"
            params={{ id: cliente.id }}
            className="text-base font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {nombreCliente(cliente)}
          </Link>
          <DatosCliente c={cliente} />
        </>
      ) : (
        <p className="text-sm text-subtle-foreground">{vacio}</p>
      )}
    </div>
  )
}
