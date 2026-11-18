import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search, UserPlus } from 'lucide-react'
import { clientesQuery } from '@/api/queries'
import { nombreCliente } from '@/api/tipos'
import { DialogoCliente } from '@/components/clientes/clientes'
import { ErrorCarga, EsqueletoPagina, SinDatos } from '@/components/estados'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CLIENTES_DEFAULT, POR_PAGINA, TIPOS_CLIENTE, validarClientes, type FiltrosClientes } from '@/lib/filtros'
import { fmtEntero, fmtFecha } from '@/lib/format'
import { fmtDpi, fmtNit, fmtTelefono } from '@/lib/validar'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/clientes/')({
  validateSearch: validarClientes,
  search: { middlewares: [stripSearchParams(CLIENTES_DEFAULT)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(clientesQuery(deps))
  },
  component: Clientes,
})

function Clientes() {
  const filtros = Route.useSearch()
  const navigate = useNavigate({ from: '/clientes/' })
  const [nuevo, setNuevo] = useState(false)
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery(clientesQuery(filtros))

  const cambiar = (parcial: Partial<FiltrosClientes>) =>
    navigate({ search: (prev) => ({ ...prev, pagina: 1, ...parcial }), replace: true })

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quienes le vendieron un auto al predio y quienes compraron uno.</p>
        </div>
        <Button className="h-9" onClick={() => setNuevo(true)}>
          <UserPlus aria-hidden />
          Registrar cliente
        </Button>
        {nuevo && (
          <DialogoCliente
            abierto
            onCambio={setNuevo}
            onGuardado={(c) => void navigate({ to: '/clientes/$id', params: { id: c.id } })}
          />
        )}
      </div>

      <nav aria-label="Tipo de cliente" className="-mb-px flex gap-5 overflow-x-auto border-b">
        {TIPOS_CLIENTE.map((t) => {
          const activa = filtros.tipo === t.valor
          return (
            <Link
              key={t.valor}
              from="/clientes/"
              to="."
              search={(prev) => ({ ...prev, tipo: t.valor, pagina: 1 })}
              replace
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'shrink-0 border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                activa ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.etiqueta}
              {data && <span className="ml-1.5 font-normal text-muted-foreground">{fmtEntero(data.conteos[t.valor])}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 mb-4">
        <Buscador valor={filtros.q} onCambio={(q) => cambiar({ q })} />
      </div>

      {isPending ? (
        <EsqueletoPagina tarjetas={0} bloques={['h-[760px]']} />
      ) : isError ? (
        <ErrorCarga onReintentar={() => void refetch()} />
      ) : data.total === 0 ? (
        <SinDatos>
          {filtros.q ? `Nadie coincide con “${filtros.q}”. Revisa la búsqueda o cambia de pestaña.` : 'No hay clientes en esta pestaña.'}
        </SinDatos>
      ) : (
        <div
          aria-busy={isPlaceholderData}
          className={cn('rounded-lg border bg-card transition-opacity', isPlaceholderData && 'opacity-60')}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Cliente</TableHead>
                <TableHead className="max-sm:hidden">Teléfono</TableHead>
                <TableHead className="max-lg:hidden">NIT</TableHead>
                <TableHead className="text-right">Vendió</TableHead>
                <TableHead className="text-right">Compró</TableHead>
                <TableHead className="pr-4 text-right max-md:hidden">Último negocio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.filas.map((c) => (
                <TableRow key={c.id} className="relative">
                  <TableCell className="min-w-44 pl-4 whitespace-normal">
                    <Link
                      to="/clientes/$id"
                      params={{ id: c.id }}
                      className="font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                    >
                      {nombreCliente(c)}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      DPI {fmtDpi(c.dpi)}
                      <span className="sm:hidden">, tel. {fmtTelefono(c.telefono)}</span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap max-sm:hidden">{fmtTelefono(c.telefono)}</TableCell>
                  <TableCell className="whitespace-nowrap max-lg:hidden">{fmtNit(c.nit)}</TableCell>
                  <TableCell className="text-right">
                    <Conteo n={c.vendio} etiqueta="autos vendidos al predio" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Conteo n={c.compro} etiqueta="autos comprados" />
                  </TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap text-muted-foreground max-md:hidden">
                    {fmtFecha(c.ultimo)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Paginacion pagina={data.pagina} paginas={data.paginas} total={data.total} />
        </div>
      )}
    </>
  )
}

function Conteo({ n, etiqueta }: { n: number; etiqueta: string }) {
  if (n === 0) return <span className="text-subtle-foreground" aria-label={`Ninguno: ${etiqueta}`}>—</span>
  return (
    <span className="font-medium">
      {fmtEntero(n)}
      <span className="sr-only"> {etiqueta}</span>
    </span>
  )
}

function Buscador({ valor, onCambio }: { valor: string; onCambio: (q: string) => void }) {
  const id = useId()
  const [texto, setTexto] = useState(valor)

  useEffect(() => {
    if (texto.trim() === valor) return
    const t = setTimeout(() => onCambio(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto, valor, onCambio])

  return (
    <div className="flex min-w-0 flex-col gap-1 sm:w-80">
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
          placeholder="Nombre, DPI, NIT o teléfono"
          autoComplete="off"
          className="pl-8"
        />
      </div>
    </div>
  )
}

function Paginacion({ pagina, paginas, total }: { pagina: number; paginas: number; total: number }) {
  const desde = (pagina - 1) * POR_PAGINA + 1
  const hasta = Math.min(pagina * POR_PAGINA, total)
  const boton =
    'inline-flex h-9 items-center gap-1 rounded-sm border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
  const inactivo = 'pointer-events-none opacity-50'
  return (
    <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {fmtEntero(desde)} a {fmtEntero(hasta)} de {fmtEntero(total)} clientes
      </p>
      <div className="flex gap-2">
        <Link
          from="/clientes/"
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
          from="/clientes/"
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
