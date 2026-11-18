/**
 * Endpoints simulados. Tienen la misma forma que tendrá la API en Go:
 * las pantallas reciben totales ya calculados y listas paginadas, nunca
 * el inventario completo. Al conectar la API solo cambia este archivo.
 */

import * as store from './store'
import {
  etiquetaGasto,
  DIA,
  DIAS_ALERTA,
  TIPOS_GASTO,
  nombreVehiculo,
  nombreCliente,
  type Carroceria,
  type Cliente,
  type Fase,
  type FichaTecnica,
  type Modalidad,
  type FormaPago,
  type TipoGasto,
  type Vehiculo,
  type VehiculoConTotales,
} from './tipos'
import { POR_PAGINA, type FaseReporte, type Filtros, type FiltrosClientes, type FiltrosInventario } from '@/lib/filtros'
import { validarCorreo, validarDpi, validarNit, validarTelefono, validarVin } from '@/lib/validar'

const espera = (ms = 120 + Math.random() * 160) => new Promise((r) => setTimeout(r, ms))

// ------------------------------------------------------------------ Cálculos por vehículo

export function faseDe(v: Vehiculo): Fase {
  return v.venta ? 'vendido' : v.fechaDisponible !== null ? 'disponible' : 'preparacion'
}

function conTotales(v: Vehiculo, ahora: number): VehiculoConTotales {
  const totalGastos = v.gastos.reduce((s, g) => s + g.monto, 0)
  const costoTotal = v.precioCompra + totalGastos
  const fin = v.venta?.fecha ?? ahora
  return {
    ...v,
    fase: faseDe(v),
    totalGastos,
    costoTotal,
    ganancia: v.venta ? v.venta.precio - costoTotal : null,
    dias: Math.max(0, Math.floor((fin - v.fechaCompra) / DIA)),
  }
}

// ------------------------------------------------------------------ Períodos

interface Ventana {
  desde: number
  hasta: number
  antDesde: number
  antHasta: number
  comparacion: string
}

const inicioMes = (anio: number, mes: number) => new Date(anio, mes, 1).getTime()
const inicioDia = (ms: number) => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
/** Misma fecha N meses atrás (si el día no existe, el último día de ese mes). */
function mesesAtras(ms: number, n: number) {
  const d = new Date(ms)
  const objetivo = new Date(d.getFullYear(), d.getMonth() - n, 1)
  const ultimo = new Date(objetivo.getFullYear(), objetivo.getMonth() + 1, 0).getDate()
  objetivo.setDate(Math.min(d.getDate(), ultimo))
  objetivo.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())
  return objetivo.getTime()
}

function ventana(rango: Filtros['rango'], ahora: number): Ventana {
  const hoy = new Date(ahora)
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  switch (rango) {
    case 'mes':
      return {
        desde: inicioMes(y, m),
        hasta: ahora,
        antDesde: inicioMes(y, m - 1),
        antHasta: Math.min(mesesAtras(ahora, 1), inicioMes(y, m) - 1),
        comparacion: 'vs. mes pasado al mismo día',
      }
    case 'mes-pasado':
      return {
        desde: inicioMes(y, m - 1),
        hasta: inicioMes(y, m) - 1,
        antDesde: inicioMes(y, m - 2),
        antHasta: inicioMes(y, m - 1) - 1,
        comparacion: 'vs. el mes anterior',
      }
    case 'anio':
      return {
        desde: inicioMes(y, 0),
        hasta: ahora,
        antDesde: inicioMes(y - 1, 0),
        antHasta: mesesAtras(ahora, 12),
        comparacion: 'vs. el año pasado a esta fecha',
      }
    default: {
      const n = rango === '3m' ? 3 : rango === '6m' ? 6 : 12
      const desde = inicioDia(mesesAtras(ahora, n)) + DIA
      return {
        desde,
        hasta: ahora,
        antDesde: inicioDia(mesesAtras(desde, n)),
        antHasta: desde - 1,
        comparacion: `vs. los ${n} meses anteriores`,
      }
    }
  }
}

// ------------------------------------------------------------------ Resumen

export interface Totales {
  /** Dinero que entró por autos vendidos */
  ventas: number
  /** Compras de autos + todos los demás gastos */
  gastos: number
  compras: number
  otrosGastos: number
  /** Ventas menos el costo total de los autos vendidos */
  ganancia: number
  vendidos: number
  /** Costo total (compra + gastos) de los autos vendidos */
  costoVendidos: number
  comprados: number
}

