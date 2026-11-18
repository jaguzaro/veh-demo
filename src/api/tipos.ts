/**
 * Tipos y catálogos compartidos entre la capa de datos y las pantallas.
 * Es liviano a propósito: se importa en el bundle inicial.
 */

export type Carroceria = 'SUV' | 'Pickup' | 'Sedán' | 'Hatchback' | 'Microbús'
export const CARROCERIAS: Carroceria[] = ['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Microbús']

export type FormaPago = 'Contado' | 'Financiamiento' | 'Trade-in'
export const FORMAS_PAGO: FormaPago[] = ['Contado', 'Financiamiento', 'Trade-in']

export type TipoGasto =
  | 'mecanica'
  | 'pintura'
  | 'llantas'
  | 'limpieza'
  | 'tramites'
  | 'traslado'
  | 'publicidad'
  | 'comision'
  | 'otro'

export const TIPOS_GASTO: { valor: TipoGasto; etiqueta: string }[] = [
  { valor: 'mecanica', etiqueta: 'Mecánica' },
  { valor: 'pintura', etiqueta: 'Pintura y enderezado' },
  { valor: 'llantas', etiqueta: 'Llantas' },
  { valor: 'limpieza', etiqueta: 'Limpieza y detallado' },
  { valor: 'tramites', etiqueta: 'Trámites y traspaso' },
  { valor: 'traslado', etiqueta: 'Traslado' },
  { valor: 'publicidad', etiqueta: 'Publicidad' },
  { valor: 'comision', etiqueta: 'Comisión de venta' },
  { valor: 'otro', etiqueta: 'Otro' },
]

export const etiquetaGasto = (t: TipoGasto) => TIPOS_GASTO.find((x) => x.valor === t)?.etiqueta ?? 'Otro'

/** Fases de un vehículo: se compra, se prepara, se pone a la venta y se vende. */
export type Fase = 'preparacion' | 'disponible' | 'vendido'

export const FASES: { valor: Fase; etiqueta: string; plural: string }[] = [
  { valor: 'preparacion', etiqueta: 'En preparación', plural: 'En preparación' },
  { valor: 'disponible', etiqueta: 'A la venta', plural: 'A la venta' },
  { valor: 'vendido', etiqueta: 'Vendido', plural: 'Vendidos' },
]

export const etiquetaFase = (f: Fase) => FASES.find((x) => x.valor === f)!.etiqueta

export interface Gasto {
  id: string
  fecha: number
  tipo: TipoGasto
  descripcion: string
  monto: number
}

export interface Venta {
  fecha: number
  precio: number
  /** Vendedor del predio que hizo la venta */
  vendedor: string
  formaPago: FormaPago
  /** Cliente que compró el vehículo */
  compradorId: string | null
}

// ------------------------------------------------------------------ Ficha técnica

export type Combustible = 'Gasolina' | 'Diésel' | 'Híbrido' | 'Eléctrico'
export const COMBUSTIBLES: Combustible[] = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico']

/** Propio: el predio lo compró. Consignación: sigue siendo del dueño y se le paga lo acordado al venderse. */
export type Modalidad = 'propio' | 'consignacion'
export const MODALIDADES: { valor: Modalidad; etiqueta: string }[] = [
  { valor: 'propio', etiqueta: 'Propio del predio' },
  { valor: 'consignacion', etiqueta: 'En consignación' },
]
export const etiquetaModalidad = (m: Modalidad) => MODALIDADES.find((x) => x.valor === m)!.etiqueta

export const COLORES = ['Blanco', 'Negro', 'Gris', 'Plateado', 'Rojo', 'Azul', 'Verde', 'Beige', 'Café', 'Vino']

export interface FichaTecnica {
  color: string
  combustible: Combustible
  /** Kilometraje actual (se actualiza con el tiempo) */
  kilometraje: number
  /** Número de identificación vehicular (chasis), 17 caracteres */
  vin: string
  numeroMotor: string
}

// ------------------------------------------------------------------ Anotaciones (bitácora)

export interface Nota {
  id: string
  fecha: number
  texto: string
  /** La foto se guarda aparte (ver api/fotos.ts) con la clave `nota:<id>` */
  conFoto: boolean
}

export const claveFotoNota = (notaId: string) => `nota:${notaId}`

// ------------------------------------------------------------------ Clientes

/** Persona que le vende un auto al predio o que le compra uno. */
export interface Cliente {
  id: string
  nombres: string
  apellidos: string
  /** 8 dígitos, sin espacios */
  telefono: string
  correo: string
  /** CUI del DPI, 13 dígitos sin espacios */
  dpi: string
  /** NIT sin guion (p. ej. 12345678K) o "CF" */
  nit: string
  direccion: string
  creado: number
}

export const nombreCliente = (c: Pick<Cliente, 'nombres' | 'apellidos'>) => `${c.nombres} ${c.apellidos}`

export interface Vehiculo {
  id: string
  marca: string
  modelo: string
  anio: number
  carroceria: Carroceria
  placa: string
  fechaCompra: number
  precioCompra: number
  /** Fecha en que terminó la preparación y se puso a la venta */
  fechaDisponible: number | null
  /** Precio que se pide al ponerlo a la venta */
  precioPedido: number | null
  venta: Venta | null
  gastos: Gasto[]
  modalidad: Modalidad
  ficha: FichaTecnica
  /** Cliente que le vendió (o dejó en consignación) el vehículo al predio */
  proveedorId: string | null
  notas: Nota[]
}

/** Vehículo con sus totales ya calculados (lo que devuelve la API). */
export interface VehiculoConTotales extends Vehiculo {
  fase: Fase
  totalGastos: number
  /** Compra + gastos */
  costoTotal: number
  /** Venta − costo total; null si no se ha vendido */
  ganancia: number | null
  /** Días desde la compra hasta la venta (o hasta hoy si no se ha vendido) */
  dias: number
}

export const nombreVehiculo = (v: Pick<Vehiculo, 'marca' | 'modelo' | 'anio'>) => `${v.marca} ${v.modelo} ${v.anio}`

export const DIA = 86_400_000

/** Días en el predio a partir de los cuales un vehículo necesita atención. */
export const DIAS_ALERTA = 60

/** Comisión sugerida al registrar una venta. */
export const COMISION_SUGERIDA = 0.015
