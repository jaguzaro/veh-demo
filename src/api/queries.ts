import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { FaseReporte, Filtros, FiltrosClientes, FiltrosInventario } from '@/lib/filtros'
import type { ClienteInput, CompraInput, FichaInput, GastoInput, VentaInput } from './endpoints'
import { claveFotoNota } from './tipos'

/*
 * Los endpoints se importan de forma dinámica: el código de datos
 * solo se descarga cuando una pantalla lo pide.
 */
const api = () => import('./endpoints')

export const resumenQuery = (f: Filtros) =>
  queryOptions({
    queryKey: ['resumen', f],
    queryFn: async () => (await api()).getResumen(f),
    placeholderData: keepPreviousData,
  })

export const inventarioQuery = (f: FiltrosInventario) =>
  queryOptions({
    queryKey: ['inventario', f],
    queryFn: async () => (await api()).getInventario(f),
    placeholderData: keepPreviousData,
  })

export const mesesReporteQuery = () =>
  queryOptions({
    queryKey: ['reporte', 'meses'],
    queryFn: async () => (await api()).getMesesReporte(),
    staleTime: Infinity,
  })

export const reporteMesQuery = (mes: string) =>
  queryOptions({
    queryKey: ['reporte', mes],
    queryFn: async () => (await api()).getReporteMes(mes),
    placeholderData: keepPreviousData,
  })

export const reporteInventarioQuery = (fase: FaseReporte) =>
  queryOptions({
    queryKey: ['inventario', 'reporte', fase],
    queryFn: async () => (await api()).getReporteInventario(fase),
    placeholderData: keepPreviousData,
  })

export const vehiculoQuery = (id: string) =>
  queryOptions({
    queryKey: ['vehiculo', id],
    queryFn: async () => (await api()).getVehiculo(id),
  })

/** Cualquier registro cambia el resumen, la lista, el detalle y el reporte: se invalidan todos. */
function useRegistro<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['resumen'] }),
        qc.invalidateQueries({ queryKey: ['inventario'] }),
        qc.invalidateQueries({ queryKey: ['vehiculo'] }),
        qc.invalidateQueries({ queryKey: ['reporte'] }),
        qc.invalidateQueries({ queryKey: ['foto'] }),
        qc.invalidateQueries({ queryKey: ['clientes'] }),
        qc.invalidateQueries({ queryKey: ['cliente'] }),
      ]),
  })
}

export const useRegistrarCompra = () => useRegistro(async (i: CompraInput) => (await api()).registrarCompra(i))

export const useAgregarGasto = (id: string) =>
  useRegistro(async (i: GastoInput) => (await api()).agregarGasto(id, i))

export const useEliminarGasto = (id: string) =>
  useRegistro(async (gastoId: string) => (await api()).eliminarGasto(id, gastoId))

export const usePonerALaVenta = (id: string) =>
  useRegistro(async (i: { fecha: number; precioPedido: number }) => (await api()).ponerALaVenta(id, i))

export const useRegistrarVenta = (id: string) =>
  useRegistro(async (i: VentaInput) => (await api()).registrarVenta(id, i))

export const useActualizarFicha = (id: string) =>
  useRegistro(async (i: FichaInput) => (await api()).actualizarFicha(id, i))

export const useAsignarCliente = (id: string, rol: 'proveedor' | 'comprador') =>
  useRegistro(async (clienteId: string) => (await api()).asignarCliente(id, rol, clienteId))

/** Agrega la nota y, si trae foto, la guarda en este navegador. */
export const useAgregarNota = (id: string) =>
  useRegistro(async ({ texto, foto }: { texto: string; foto: File | null }) => {
    const notaId = await (await api()).agregarNota(id, { texto, conFoto: !!foto })
    if (foto) {
      try {
        await (await fotos()).guardarFoto(claveFotoNota(notaId), foto)
      } catch (e) {
        // Si la foto no se pudo guardar, se deshace la nota para poder reintentar con todo.
        await (await api()).eliminarNota(id, notaId)
        throw e
      }
    }
  })

export const useEliminarNota = (id: string) =>
  useRegistro(async (notaId: string) => {
    await (await api()).eliminarNota(id, notaId)
    await (await fotos()).quitarFoto(claveFotoNota(notaId)).catch(() => {})
  })

// ------------------------------------------------------------------ Clientes

export const clientesQuery = (f: FiltrosClientes) =>
  queryOptions({
    queryKey: ['clientes', f],
    queryFn: async () => (await api()).getClientes(f),
    placeholderData: keepPreviousData,
  })

export const buscarClientesQuery = (q: string) =>
  queryOptions({
    queryKey: ['clientes', 'buscar', q],
    queryFn: async () => (await api()).buscarClientes(q),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  })

export const clienteQuery = (id: string) =>
  queryOptions({
    queryKey: ['cliente', id],
    queryFn: async () => (await api()).getCliente(id),
  })

export const useRegistrarCliente = () => useRegistro(async (i: ClienteInput) => (await api()).registrarCliente(i))

export const useActualizarCliente = (id: string) =>
  useRegistro(async (i: ClienteInput) => (await api()).actualizarCliente(id, i))

export const useRestablecerDatos = () => useRegistro(async () => (await api()).restablecerDatos())


// ------------------------------------------------------------------ Fotos

const fotos = () => import('./fotos')

export const fotoQuery = (id: string) =>
  queryOptions({
    queryKey: ['foto', id],
    queryFn: async () => (await fotos()).obtenerFoto(id),
    staleTime: Infinity,
  })

export function useGuardarFoto(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (archivo: File) => (await fotos()).guardarFoto(id, archivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foto', id] }),
  })
}

export function useQuitarFoto(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await fotos()).quitarFoto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foto', id] }),
  })
}