export interface FilaVendido {
  id: string
  nombre: string
  placa: string
  fecha: number
  precio: number
  costo: number
  ganancia: number
  dias: number
}

export interface FilaSinVender {
  id: string
  nombre: string
  placa: string
  fase: Fase
  dias: number
  costo: number
}

export interface ResumenData {
  periodo: { rango: Filtros['rango']; desde: number; hasta: number; comparacion: string }
  actual: Totales
  anterior: Totales
  /** Mes a mes; si el período es corto, se completan los últimos 6 meses */
  meses: { mes: number; ganancia: number; compras: number; otrosGastos: number; vendidos: number }[]
  mesesExtendidos: boolean
  gastosPorTipo: { clave: TipoGasto | 'compra'; etiqueta: string; monto: number }[]
  masRentables: FilaVendido[]
  menosRentables: FilaVendido[]
  sinVender: {
    invertido: number
    unidades: number
    enPreparacion: number
    aLaVenta: number
    atrasados: { unidades: number; invertido: number }
    listaAtrasados: FilaSinVender[]
  }
}

const enRango = (t: number, desde: number, hasta: number) => t >= desde && t <= hasta

function totales(vs: VehiculoConTotales[], desde: number, hasta: number): Totales {
  const t: Totales = { ventas: 0, gastos: 0, compras: 0, otrosGastos: 0, ganancia: 0, vendidos: 0, costoVendidos: 0, comprados: 0 }
  for (const v of vs) {
    if (v.venta && enRango(v.venta.fecha, desde, hasta)) {
      t.ventas += v.venta.precio
      t.ganancia += v.ganancia ?? 0
      t.costoVendidos += v.costoTotal
      t.vendidos++
    }
    if (enRango(v.fechaCompra, desde, hasta)) {
      t.compras += v.precioCompra
      t.comprados++
    }
    for (const g of v.gastos) if (enRango(g.fecha, desde, hasta)) t.otrosGastos += g.monto
  }
  t.gastos = t.compras + t.otrosGastos
  return t
}

function todos(ahora: number) {
  return store.leer().vehiculos.map((v) => conTotales(v, ahora))
}

export async function getResumen(f: Filtros): Promise<ResumenData> {
  await espera()
  const ahora = Date.now()
  const w = ventana(f.rango, ahora)
  const vs = todos(ahora)

  // Mes a mes (mínimo 6 meses para que el gráfico tenga contexto)
  const fin = new Date(w.hasta)
  const ini = new Date(w.desde)
  const nMeses = (fin.getFullYear() - ini.getFullYear()) * 12 + fin.getMonth() - ini.getMonth() + 1
  const totalMeses = Math.max(6, nMeses)
  const meses = Array.from({ length: totalMeses }, (_, i) => {
    const desde = inicioMes(fin.getFullYear(), fin.getMonth() - (totalMeses - 1 - i))
    const hasta = inicioMes(fin.getFullYear(), fin.getMonth() - (totalMeses - 1 - i) + 1) - 1
    const t = totales(vs, desde, Math.min(hasta, w.hasta))
    return { mes: desde, ganancia: t.ganancia, compras: t.compras, otrosGastos: t.otrosGastos, vendidos: t.vendidos }
  })

  // ¿En qué se gasta?
  const porTipo = new Map<TipoGasto, number>()
  let compras = 0
  for (const v of vs) {
    if (enRango(v.fechaCompra, w.desde, w.hasta)) compras += v.precioCompra
    for (const g of v.gastos)
      if (enRango(g.fecha, w.desde, w.hasta)) porTipo.set(g.tipo, (porTipo.get(g.tipo) ?? 0) + g.monto)
  }
  const gastosPorTipo: ResumenData['gastosPorTipo'] = [
    { clave: 'compra' as const, etiqueta: 'Compra de vehículos', monto: compras },
    ...TIPOS_GASTO.map((t) => ({ clave: t.valor, etiqueta: etiquetaGasto(t.valor), monto: porTipo.get(t.valor) ?? 0 })),
  ]
    .filter((g) => g.monto > 0)
    .sort((a, b) => b.monto - a.monto)

  // Autos vendidos en el período, por ganancia
  const vendidos: FilaVendido[] = vs
    .filter((v) => v.venta && enRango(v.venta.fecha, w.desde, w.hasta))
    .map((v) => ({
      id: v.id,
      nombre: nombreVehiculo(v),
      placa: v.placa,
      fecha: v.venta!.fecha,
      precio: v.venta!.precio,
      costo: v.costoTotal,
      ganancia: v.ganancia ?? 0,
      dias: v.dias,
    }))
    .sort((a, b) => b.ganancia - a.ganancia)
  const nMas = Math.min(5, Math.ceil(vendidos.length / 2))
  const masRentables = vendidos.slice(0, nMas)
  const menosRentables = vendidos.slice(nMas).reverse().slice(0, 5)

  // Lo que hay en el predio hoy (no depende del período)
  const enPredio = vs.filter((v) => v.fase !== 'vendido')
  const atrasados = enPredio.filter((v) => v.dias > DIAS_ALERTA).sort((a, b) => b.dias - a.dias)

  return {
    periodo: {
      rango: f.rango,
      desde: w.desde,
      hasta: w.hasta,
      comparacion: w.comparacion,
    },
    actual: totales(vs, w.desde, w.hasta),
    anterior: totales(vs, w.antDesde, w.antHasta),
    meses,
    mesesExtendidos: nMeses < totalMeses,
    gastosPorTipo,
    masRentables,
    menosRentables,
    sinVender: {
      invertido: enPredio.reduce((s, v) => s + v.costoTotal, 0),
      unidades: enPredio.length,
      enPreparacion: enPredio.filter((v) => v.fase === 'preparacion').length,
      aLaVenta: enPredio.filter((v) => v.fase === 'disponible').length,
      atrasados: { unidades: atrasados.length, invertido: atrasados.reduce((s, v) => s + v.costoTotal, 0) },
      listaAtrasados: atrasados.slice(0, 6).map((v) => ({
        id: v.id,
        nombre: nombreVehiculo(v),
        placa: v.placa,
        fase: v.fase,
        dias: v.dias,
        costo: v.costoTotal,
      })),
    },
  }
}

