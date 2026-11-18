/**
 * Almacenamiento temporal mientras no exista la API en Go.
 *
 * Guarda el inventario en el navegador (localStorage). Si el navegador no
 * permite guardar (modo privado, almacenamiento bloqueado), la app sigue
 * funcionando en memoria y los cambios se pierden al recargar.
 */

import { completarSemilla, generarSemilla, type Semilla } from './semilla'
import type { Cliente, Vehiculo } from './tipos'

const CLAVE = 'vehdemo.inventario.v1'

let db: Semilla | null = null

function esValida(x: unknown): x is Semilla {
  if (!x || typeof x !== 'object') return false
  const s = x as Semilla
  return Array.isArray(s.vehiculos) && typeof s.sigVehiculo === 'number' && typeof s.sigGasto === 'number'
}

function cargar(): Semilla {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) {
      const datos: unknown = JSON.parse(crudo)
      if (esValida(datos)) {
        // Datos de la versión anterior: se agregan ficha técnica, clientes y notas.
        const completos = completarSemilla(datos)
        if (completos !== datos) guardarEn(completos)
        return completos
      }
    }
  } catch {
    // Almacenamiento no disponible o dañado: se usan los datos de ejemplo.
  }
  const semilla = generarSemilla(Date.now())
  guardarEn(semilla)
  return semilla
}

function guardarEn(datos: Semilla) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // Sin espacio o bloqueado: los cambios viven solo en memoria.
  }
}

export function leer(): Semilla {
  db ??= cargar()
  return db
}

export function guardar() {
  if (db) guardarEn(db)
}

export function nuevoIdVehiculo() {
  const d = leer()
  return `V-${String(d.sigVehiculo++).padStart(5, '0')}`
}

export function nuevoIdGasto() {
  return `G-${leer().sigGasto++}`
}

export function nuevoIdCliente() {
  const d = leer()
  return `C-${String(d.sigCliente++).padStart(4, '0')}`
}

export function nuevoIdNota() {
  return `N-${leer().sigNota++}`
}

export function buscarCliente(id: string | null): Cliente | undefined {
  return id ? leer().clientes.find((c) => c.id === id) : undefined
}

export function buscar(id: string): Vehiculo | undefined {
  return leer().vehiculos.find((v) => v.id === id)
}

/** Borra lo registrado y vuelve a los datos de ejemplo. */
export function restablecer() {
  db = generarSemilla(Date.now())
  guardarEn(db)
}
