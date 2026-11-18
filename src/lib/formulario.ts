import type { FormEvent } from 'react'

/** Id del texto de ayuda o error de un campo (para aria-describedby). */
export const descripcionDe = (id: string) => `${id}-desc`

/** Mensaje de error legible a partir de lo que lance la API. */
export function mensajeDeError(e: unknown) {
  return e instanceof Error && e.name !== 'TypeError' && e.message
    ? e.message
    : 'No se pudo guardar. Vuelve a intentarlo.'
}

export type Errores = Record<string, string>

/** Quita el error de un campo, p. ej. al elegir un valor válido. */
export const quitarError = (campo: string) => (prev: Errores) => {
  if (!(campo in prev)) return prev
  const resto = { ...prev }
  delete resto[campo]
  return resto
}

export const texto = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()

/** Al editar un campo, se quita su mensaje de error (el resto se revalida al guardar). */
export const limpiarAlEditar =
  (setErrores: (f: (e: Errores) => Errores) => void) => (e: FormEvent<HTMLFormElement>) => {
    const nombre = (e.target as HTMLInputElement).name
    if (!nombre) return
    setErrores(quitarError(nombre))
  }

