/**
 * Datos de ejemplo del predio (deterministas: misma semilla, mismos datos).
 * Solo se usan la primera vez, o al restablecer los datos de ejemplo.
 */

import { VENDEDORES } from './catalogo'
import { verificadorCui, verificadorNit } from '@/lib/validar'
import {
  COLORES,
  DIA,
  type Carroceria,
  type Cliente,
  type Combustible,
  type FormaPago,
  type Gasto,
  type Nota,
  type TipoGasto,
  type Vehiculo,
} from './tipos'

/** Perfil por marca: días base para vender y margen objetivo. */
const PERFIL: Record<string, { dias: number; margen: number }> = {
  Toyota: { dias: 24, margen: 0.155 },
  Honda: { dias: 30, margen: 0.145 },
  Mazda: { dias: 35, margen: 0.13 },
  Nissan: { dias: 38, margen: 0.12 },
  Hyundai: { dias: 40, margen: 0.12 },
  Kia: { dias: 43, margen: 0.115 },
  Mitsubishi: { dias: 47, margen: 0.135 },
  Suzuki: { dias: 52, margen: 0.105 },
  Ford: { dias: 64, margen: 0.1 },
  Chevrolet: { dias: 72, margen: 0.08 },
}

const MODELOS: [marca: string, modelo: string, carroceria: Carroceria, precioBase: number][] = [
  ['Toyota', 'Hilux', 'Pickup', 235_000],
  ['Toyota', 'RAV4', 'SUV', 215_000],
  ['Toyota', 'Corolla', 'Sedán', 145_000],
  ['Toyota', 'Yaris', 'Hatchback', 105_000],
  ['Toyota', 'Hiace', 'Microbús', 260_000],
  ['Nissan', 'Frontier', 'Pickup', 205_000],
  ['Nissan', 'Sentra', 'Sedán', 120_000],
  ['Nissan', 'X-Trail', 'SUV', 175_000],
  ['Hyundai', 'Tucson', 'SUV', 170_000],
  ['Hyundai', 'Accent', 'Sedán', 95_000],
  ['Hyundai', 'H-1', 'Microbús', 190_000],
  ['Kia', 'Sportage', 'SUV', 165_000],
  ['Kia', 'Rio', 'Hatchback', 90_000],
  ['Kia', 'Picanto', 'Hatchback', 72_000],
  ['Mazda', 'CX-5', 'SUV', 185_000],
  ['Mazda', 'Mazda 3', 'Sedán', 125_000],
  ['Honda', 'CR-V', 'SUV', 195_000],
  ['Honda', 'Civic', 'Sedán', 140_000],
  ['Mitsubishi', 'L200', 'Pickup', 185_000],
  ['Mitsubishi', 'Montero Sport', 'SUV', 225_000],
  ['Suzuki', 'Swift', 'Hatchback', 85_000],
  ['Suzuki', 'Vitara', 'SUV', 140_000],
  ['Chevrolet', 'Spark', 'Hatchback', 60_000],
  ['Chevrolet', 'Tracker', 'SUV', 125_000],
  ['Ford', 'Ranger', 'Pickup', 200_000],
  ['Ford', 'Escape', 'SUV', 150_000],
]

const PAGOS: { nombre: FormaPago; peso: number }[] = [
  { nombre: 'Contado', peso: 0.38 },
  { nombre: 'Financiamiento', peso: 0.44 },
  { nombre: 'Trade-in', peso: 0.18 },
]

const DESCRIPCIONES: Record<TipoGasto, string[]> = {
  mecanica: ['Servicio y cambio de aceite', 'Frenos delanteros', 'Kit de clutch', 'Suspensión', 'Afinado mayor'],
  pintura: ['Pintura de bumper', 'Enderezado de puerta', 'Pulido completo', 'Pintura de capó'],
  llantas: ['Juego de 4 llantas', 'Dos llantas delanteras'],
  limpieza: ['Detallado interior y exterior', 'Lavado de motor y tapicería'],
  tramites: ['Traspaso y placas', 'Solvencia y traspaso'],
  traslado: ['Grúa desde el vendedor', 'Traslado al taller'],
  publicidad: ['Anuncio destacado en Marketplace', 'Pauta en Facebook'],
  comision: ['Comisión del vendedor'],
  otro: ['Gastos varios'],
}