// ------------------------------------------------------------------ Inventario

export type FilaInventario = Omit<VehiculoConTotales, 'gastos' | 'notas'>

export interface InventarioData {
  filas: FilaInventario[]
  total: number
  pagina: number
  paginas: number
  conteos: Record<'todos' | 'predio' | Fase, number>
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** La lista no necesita el detalle de gastos ni las notas de cada vehículo. */
function sinGastos(v: VehiculoConTotales): FilaInventario {
  const resto: Partial<VehiculoConTotales> = { ...v }
  delete resto.gastos
  delete resto.notas
  return resto as FilaInventario
}

export async function getInventario(f: FiltrosInventario): Promise<InventarioData> {
  await espera()
  const ahora = Date.now()
  const q = normalizar(f.q)
  const terminos = q ? q.split(/\s+/) : []
  const base = todos(ahora).filter((v) => {
    if (!terminos.length) return true
    const texto = normalizar(`${v.marca} ${v.modelo} ${v.anio} ${v.placa} ${v.id} ${v.ficha.vin} ${v.ficha.color}`)
    return terminos.every((t) => texto.includes(t))
  })

  const conteos = { todos: base.length, predio: 0, preparacion: 0, disponible: 0, vendido: 0 }
  for (const v of base) conteos[v.fase]++
  conteos.predio = conteos.preparacion + conteos.disponible

  const filtradas =
    f.fase === 'todos'
      ? base
      : f.fase === 'predio'
        ? base.filter((v) => v.fase !== 'vendido')
        : base.filter((v) => v.fase === f.fase)
  const orden: Record<FiltrosInventario['orden'], (a: VehiculoConTotales, b: VehiculoConTotales) => number> = {
    reciente: (a, b) => b.fechaCompra - a.fechaCompra,
    dias: (a, b) => b.dias - a.dias,
    costo: (a, b) => b.costoTotal - a.costoTotal,
    ganancia: (a, b) => (b.ganancia ?? -Infinity) - (a.ganancia ?? -Infinity),
  }
  filtradas.sort(orden[f.orden])

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const pagina = Math.min(f.pagina, paginas)
  const filas = filtradas
    .slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
    .map(sinGastos)

  return { filas, total: filtradas.length, pagina, paginas, conteos }
}

/** Detalle: el vehículo con sus totales y los clientes con los que se hizo el negocio. */
export interface DetalleVehiculo extends VehiculoConTotales {
  proveedor: Cliente | null
  comprador: Cliente | null
}

export async function getVehiculo(id: string): Promise<DetalleVehiculo | null> {
  await espera(100)
  const v = store.buscar(id)
  if (!v) return null
  return {
    ...conTotales(v, Date.now()),
    notas: [...v.notas].sort((a, b) => b.fecha - a.fecha),
    proveedor: store.buscarCliente(v.proveedorId) ?? null,
    comprador: store.buscarCliente(v.venta?.compradorId ?? null) ?? null,
  }
}

// ------------------------------------------------------------------ Registro (escrituras)

export class ErrorValidacion extends Error {}

function exigir(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new ErrorValidacion(mensaje)
}

function obtener(id: string): Vehiculo {
  const v = store.buscar(id)
  exigir(v, 'El vehículo ya no existe.')
  return v
}

const noFutura = (fecha: number) => fecha <= Date.now() + DIA

export interface CompraInput {
  marca: string
  modelo: string
  anio: number
  carroceria: Carroceria
  placa: string
  fechaCompra: number
  precioCompra: number
  modalidad: Modalidad
  ficha: FichaTecnica
  proveedorId: string
}

function validarFicha(f: FichaTecnica): FichaTecnica {
  exigir(f.color.trim(), 'Escribe el color.')
  exigir(Number.isInteger(f.kilometraje) && f.kilometraje >= 0 && f.kilometraje < 2_000_000, 'Revisa el kilometraje.')
  const vin = validarVin(f.vin)
  exigir(vin.ok, vin.ok ? '' : vin.error)
  return { ...f, color: f.color.trim(), vin: vin.valor, numeroMotor: f.numeroMotor.trim().toUpperCase() }
}

function exigirVinUnico(vin: string, excepto?: string) {
  if (!vin) return
  const otro = store.leer().vehiculos.find((v) => v.ficha.vin === vin && v.id !== excepto)
  exigir(!otro, `Ya hay un vehículo con este VIN: ${otro ? `${nombreVehiculo(otro)} (${otro.id})` : ''}.`)
}

export async function registrarCompra(input: CompraInput): Promise<string> {
  await espera()
  exigir(input.marca.trim() && input.modelo.trim(), 'Escribe la marca y el modelo.')
  exigir(input.precioCompra > 0, 'El precio de compra debe ser mayor que cero.')
  exigir(noFutura(input.fechaCompra), 'La fecha de compra no puede ser futura.')
  exigir(store.buscarCliente(input.proveedorId), 'Elige o registra a quién se le compró el vehículo.')
  const ficha = validarFicha(input.ficha)
  exigirVinUnico(ficha.vin)
  const v: Vehiculo = {
    id: store.nuevoIdVehiculo(),
    marca: input.marca.trim(),
    modelo: input.modelo.trim(),
    anio: input.anio,
    carroceria: input.carroceria,
    placa: input.placa.trim().toUpperCase(),
    fechaCompra: input.fechaCompra,
    precioCompra: input.precioCompra,
    fechaDisponible: null,
    precioPedido: null,
    venta: null,
    gastos: [],
    modalidad: input.modalidad,
    ficha,
    proveedorId: input.proveedorId,
    notas: [],
  }
  store.leer().vehiculos.push(v)
  store.guardar()
  return v.id
}

export interface GastoInput {
  fecha: number
  tipo: TipoGasto
  descripcion: string
  monto: number
}

export async function agregarGasto(id: string, input: GastoInput) {
  await espera()
  const v = obtener(id)
  exigir(input.monto > 0, 'El monto debe ser mayor que cero.')
  exigir(input.fecha >= inicioDia(v.fechaCompra), 'El gasto no puede ser anterior a la compra.')
  exigir(noFutura(input.fecha), 'La fecha del gasto no puede ser futura.')
  v.gastos.push({
    id: store.nuevoIdGasto(),
    fecha: input.fecha,
    tipo: input.tipo,
    descripcion: input.descripcion.trim() || etiquetaGasto(input.tipo),
    monto: input.monto,
  })
  v.gastos.sort((a, b) => a.fecha - b.fecha)
  store.guardar()
}

export async function eliminarGasto(id: string, gastoId: string) {
  await espera()
  const v = obtener(id)
  v.gastos = v.gastos.filter((g) => g.id !== gastoId)
  store.guardar()
}

export async function ponerALaVenta(id: string, input: { fecha: number; precioPedido: number }) {
  await espera()
  const v = obtener(id)
  exigir(!v.venta, 'Este vehículo ya se vendió.')
  exigir(input.precioPedido > 0, 'El precio de venta debe ser mayor que cero.')
  exigir(input.fecha >= inicioDia(v.fechaCompra), 'La fecha no puede ser anterior a la compra.')
  exigir(noFutura(input.fecha), 'La fecha no puede ser futura.')
  v.fechaDisponible = input.fecha
  v.precioPedido = input.precioPedido
  store.guardar()
}

export interface VentaInput {
  fecha: number
  precio: number
  vendedor: string
  formaPago: FormaPago
  comision: number
  compradorId: string
}

export async function registrarVenta(id: string, input: VentaInput) {
  await espera()
  const v = obtener(id)
  exigir(!v.venta, 'Este vehículo ya se vendió.')
  exigir(input.precio > 0, 'El precio de venta debe ser mayor que cero.')
  exigir(input.comision >= 0, 'La comisión no puede ser negativa.')
  exigir(input.fecha >= inicioDia(v.fechaCompra), 'La fecha de venta no puede ser anterior a la compra.')
  exigir(noFutura(input.fecha), 'La fecha de venta no puede ser futura.')
  exigir(input.vendedor, 'Elige quién lo vendió.')
  exigir(store.buscarCliente(input.compradorId), 'Elige o registra al comprador.')
  v.fechaDisponible ??= input.fecha
  v.venta = {
    fecha: input.fecha,
    precio: input.precio,
    vendedor: input.vendedor,
    formaPago: input.formaPago,
    compradorId: input.compradorId,
  }
  if (input.comision > 0) {
    v.gastos.push({
      id: store.nuevoIdGasto(),
      fecha: input.fecha,
      tipo: 'comision',
      descripcion: `Comisión de ${input.vendedor}`,
      monto: input.comision,
    })
  }
  store.guardar()
}

// ------------------------------------------------------------------ Reporte de inventario

export interface FilaReporteInventario {
  id: string
  nombre: string
  detalle: string
  modalidad: Modalidad
  dias: number
  costo: number
  pedido: number | null
  ganancia: number | null
}

/** Sumas de un grupo de autos. La ganancia esperada solo cuenta los que ya tienen precio. */
export interface SumaInventario {
  unidades: number
  costo: number
  pedido: number
  ganancia: number
  sinPrecio: number
}

export interface ReporteInventarioData {
  fecha: number
  fase: FaseReporte
  /** Autos del predio: su costo sí es dinero que puso el predio */
  propios: SumaInventario
  /** En consignación: el costo es lo acordado con el dueño, que se paga al vender */
  consignacion: SumaInventario
  porFase: { etiqueta: string; unidades: number }[]
  porDias: { etiqueta: string; unidades: number; alerta: boolean }[]
  grupos: { fase: Fase; etiqueta: string; filas: FilaReporteInventario[]; total: SumaInventario }[]
}

function sumar(vs: VehiculoConTotales[]): SumaInventario {
  const s = { unidades: vs.length, costo: 0, pedido: 0, ganancia: 0, sinPrecio: 0 }
  for (const v of vs) {
    s.costo += v.costoTotal
    if (v.precioPedido === null) s.sinPrecio++
    else {
      s.pedido += v.precioPedido
      s.ganancia += v.precioPedido - v.costoTotal
    }
  }
  return s
}

export async function getReporteInventario(fase: FaseReporte): Promise<ReporteInventarioData> {
  await espera()
  const ahora = Date.now()
  const vs = todos(ahora).filter((v) => (fase === 'predio' ? v.fase !== 'vendido' : v.fase === fase))
  const fases: Fase[] = fase === 'predio' ? ['preparacion', 'disponible'] : [fase]
  const etiqueta = (f: Fase) => (f === 'preparacion' ? 'En preparación' : 'A la venta')

  return {
    fecha: ahora,
    fase,
    propios: sumar(vs.filter((v) => v.modalidad === 'propio')),
    consignacion: sumar(vs.filter((v) => v.modalidad === 'consignacion')),
    porFase: fases.map((f) => ({ etiqueta: etiqueta(f), unidades: vs.filter((v) => v.fase === f).length })),
    porDias: [
      { etiqueta: '0 a 30 días', unidades: vs.filter((v) => v.dias <= 30).length, alerta: false },
      { etiqueta: `31 a ${DIAS_ALERTA} días`, unidades: vs.filter((v) => v.dias > 30 && v.dias <= DIAS_ALERTA).length, alerta: false },
      { etiqueta: `Más de ${DIAS_ALERTA} días`, unidades: vs.filter((v) => v.dias > DIAS_ALERTA).length, alerta: true },
    ],
    grupos: fases.map((f) => {
      const delGrupo = vs.filter((v) => v.fase === f).sort((a, b) => b.dias - a.dias)
      return {
        fase: f,
        etiqueta: etiqueta(f),
        total: sumar(delGrupo),
        filas: delGrupo.map((v) => ({
          id: v.id,
          nombre: nombreVehiculo(v),
          detalle: [v.placa || 'Sin placa', v.ficha.color, `${v.ficha.kilometraje.toLocaleString('es-GT')} km`].join(', '),
          modalidad: v.modalidad,
          dias: v.dias,
          costo: v.costoTotal,
          pedido: v.precioPedido,
          ganancia: v.precioPedido !== null ? v.precioPedido - v.costoTotal : null,
        })),
      }
    }),
  }
}

// ------------------------------------------------------------------ Ficha técnica

export interface FichaInput {
  marca: string
  modelo: string
  anio: number
  carroceria: Carroceria
  placa: string
  modalidad: Modalidad
  ficha: FichaTecnica
}

export async function actualizarFicha(id: string, input: FichaInput) {
  await espera()
  const v = obtener(id)
  exigir(input.marca.trim() && input.modelo.trim(), 'Escribe la marca y el modelo.')
  const ficha = validarFicha(input.ficha)
  exigirVinUnico(ficha.vin, id)
  v.marca = input.marca.trim()
  v.modelo = input.modelo.trim()
  v.anio = input.anio
  v.carroceria = input.carroceria
  v.placa = input.placa.trim().toUpperCase()
  v.modalidad = input.modalidad
  v.ficha = ficha
  store.guardar()
}

/** Cambia el cliente que le vendió el auto al predio o el que lo compró. */
export async function asignarCliente(id: string, rol: 'proveedor' | 'comprador', clienteId: string) {
  await espera()
  const v = obtener(id)
  exigir(store.buscarCliente(clienteId), 'Ese cliente ya no existe.')
  if (rol === 'proveedor') v.proveedorId = clienteId
  else {
    exigir(v.venta, 'El vehículo todavía no se ha vendido.')
    v.venta.compradorId = clienteId
  }
  store.guardar()
}

// ------------------------------------------------------------------ Anotaciones

export async function agregarNota(id: string, input: { texto: string; conFoto: boolean }): Promise<string> {
  await espera()
  const v = obtener(id)
  const texto = input.texto.trim()
  exigir(texto || input.conFoto, 'Escribe la anotación o agrega una foto.')
  exigir(texto.length <= 1000, 'La anotación es muy larga (máximo 1,000 caracteres).')
  const nota = { id: store.nuevoIdNota(), fecha: Date.now(), texto, conFoto: input.conFoto }
  v.notas.push(nota)
  store.guardar()
  return nota.id
}

export async function eliminarNota(id: string, notaId: string) {
  await espera()
  const v = obtener(id)
  v.notas = v.notas.filter((n) => n.id !== notaId)
  store.guardar()
}

// ------------------------------------------------------------------ Clientes

export interface ClienteInput {
  nombres: string
  apellidos: string
  telefono: string
  correo: string
  dpi: string
  nit: string
  direccion: string
}

export interface FilaCliente extends Cliente {
  /** Autos que le vendió (o dejó en consignación) al predio */
  vendio: number
  /** Autos que le compró al predio */
  compro: number
  /** Fecha del último negocio con el predio */
  ultimo: number
}

export interface ClientesData {
  filas: FilaCliente[]
  total: number
  pagina: number
  paginas: number
  conteos: Record<FiltrosClientes['tipo'], number>
}

/** Negocios de cada cliente, calculados de una pasada por el inventario. */
function negocios() {
  const m = new Map<string, { vendio: number; compro: number; ultimo: number }>()
  const sumar = (id: string | null, campo: 'vendio' | 'compro', fecha: number) => {
    if (!id) return
    const n = m.get(id) ?? { vendio: 0, compro: 0, ultimo: 0 }
    n[campo]++
    n.ultimo = Math.max(n.ultimo, fecha)
    m.set(id, n)
  }
  for (const v of store.leer().vehiculos) {
    sumar(v.proveedorId, 'vendio', v.fechaCompra)
    if (v.venta) sumar(v.venta.compradorId, 'compro', v.venta.fecha)
  }
  return m
}

const textoCliente = (c: Cliente) => normalizar(`${nombreCliente(c)} ${c.dpi} ${c.nit} ${c.telefono} ${c.correo}`)

export async function getClientes(f: FiltrosClientes): Promise<ClientesData> {
  await espera()
  const n = negocios()
  const terminos = normalizar(f.q).replace(/-/g, '').split(/\s+/).filter(Boolean)
  const base: FilaCliente[] = store
    .leer()
    .clientes.filter((c) => terminos.every((t) => textoCliente(c).includes(t)))
    .map((c) => ({ ...c, vendio: 0, compro: 0, ultimo: c.creado, ...n.get(c.id) }))
  const conteos = {
    todos: base.length,
    compradores: base.filter((c) => c.compro > 0).length,
    vendedores: base.filter((c) => c.vendio > 0).length,
  }
  const filtradas =
    f.tipo === 'compradores' ? base.filter((c) => c.compro > 0) : f.tipo === 'vendedores' ? base.filter((c) => c.vendio > 0) : base
  filtradas.sort((a, b) => b.ultimo - a.ultimo)
  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const pagina = Math.min(f.pagina, paginas)
  return { filas: filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), total: filtradas.length, pagina, paginas, conteos }
}

