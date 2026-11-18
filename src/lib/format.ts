const LOCALE = 'es-GT'

const quetzales = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'GTQ',
  maximumFractionDigits: 0,
})
const entero = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const decimal1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const decimal2 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fechaCorta = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const mesLargo = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const mesCorto = new Intl.DateTimeFormat(LOCALE, { month: 'short' })

/** Q1,234,567 */
export const fmtQ = (n: number) => quetzales.format(Math.round(n))

/** Q 1.24 M, Q 845 mil, Q 920 */
export function fmtQCorto(n: number) {
  const abs = Math.abs(n)
  const signo = n < 0 ? '−' : ''
  if (abs >= 10_000_000) return `${signo}Q ${decimal1.format(abs / 1_000_000)} M`
  if (abs >= 1_000_000) return `${signo}Q ${decimal2.format(abs / 1_000_000)} M`
  if (abs >= 10_000) return `${signo}Q ${entero.format(abs / 1000)} mil`
  return `${signo}Q ${entero.format(abs)}`
}

export const fmtEntero = (n: number) => entero.format(n)

/** Recibe una fracción (0.134) y devuelve "13.4 %" */
export const fmtPct = (fraccion: number) => `${decimal1.format(fraccion * 100)} %`

export const fmtDias = (n: number) => `${entero.format(n)} ${Math.round(n) === 1 ? 'día' : 'días'}`

export const fmtFecha = (ms: number) => fechaCorta.format(ms)
export const fmtMesLargo = (ms: number) => mesLargo.format(ms)
export const fmtMesCorto = (ms: number) => mesCorto.format(ms).replace('.', '')

/** Variación relativa entre dos valores; null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!Number.isFinite(anterior) || anterior === 0) return null
  // Si cambió de signo (p. ej. de pérdida a utilidad) el porcentaje no significa nada.
  if (Math.sign(actual) !== Math.sign(anterior) && actual !== 0) return null
  return (actual - anterior) / Math.abs(anterior)
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** Fecha en el formato de <input type="date"> (YYYY-MM-DD, hora local). */
export function aFechaInput(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`
}

/** Convierte YYYY-MM-DD a milisegundos (mediodía local, evita saltos por zona horaria). */
export function deFechaInput(valor: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime()
}

/** Lee un monto escrito por el usuario ("12,500", "Q 12500.50"); null si no es un número. */
export function leerMonto(valor: string): number | null {
  const limpio = valor.replace(/[Qq\s,]/g, '')
  if (!limpio) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}