function mulberry32(semilla: number) {
  let a = semilla
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Semilla {
  vehiculos: Vehiculo[]
  clientes: Cliente[]
  sigVehiculo: number
  sigGasto: number
  sigCliente: number
  sigNota: number
}

/** Vehículo como lo guardaba la versión anterior (sin ficha, clientes ni notas). */
type VehiculoBase = Omit<Vehiculo, 'modalidad' | 'ficha' | 'proveedorId' | 'notas' | 'venta'> & {
  venta: Omit<NonNullable<Vehiculo['venta']>, 'compradorId'> | null
}

/** Genera unos 26 meses de historia que terminan hoy. */
export function generarSemilla(ahora: number): Semilla {
  return completarSemilla(generarBase(ahora))
}

function generarBase(ahora: number): { vehiculos: VehiculoBase[]; sigVehiculo: number; sigGasto: number } {
  const rnd = mulberry32(20261114)
  const entre = (min: number, max: number) => min + rnd() * (max - min)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())
  const redondear = (n: number, a: number) => Math.round(n / a) * a
  const elegir = <T>(items: T[], peso: (t: T) => number): T => {
    const total = items.reduce((s, x) => s + peso(x), 0)
    let r = rnd() * total
    for (const x of items) {
      r -= peso(x)
      if (r <= 0) return x
    }
    return items[items.length - 1]
  }
  const letras = 'BCDFGHJKLMNPRSTVWXYZ'
  const placa = () =>
    `P ${100 + Math.floor(rnd() * 900)}${Array.from({ length: 3 }, () => letras[Math.floor(rnd() * letras.length)]).join('')}`

  const hoy = new Date(ahora)
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()
  const anioActual = hoy.getFullYear()
  const dias = 800
  const inicio = inicioHoy - dias * DIA
  const vehiculos: VehiculoBase[] = []
  let sigGasto = 1

  for (let d = 0; d < dias; d++) {
    const llegadas = rnd() < 0.2 ? 2 : 1
    for (let k = 0; k < llegadas; k++) {
      const [marca, modelo, carroceria, precioBase] = MODELOS[Math.floor(rnd() * MODELOS.length)]
      const perfil = PERFIL[marca]
      const anio = anioActual - 3 - Math.floor(rnd() * 11)
      const edad = anioActual - anio
      const precioCompra = redondear(precioBase * Math.max(0.42, 1 - 0.055 * (edad - 2)) * entre(0.92, 1.08), 500)
      const fechaCompra = inicio + d * DIA + (8 + Math.floor(rnd() * 9)) * 3_600_000
      if (fechaCompra > ahora) continue

      const vendedor = elegir(VENDEDORES, (v) => v.habilidad)
      const diasPrep = 3 + Math.floor(rnd() * 9)

      const gastos: Gasto[] = []
      const gasto = (tipo: TipoGasto, monto: number, fecha: number) => {
        if (fecha > ahora) return
        const opciones = DESCRIPCIONES[tipo]
        gastos.push({
          id: `G-${sigGasto++}`,
          fecha,
          tipo,
          descripcion: opciones[Math.floor(rnd() * opciones.length)],
          monto: redondear(monto, 50),
        })
      }
      const enPrep = () => fechaCompra + Math.floor(rnd() * diasPrep) * DIA
      if (rnd() < 0.4) gasto('traslado', entre(350, 900), fechaCompra)
      gasto('mecanica', entre(800, 4_800), enPrep())
      if (rnd() < 0.45) gasto('pintura', entre(1_500, 6_500), enPrep())
      if (rnd() < 0.3) gasto('llantas', entre(2_400, 5_400), enPrep())
      gasto('limpieza', entre(400, 950), fechaCompra + (diasPrep - 1) * DIA)
      gasto('tramites', entre(600, 1_250), enPrep())

      const costoPrep = gastos.reduce((s, g) => s + g.monto, 0)
      const base = precioCompra + costoPrep
      const fechaDisponible = fechaCompra + diasPrep * DIA
      const disponible = fechaDisponible <= ahora
      if (disponible && rnd() < 0.5) gasto('publicidad', entre(300, 900), fechaDisponible + 2 * DIA)

      const lentitud = Math.exp(gauss() * 0.5) / (0.85 + vendedor.habilidad * 0.15)
      const diasVenta = Math.max(
        diasPrep + 2,
        Math.round(diasPrep + perfil.dias * (1 + Math.max(0, edad - 5) * 0.05) * lentitud),
      )
      let margen = perfil.margen * entre(0.8, 1.2) * (0.9 + vendedor.habilidad * 0.1)
      if (diasVenta > 60) margen -= 0.035
      if (diasVenta > 90) margen -= 0.03

      const fechaVenta = fechaCompra + diasVenta * DIA
      const vendido = fechaVenta <= ahora
      const precioVenta = redondear(base * (1 + margen), 100)
      if (vendido) gasto('comision', precioVenta * 0.015, fechaVenta)

      vehiculos.push({
        id: `V-${String(vehiculos.length + 1).padStart(5, '0')}`,
        marca,
        modelo,
        anio,
        carroceria,
        placa: placa(),
        fechaCompra,
        precioCompra,
        fechaDisponible: disponible ? fechaDisponible : null,
        precioPedido: disponible ? redondear(base * (1 + perfil.margen + 0.06), 500) : null,
        venta: vendido
          ? { fecha: fechaVenta, precio: precioVenta, vendedor: vendedor.nombre, formaPago: elegir(PAGOS, (p) => p.peso).nombre }
          : null,
        gastos: gastos.sort((a, b) => a.fecha - b.fecha),
      })
    }
  }
  return { vehiculos, sigVehiculo: vehiculos.length + 1, sigGasto }
}