/** Búsqueda corta para elegir un cliente dentro de un formulario. */
export async function buscarClientes(q: string): Promise<Cliente[]> {
  await espera(80)
  const terminos = normalizar(q).replace(/-/g, '').split(/\s+/).filter(Boolean)
  if (!terminos.length) return []
  return store
    .leer()
    .clientes.filter((c) => terminos.every((t) => textoCliente(c).includes(t)))
    .sort((a, b) => b.creado - a.creado)
    .slice(0, 6)
}

export interface NegocioCliente {
  vehiculoId: string
  vehiculo: string
  tipo: 'vendio' | 'compro'
  modalidad: Modalidad
  fecha: number
  monto: number
}

export interface DetalleCliente extends Cliente {
  negocios: NegocioCliente[]
}

export async function getCliente(id: string): Promise<DetalleCliente | null> {
  await espera(100)
  const c = store.buscarCliente(id)
  if (!c) return null
  const lista: NegocioCliente[] = []
  for (const v of store.leer().vehiculos) {
    const base = { vehiculoId: v.id, vehiculo: nombreVehiculo(v), modalidad: v.modalidad }
    if (v.proveedorId === id) lista.push({ ...base, tipo: 'vendio', fecha: v.fechaCompra, monto: v.precioCompra })
    if (v.venta?.compradorId === id) lista.push({ ...base, tipo: 'compro', fecha: v.venta.fecha, monto: v.venta.precio })
  }
  return { ...c, negocios: lista.sort((a, b) => b.fecha - a.fecha) }
}

