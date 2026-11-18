import { useSyncExternalStore } from 'react'
import { limpiarTokens } from '@/components/charts/chart-theme'

/**
 * Tema claro/oscuro. La clase `dark` en <html> activa los tokens de src/index.css.
 * La elección se guarda en localStorage; sin elección se sigue al sistema operativo.
 * index.html aplica el tema antes del primer pintado: mantener la misma clave.
 */
export type Tema = 'claro' | 'oscuro'

const CLAVE = 'vehdemo-tema'
const raiz = document.documentElement
const oyentes = new Set<() => void>()

function guardado(): Tema | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'claro' || v === 'oscuro' ? v : null
  } catch {
    return null
  }
}

const consulta = window.matchMedia('(prefers-color-scheme: dark)')
const delSistema = (): Tema => (consulta.matches ? 'oscuro' : 'claro')

let actual: Tema = raiz.classList.contains('dark') ? 'oscuro' : 'claro'

function aplicar(tema: Tema) {
  if (tema === actual) return
  actual = tema
  raiz.classList.toggle('dark', tema === 'oscuro')
  limpiarTokens() // los gráficos (canvas) leen los colores del tema activo
  oyentes.forEach((o) => o())
}

export function alternarTema() {
  const siguiente: Tema = actual === 'oscuro' ? 'claro' : 'oscuro'
  try {
    localStorage.setItem(CLAVE, siguiente)
  } catch {
    /* sin almacenamiento: el cambio vale solo para esta sesión */
  }
  aplicar(siguiente)
}

// Sin elección guardada, seguir los cambios del sistema.
consulta.addEventListener('change', () => {
  if (!guardado()) aplicar(delSistema())
})

// El reporte mensual se imprime siempre en claro, esté el tema que esté.
window.addEventListener('beforeprint', () => raiz.classList.remove('dark'))
window.addEventListener('afterprint', () => raiz.classList.toggle('dark', actual === 'oscuro'))

function suscribir(cb: () => void) {
  oyentes.add(cb)
  return () => oyentes.delete(cb)
}

/** Tema activo; re-renderiza al cambiar. Úsalo también como dependencia de las opciones de gráficos. */
export function useTema(): Tema {
  return useSyncExternalStore(suscribir, () => actual)
}