// ------------------------------------------------------------------ Ficha técnica, clientes y notas

/** Primeros y segundos nombres, en dos grupos para que combinen. */
const NOMBRES = [
  ['José', 'Juan', 'Carlos', 'Luis', 'Pedro', 'Marco', 'Óscar', 'Edgar', 'Byron', 'Erick', 'Héctor', 'Walter', 'Kevin', 'Julio', 'Rodrigo'],
  ['María', 'Ana', 'Rosa', 'Gabriela', 'Lucía', 'Claudia', 'Fernanda', 'Silvia', 'Karla', 'Mónica', 'Paola', 'Andrea', 'Brenda', 'Ingrid', 'Lesly'],
]
const SEGUNDOS = [
  ['Antonio', 'Manuel', 'Eduardo', 'Fernando', 'Roberto', 'Daniel', '', '', ''],
  ['Alejandra', 'Isabel', 'Beatriz', 'Elena', 'Lucía', 'Fernanda', '', '', ''],
]
const APELLIDOS = ['García', 'López', 'Pérez', 'Hernández', 'González', 'Rodríguez', 'Morales', 'Ramírez', 'Cifuentes', 'Juárez', 'Castillo', 'Orellana', 'Barrios', 'Sandoval', 'Monterroso', 'Estrada', 'Aguilar', 'Recinos', 'Gálvez', 'Cabrera', 'Ajú', 'Xicará', 'Tzoc', 'Coyoy', 'Batz', 'Sicán', 'Mazariegos', 'Quiñónez', 'Arriaza', 'Solórzano']
const ZONAS = ['Zona 1', 'Zona 7', 'Zona 11', 'Zona 12', 'Zona 18', 'Mixco', 'Villa Nueva', 'San Miguel Petapa', 'Villa Canales', 'Santa Catarina Pinula', 'Chinautla', 'Amatitlán']
const DOMINIOS = ['gmail.com', 'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com']
const OBSERVACIONES = [
  'Llegó con el aire acondicionado sin enfriar; se revisa en el taller.',
  'El dueño entregó tarjeta de circulación y título de propiedad.',
  'Rayón en la puerta trasera derecha, se incluye en pintura.',
  'Cliente preguntó por financiamiento; quedó de regresar el sábado.',
  'Se cambió la batería. La anterior no retenía carga.',
  'Pendiente la segunda llave; el dueño la trae esta semana.',
  'Prueba de manejo sin problemas. Ruido leve en la suspensión delantera.',
  'Se tomaron fotos nuevas para el anuncio.',
]
const sinAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Agrega a los datos de ejemplo lo que vino después: ficha técnica, modalidad,
 * clientes y notas. Usa su propio generador para no cambiar las cifras de compras
 * y ventas. También completa datos guardados con la versión anterior.
 */