/** Valida y normaliza los datos; los errores vienen por campo para mostrarlos junto a cada uno. */
export class ErrorCampos extends Error {
  campos: Record<string, string>
  constructor(campos: Record<string, string>) {
    super('Revisa los datos marcados.')
    this.campos = campos
  }
}

function normalizarCliente(input: ClienteInput, excepto?: string): Omit<Cliente, 'id' | 'creado'> {
  const err: Record<string, string> = {}
  const nombres = input.nombres.trim().replace(/\s+/g, ' ')
  const apellidos = input.apellidos.trim().replace(/\s+/g, ' ')
  if (!nombres) err.nombres = 'Escribe los nombres.'
  if (!apellidos) err.apellidos = 'Escribe los apellidos.'
  const tel = validarTelefono(input.telefono)
  const correo = validarCorreo(input.correo)
  const dpi = validarDpi(input.dpi)
  const nit = validarNit(input.nit)
  if (!tel.ok) err.telefono = tel.error
  if (!correo.ok) err.correo = correo.error
  if (!dpi.ok) err.dpi = dpi.error
  if (!nit.ok) err.nit = nit.error
  if (dpi.ok) {
    const otro = store.leer().clientes.find((c) => c.dpi === dpi.valor && c.id !== excepto)
    if (otro) err.dpi = `Ya está registrado: ${nombreCliente(otro)}. Búscalo por su nombre o DPI.`
  }
  if (Object.keys(err).length || !tel.ok || !correo.ok || !dpi.ok || !nit.ok) throw new ErrorCampos(err)
  return { nombres, apellidos, telefono: tel.valor, correo: correo.valor, dpi: dpi.valor, nit: nit.valor, direccion: input.direccion.trim() }
}

