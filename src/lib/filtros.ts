import type { SearchSchemaInput } from '@tanstack/react-router'
import { FASES, type Fase } from '@/api/tipos'

export interface Opcion {
  valor: string
  etiqueta: string
}

// ------------------------------------------------------------------ Resumen

export type Rango = 'mes' | 'mes-pasado' | '3m' | '6m' | 'anio' | '12m'

export interface Filtros {
  rango: Rango
}

export const FILTROS_DEFAULT: Filtros = { rango: 'mes' }

export const RANGOS: { valor: Rango; etiqueta: string }[] = [
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'mes-pasado', etiqueta: 'Mes pasado' },
  { valor: '3m', etiqueta: 'Últimos 3 meses' },
  { valor: '6m', etiqueta: 'Últimos 6 meses' },
  { valor: 'anio', etiqueta: 'Este año' },
  { valor: '12m', etiqueta: 'Últimos 12 meses' },
]

const esUno = <T extends string>(lista: readonly { valor: T }[], v: unknown): v is T =>
  typeof v === 'string' && lista.some((x) => x.valor === v)

/** Valida los filtros que vienen en la URL; cualquier valor inválido vuelve al default. */
export function validarFiltros(search: Partial<Filtros> & SearchSchemaInput): Filtros {
  return {
    rango: esUno(RANGOS, search.rango) ? search.rango : FILTROS_DEFAULT.rango,
  }
}

// ------------------------------------------------------------------ Inventario

export type FaseFiltro = 'todos' | 'predio' | Fase
export type Orden = 'reciente' | 'dias' | 'costo' | 'ganancia'

export type Vista = 'tabla' | 'tarjetas'

export interface FiltrosInventario {
  vista: Vista
  fase: FaseFiltro
  q: string
  orden: Orden
  pagina: number
}

export const INVENTARIO_DEFAULT: FiltrosInventario = {
  vista: 'tarjetas',
  fase: 'predio',
  q: '',
  orden: 'reciente',
  pagina: 1,
}

/** Lo que se quita de la URL cuando está en su valor por defecto. La vista siempre se deja: depende de cada persona. */
export const INVENTARIO_SIN_URL: Partial<FiltrosInventario> = { fase: 'predio', q: '', orden: 'reciente', pagina: 1 }

// v2: al cambiar la vista por defecto a tarjetas, se ignora lo que se guardó antes.
const CLAVE_VISTA = 'vehdemo.inventario.vista.v2'

/** Vista que eligió esta persona la última vez; la primera vez, tarjetas. Se recuerda en este navegador. */
export function vistaGuardada(): Vista {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'tabla' ? 'tabla' : 'tarjetas'
  } catch {
    return 'tarjetas'
  }
}

export function guardarVista(v: Vista) {
  try {
    localStorage.setItem(CLAVE_VISTA, v)
  } catch {
    // Sin almacenamiento: la vista se queda en la URL mientras dure la visita.
  }
}

/** Última lista que se vio (pestaña, búsqueda, orden, página y vista), para volver a ella desde el detalle. */
let ultimaLista: FiltrosInventario | null = null
export const recordarListaInventario = (f: FiltrosInventario) => {
  ultimaLista = f
}
export const listaInventario = (): Partial<FiltrosInventario> => ultimaLista ?? {}

export const ORDENES: { valor: Orden; etiqueta: string }[] = [
  { valor: 'reciente', etiqueta: 'Compra más reciente' },
  { valor: 'dias', etiqueta: 'Más días en el predio' },
  { valor: 'costo', etiqueta: 'Mayor costo total' },
  { valor: 'ganancia', etiqueta: 'Mayor ganancia' },
]

/** Pestañas del inventario, en orden. */
export const FASES_FILTRO: { valor: FaseFiltro; etiqueta: string }[] = [
  { valor: 'predio', etiqueta: 'En el predio' },
  ...FASES.map((f) => ({ valor: f.valor, etiqueta: f.plural })),
  { valor: 'todos', etiqueta: 'Todos' },
]

export function validarInventario(search: Partial<FiltrosInventario> & SearchSchemaInput): FiltrosInventario {
  const pagina = Number(search.pagina)
  return {
    vista: search.vista === 'tarjetas' || search.vista === 'tabla' ? search.vista : vistaGuardada(),
    fase: esUno(FASES_FILTRO, search.fase) ? search.fase : INVENTARIO_DEFAULT.fase,
    q: typeof search.q === 'string' ? search.q.slice(0, 60) : '',
    orden: esUno(ORDENES, search.orden) ? search.orden : 'reciente',
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  }
}

export const POR_PAGINA = 20

// ------------------------------------------------------------------ Reporte de inventario

/** El reporte es de lo que hay en el predio: los vendidos ya no tienen precio pedido ni ganancia esperada. */
export type FaseReporte = 'predio' | 'preparacion' | 'disponible'

export const FASES_REPORTE: { valor: FaseReporte; etiqueta: string }[] = [
  { valor: 'predio', etiqueta: 'Todo el predio' },
  { valor: 'preparacion', etiqueta: 'En preparación' },
  { valor: 'disponible', etiqueta: 'A la venta' },
]

export function validarReporteInventario(search: { fase?: unknown } & SearchSchemaInput): { fase: FaseReporte } {
  return { fase: esUno(FASES_REPORTE, search.fase) ? search.fase : 'predio' }
}

/** Desde una pestaña del inventario: Vendidos y Todos se reportan como todo el predio. */
export const faseReporteDe = (f: FaseFiltro): FaseReporte => (f === 'preparacion' || f === 'disponible' ? f : 'predio')

// ------------------------------------------------------------------ Reporte mensual

export interface FiltrosReporte {
  /** Mes como 'AAAA-MM' */
  mes: string
}

const claveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const hoy = new Date()

/** Por defecto, el último mes cerrado. */
export const MES_REPORTE_DEFAULT = claveMes(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1))
export const MES_ACTUAL = claveMes(hoy)

export function validarReporte(search: Partial<FiltrosReporte> & SearchSchemaInput): FiltrosReporte {
  const mes = typeof search.mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(search.mes) && search.mes <= MES_ACTUAL ? search.mes : MES_REPORTE_DEFAULT
  return { mes }
}

/** 'AAAA-MM' a la fecha del primer día del mes */
export const inicioDeClave = (clave: string) => {
  const [a, m] = clave.split('-').map(Number)
  return new Date(a, m - 1, 1).getTime()
}

// ------------------------------------------------------------------ Clientes

export type TipoCliente = 'todos' | 'compradores' | 'vendedores'

export interface FiltrosClientes {
  tipo: TipoCliente
  q: string
  pagina: number
}

export const CLIENTES_DEFAULT: FiltrosClientes = { tipo: 'todos', q: '', pagina: 1 }

export const TIPOS_CLIENTE: { valor: TipoCliente; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'compradores', etiqueta: 'Compraron un auto' },
  { valor: 'vendedores', etiqueta: 'Vendieron al predio' },
]

export function validarClientes(search: Partial<FiltrosClientes> & SearchSchemaInput): FiltrosClientes {
  const pagina = Number(search.pagina)
  return {
    tipo: esUno(TIPOS_CLIENTE, search.tipo) ? search.tipo : 'todos',
    q: typeof search.q === 'string' ? search.q.slice(0, 60) : '',
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  }
}