export function completarSemilla(datos: {
  vehiculos: (VehiculoBase | Vehiculo)[]
  sigVehiculo: number
  sigGasto: number
  clientes?: Cliente[]
  sigCliente?: number
  sigNota?: number
}): Semilla {
  if (datos.clientes && datos.vehiculos.every((v) => 'ficha' in v)) return datos as Semilla

  const rnd = mulberry32(5021)
  const entre = (min: number, max: number) => min + rnd() * (max - min)
  const uno = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const digitos = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('')

  const clientes: Cliente[] = datos.clientes ?? []
  let sigCliente = datos.sigCliente ?? 1
  let sigNota = datos.sigNota ?? 1
  const nuevoCliente = (creado: number): Cliente => {
    const grupo = rnd() < 0.5 ? 0 : 1
    const nombre = uno(NOMBRES[grupo])
    const segundo = uno(SEGUNDOS[grupo])
    const apellido1 = uno(APELLIDOS)
    const apellido2 = uno(APELLIDOS)
    // Un CUI real nunca tiene verificador 10: se busca un correlativo que dé un solo dígito.
    let ocho = String(1000 + Math.floor(rnd() * 3000)) + digitos(4)
    while (verificadorCui(ocho) === 10) ocho = String(1000 + Math.floor(rnd() * 3000)) + digitos(4)
    const depto = rnd() < 0.7 ? 1 : 1 + Math.floor(rnd() * 22)
    const muni = depto === 1 ? 1 + Math.floor(rnd() * 17) : 1
    const cuerpoNit = String(1 + Math.floor(rnd() * 9)) + digitos(6)
    const c: Cliente = {
      id: `C-${String(sigCliente++).padStart(4, '0')}`,
      nombres: segundo ? `${nombre} ${segundo}` : nombre,
      apellidos: `${apellido1} ${apellido2}`,
      telefono: uno(['3', '4', '5', '5', '2']) + digitos(7),
      correo: rnd() < 0.75 ? `${sinAcentos(nombre)}.${sinAcentos(apellido1)}${Math.floor(rnd() * 90 + 10)}@${uno(DOMINIOS)}` : '',
      dpi: `${ocho}${verificadorCui(ocho)}${String(depto).padStart(2, '0')}${String(muni).padStart(2, '0')}`,
      nit: rnd() < 0.15 ? 'CF' : cuerpoNit + verificadorNit(cuerpoNit),
      direccion: rnd() < 0.6 ? `${Math.floor(rnd() * 30 + 1)} calle ${Math.floor(rnd() * 20 + 1)}-${Math.floor(rnd() * 80 + 10)}, ${uno(ZONAS)}` : '',
      creado,
    }
    clientes.push(c)
    return c
  }
  /** A veces es alguien que ya hizo negocio con el predio antes. */
  const cliente = (fecha: number) => {
    const previos = clientes.filter((c) => c.creado <= fecha)
    return previos.length > 20 && rnd() < 0.18 ? uno(previos) : nuevoCliente(fecha)
  }

  const vehiculos: Vehiculo[] = datos.vehiculos.map((base) => {
    if ('ficha' in base) return base
    const edad = new Date(base.fechaCompra).getFullYear() - base.anio
    const combustible: Combustible =
      base.carroceria === 'Pickup' || base.carroceria === 'Microbús'
        ? rnd() < 0.75 ? 'Diésel' : 'Gasolina'
        : rnd() < 0.06 ? 'Híbrido' : 'Gasolina'
    const consignacion = rnd() < 0.2
    const proveedor = cliente(base.fechaCompra)
    const notas: Nota[] = []
    const nNotas = rnd() < 0.55 ? 1 + Math.floor(rnd() * 3) : 0
    for (let i = 0; i < nNotas; i++) {
      const fin = base.venta?.fecha ?? Math.max(base.fechaCompra, Date.now() - DIA)
      notas.push({
        id: `N-${sigNota++}`,
        // Un día entre la compra y la venta, en horario del predio (8:00 a 17:00).
        fecha: new Date(entre(base.fechaCompra, fin)).setHours(8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0),
        texto: uno(OBSERVACIONES),
        conFoto: false,
      })
    }
    return {
      ...base,
      modalidad: consignacion ? 'consignacion' : 'propio',
      ficha: {
        color: uno(COLORES.slice(0, rnd() < 0.7 ? 4 : COLORES.length)),
        combustible,
        kilometraje: Math.round((Math.max(1, edad) * entre(11_000, 21_000)) / 100) * 100,
        vin: vinDe(base.marca, rnd),
        numeroMotor: Array.from({ length: 2 }, () => 'ABCDEFGHJKLMNPRSTVWXYZ'[Math.floor(rnd() * 22)]).join('') + digitos(7),
      },
      proveedorId: proveedor.id,
      notas: notas.sort((a, b) => a.fecha - b.fecha),
      venta: base.venta ? { ...base.venta, compradorId: cliente(base.venta.fecha).id } : null,
    }
  })

  return { vehiculos, clientes, sigVehiculo: datos.sigVehiculo, sigGasto: datos.sigGasto, sigCliente, sigNota }
}

/** Prefijo de fabricante aproximado por marca, para que el VIN se vea real. */
const WMI: Record<string, string> = {
  Toyota: 'JTD', Nissan: '3N1', Hyundai: 'KMH', Kia: 'KNA', Mazda: 'JM1', Honda: 'JHM',
  Mitsubishi: 'JA3', Suzuki: 'JS2', Chevrolet: '1G1', Ford: '1FA',
}

function vinDe(marca: string, rnd: () => number) {
  const c = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
  return (WMI[marca] ?? '1XX') + Array.from({ length: 14 }, () => c[Math.floor(rnd() * c.length)]).join('')
}