export async function registrarCliente(input: ClienteInput): Promise<Cliente> {
  await espera()
  const c: Cliente = { id: store.nuevoIdCliente(), creado: Date.now(), ...normalizarCliente(input) }
  store.leer().clientes.push(c)
  store.guardar()
  return c
}

export async function actualizarCliente(id: string, input: ClienteInput) {
  await espera()
  const c = store.buscarCliente(id)
  exigir(c, 'Este cliente ya no existe.')
  Object.assign(c, normalizarCliente(input, id))
  store.guardar()
}

export async function restablecerDatos() {
  await espera()
  store.restablecer()
  await (await import('./fotos')).borrarTodas()
}

// ------------------------------------------------------------------ Reporte mensual

export interface FilaReporteVendido {
  id: string
  nombre: string
  placa: string
  fecha: number
  precio: number
  costo: number
  ganancia: number
}

export interface FilaReporteAtrasado {
  id: string
  nombre: string
  placa: string
  dias: number
  costo: number
}

export interface ReporteMesData {
  /** Primer día del mes */
  mes: number
  desde: number
  hasta: number
  /** false si el mes aún no termina (el reporte llega hasta hoy) */
  completo: boolean
  actual: Totales
  anterior: Totales
  /** Ganancia de los últimos 6 meses, terminando en el mes del reporte */
  meses: { mes: number; ganancia: number }[]
  gastosPorTipo: { etiqueta: string; monto: number }[]
  vendidos: FilaReporteVendido[]
  /** Autos en el predio al cierre del mes */
  predio: { unidades: number; invertido: number; atrasados: FilaReporteAtrasado[]; totalAtrasados: number }
  generado: number
}

