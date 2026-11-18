import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, Pencil } from 'lucide-react'
import { clienteQuery } from '@/api/queries'
import { nombreCliente } from '@/api/tipos'
import { DialogoCliente } from '@/components/clientes/clientes'
import { ErrorCarga, EsqueletoPagina } from '@/components/estados'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtEntero, fmtFecha, fmtQ } from '@/lib/format'
import { fmtDpi, fmtNit, fmtTelefono } from '@/lib/validar'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/clientes/$id')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(clienteQuery(params.id))
  },
  component: DetalleCliente,
})

function DetalleCliente() {
  const { id } = Route.useParams()
  const { data: c, isPending, isError, refetch } = useQuery(clienteQuery(id))
  const [editar, setEditar] = useState(false)

  return (
    <>
      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Clientes
      </Link>

      {isPending ? (
        <EsqueletoPagina tarjetas={0} bloques={['h-[72px]', 'h-[140px]', 'h-[320px]']} />
      ) : isError ? (
        <ErrorCarga onReintentar={() => void refetch()} />
      ) : !c ? (
        <div className="rounded-lg border bg-card px-5 py-10 text-center">
          <h1 className="text-base font-semibold">No encontramos este cliente</h1>
          <p className="mt-1 text-sm text-muted-foreground">Puede que se haya borrado al restablecer los datos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{nombreCliente(c)}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {resumenNegocios(c.negocios.filter((n) => n.tipo === 'vendio').length, c.negocios.filter((n) => n.tipo === 'compro').length)}
              </p>
            </div>
            <Button variant="outline" className="h-9" onClick={() => setEditar(true)}>
              <Pencil aria-hidden />
              Editar datos
            </Button>
            {editar && <DialogoCliente cliente={c} abierto onCambio={setEditar} />}
          </div>

          <section aria-labelledby="titulo-datos" className="overflow-hidden rounded-lg border bg-border">
            <h2 id="titulo-datos" className="sr-only">
              Datos del cliente
            </h2>
            <dl className="grid grid-cols-2 gap-px lg:grid-cols-5">
              <Dato etiqueta="DPI">{fmtDpi(c.dpi)}</Dato>
              <Dato etiqueta="NIT">{fmtNit(c.nit)}</Dato>
              <Dato etiqueta="Teléfono">
                <a href={`tel:+502${c.telefono}`} className="underline-offset-4 hover:text-primary hover:underline">
                  {fmtTelefono(c.telefono)}
                </a>
              </Dato>
              <Dato etiqueta="Correo">
                {c.correo ? (
                  <a href={`mailto:${c.correo}`} title={c.correo} className="block truncate underline-offset-4 hover:text-primary hover:underline">
                    {c.correo}
                  </a>
                ) : (
                  <span className="text-subtle-foreground">Sin correo</span>
                )}
              </Dato>
              <Dato etiqueta="Dirección" className="col-span-2 lg:col-span-1">
                {c.direccion || <span className="text-subtle-foreground">Sin dirección</span>}
              </Dato>
            </dl>
          </section>

          <Panel titulo="Negocios con el predio" descripcion={`Cliente desde el ${fmtFecha(c.creado)}.`}>
            {c.negocios.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Todavía no ha comprado ni vendido un vehículo. Elígelo al registrar un ingreso o una venta.
              </p>
            ) : (
              <div className="-mx-5">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5">Fecha</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead className="max-sm:hidden">Negocio</TableHead>
                      <TableHead className="pr-5 text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.negocios.map((n) => (
                      <TableRow key={`${n.tipo}-${n.vehiculoId}`} className="relative">
                        <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{fmtFecha(n.fecha)}</TableCell>
                        <TableCell className="whitespace-normal">
                          <Link
                            to="/inventario/$id"
                            params={{ id: n.vehiculoId }}
                            className="font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                          >
                            {n.vehiculo}
                          </Link>
                          <span className="block text-xs text-muted-foreground sm:hidden">{etiquetaNegocio(n)}</span>
                        </TableCell>
                        <TableCell className="max-sm:hidden">{etiquetaNegocio(n)}</TableCell>
                        <TableCell className="pr-5 text-right">{fmtQ(n.monto)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  )
}

const etiquetaNegocio = (n: { tipo: 'vendio' | 'compro'; modalidad: 'propio' | 'consignacion' }) =>
  n.tipo === 'compro' ? 'Lo compró' : n.modalidad === 'consignacion' ? 'Lo dejó en consignación' : 'Se lo vendió al predio'

function resumenNegocios(vendio: number, compro: number) {
  const partes = []
  if (vendio) partes.push(`Vendió ${fmtEntero(vendio)} ${vendio === 1 ? 'auto' : 'autos'} al predio`)
  if (compro) partes.push(`${vendio ? 'compró' : 'Compró'} ${fmtEntero(compro)}`)
  return partes.length ? partes.join(' y ') : 'Sin negocios todavía'
}

function Dato({ etiqueta, children, className }: { etiqueta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 bg-card px-4 py-3.5 sm:px-5', className)}>
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 text-base font-medium">{children}</dd>
    </div>
  )
}
