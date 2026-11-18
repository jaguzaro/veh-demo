/**
 * Validaciones de documentos de Guatemala y datos de contacto.
 * Devuelven el valor normalizado o un mensaje de error para mostrar junto al campo.
 */

export type Resultado = { ok: true; valor: string } | { ok: false; error: string }

const ok = (valor: string): Resultado => ({ ok: true, valor })
const error = (e: string): Resultado => ({ ok: false, error: e })

/** Municipios por departamento (01 Guatemala … 22 Jutiapa). */
const MUNICIPIOS = [17, 8, 16, 16, 14, 14, 19, 8, 24, 21, 9, 30, 33, 21, 8, 17, 14, 5, 11, 11, 7, 17]

/** Dígito verificador del CUI: los 8 primeros dígitos, ponderados de 2 a 9, módulo 11. */
export function verificadorCui(ocho: string) {
  let suma = 0
  for (let i = 0; i < 8; i++) suma += Number(ocho[i]) * (i + 2)
  return suma % 11
}

/** DPI (CUI): 13 dígitos = 8 de correlativo, 1 verificador, 2 de departamento y 2 de municipio. */
export function validarDpi(entrada: string): Resultado {
  const d = entrada.replace(/[\s-]/g, '')
  if (!d) return error('Escribe el número de DPI.')
  if (!/^\d{13}$/.test(d)) return error('El DPI tiene 13 dígitos.')
  const depto = Number(d.slice(9, 11))
  const muni = Number(d.slice(11, 13))
  if (depto < 1 || depto > 22 || muni < 1 || muni > MUNICIPIOS[depto - 1] || verificadorCui(d.slice(0, 8)) !== Number(d[8]))
    return error('Este número de DPI no es válido. Revísalo en el documento.')
  return ok(d)
}

/** Dígito verificador del NIT (módulo 11; 10 se escribe K). */
export function verificadorNit(cuerpo: string) {
  let suma = 0
  for (let i = 0; i < cuerpo.length; i++) suma += Number(cuerpo[cuerpo.length - 1 - i]) * (i + 2)
  const v = (11 - (suma % 11)) % 11
  return v === 10 ? 'K' : String(v)
}

/** NIT con su verificador (p. ej. 1234567-9) o CF si es consumidor final. */
export function validarNit(entrada: string, permitirCf = true): Resultado {
  const n = entrada.replace(/[\s-]/g, '').toUpperCase()
  if (!n) return error(permitirCf ? 'Escribe el NIT o CF si es consumidor final.' : 'Escribe el NIT.')
  if (n === 'CF' || n === 'C/F') return permitirCf ? ok('CF') : error('Escribe el NIT.')
  if (!/^\d{2,12}[\dK]$/.test(n)) return error('El NIT son números y al final un dígito o K, por ejemplo 1234567-9.')
  if (verificadorNit(n.slice(0, -1)) !== n.slice(-1)) return error('Este NIT no es válido. Revisa el último dígito.')
  return ok(n)
}

/** Teléfono de Guatemala: 8 dígitos (con o sin +502). */
export function validarTelefono(entrada: string): Resultado {
  const t = entrada.replace(/[\s()-]/g, '').replace(/^(\+?502)/, '')
  if (!t) return error('Escribe el teléfono.')
  if (!/^[2-7]\d{7}$/.test(t)) return error('El teléfono tiene 8 dígitos, por ejemplo 5512 3456.')
  return ok(t)
}

export function validarCorreo(entrada: string): Resultado {
  const c = entrada.trim().toLowerCase()
  if (!c) return ok('')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)) return error('Revisa el correo, por ejemplo nombre@gmail.com.')
  return ok(c)
}

/** VIN: 17 letras y números, sin I, O ni Q (se confunden con 1 y 0). */
export function validarVin(entrada: string): Resultado {
  const v = entrada.replace(/[\s-]/g, '').toUpperCase()
  if (!v) return ok('')
  if (v.length !== 17) return error(`El VIN tiene 17 caracteres; escribiste ${v.length}.`)
  if (/[IOQ]/.test(v)) return error('El VIN no lleva las letras I, O ni Q. Revisa si es 1 o 0.')
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return error('El VIN solo lleva letras y números.')
  return ok(v)
}

// ------------------------------------------------------------------ Formato para mostrar

/** 2546 78901 0101 */
export const fmtDpi = (d: string) => (d.length === 13 ? `${d.slice(0, 4)} ${d.slice(4, 9)} ${d.slice(9)}` : d)

/** 1234567-9 */
export const fmtNit = (n: string) => (n === 'CF' ? 'CF' : `${n.slice(0, -1)}-${n.slice(-1)}`)

/** 5512 3456 */
export const fmtTelefono = (t: string) => (t.length === 8 ? `${t.slice(0, 4)} ${t.slice(4)}` : t)