/** Meses con datos, del más reciente al más antiguo, como 'AAAA-MM'. */
export async function getMesesReporte(): Promise<string[]> {
  const vs = store.leer().vehiculos
  const ahora = new Date()
  const primero = new Date(Math.min(...vs.map((v) => v.fechaCompra)))
  const lista: string[] = []
  for (let d = new Date(ahora.getFullYear(), ahora.getMonth(), 1); d >= new Date(primero.getFullYear(), primero.getMonth(), 1); d.setMonth(d.getMonth() - 1))
    lista.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  return lista
}

export async function getReporteMes(clave: string): Promise<ReporteMesData> {
  await espera()
  const ahora = Date.now()
  const [anio, mes0] = clave.split('-').map(Number)
  const m = mes0 - 1
  const desde = inicioMes(anio, m)
  const finMes = inicioMes(anio, m + 1) - 1
  const completo = finMes < ahora
  const hasta = Math.min(finMes, ahora)
  // Mes en curso: se compara con el mes anterior hasta el mismo día.
  const antDesde = inicioMes(anio, m - 1)
  const antHasta = completo ? desde - 1 : Math.min(mesesAtras(ahora, 1), desde - 1)
  const vs = todos(ahora)

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = inicioMes(anio, m - 5 + i)
    const h = Math.min(inicioMes(anio, m - 4 + i) - 1, hasta)
    return { mes: d, ganancia: totales(vs, d, h).ganancia }
  })

  const porTipo = new Map<string, number>()
  const sumar = (k: string, monto: number) => porTipo.set(k, (porTipo.get(k) ?? 0) + monto)
  for (const v of vs) {
    if (enRango(v.fechaCompra, desde, hasta)) sumar('Compra de autos', v.precioCompra)
    for (const g of v.gastos) if (enRango(g.fecha, desde, hasta)) sumar(etiquetaGasto(g.tipo), g.monto)
  }
  const gastosPorTipo = [...porTipo].map(([etiqueta, monto]) => ({ etiqueta, monto })).sort((a, b) => b.monto - a.monto)

  const vendidos = vs
    .filter((v) => v.venta && enRango(v.venta.fecha, desde, hasta))
    .map((v) => ({
      id: v.id,
      nombre: nombreVehiculo(v),
      placa: v.placa,
      fecha: v.venta!.fecha,
      precio: v.venta!.precio,
      costo: v.costoTotal,
      ganancia: v.ganancia ?? 0,
    }))
    .sort((a, b) => a.fecha - b.fecha)

  // Foto del predio al cierre: comprados hasta esa fecha y sin vender en ese momento.
  const enPredio = vs
    .filter((v) => v.fechaCompra <= hasta && (!v.venta || v.venta.fecha > hasta))
    .map((v) => ({
      id: v.id,
      nombre: nombreVehiculo(v),
      placa: v.placa,
      dias: Math.floor((hasta - v.fechaCompra) / DIA),
      costo: v.precioCompra + v.gastos.filter((g) => g.fecha <= hasta).reduce((s, g) => s + g.monto, 0),
    }))
  const atrasados = enPredio.filter((v) => v.dias > DIAS_ALERTA).sort((a, b) => b.dias - a.dias)

  return {
    mes: desde,
    desde,
    hasta,
    completo,
    actual: totales(vs, desde, hasta),
    anterior: totales(vs, antDesde, antHasta),
    meses,
    gastosPorTipo,
    vendidos,
    predio: {
      unidades: enPredio.length,
      invertido: enPredio.reduce((s, v) => s + v.costo, 0),
      atrasados: atrasados.slice(0, 10),
      totalAtrasados: atrasados.length,
    },
    generado: ahora,
  }
}
