/**
 * Fotos de los vehículos, guardadas en IndexedDB de este navegador.
 * Con la API en Go, cada vehículo tendrá la URL de su foto y este archivo
 * se reemplaza por la subida al servidor.
 */

const BD = 'vehdemo-fotos'
const ALMACEN = 'fotos'
const LADO_MAX = 1200
const TAMANO_MAX = 15 * 1024 * 1024

let conexion: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  conexion ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(BD, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(ALMACEN)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      conexion = null
      reject(req.error)
    }
  })
  return conexion
}

async function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir()
  return new Promise((resolve, reject) => {
    const req = fn(bd.transaction(ALMACEN, modo).objectStore(ALMACEN))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Foto del vehículo como data URL, o null si no tiene. */
export async function obtenerFoto(id: string): Promise<string | null> {
  try {
    return ((await operar('readonly', (s) => s.get(id))) as string | undefined) ?? null
  } catch {
    return null
  }
}

export class ErrorFoto extends Error {}

/** Reduce la imagen (lado mayor 1200 px, JPEG) y la guarda. */
export async function guardarFoto(id: string, archivo: File): Promise<void> {
  if (!archivo.type.startsWith('image/')) throw new ErrorFoto('El archivo no es una imagen. Usa una foto JPG o PNG.')
  if (archivo.size > TAMANO_MAX) throw new ErrorFoto('La foto pesa más de 15 MB. Usa una más liviana.')

  let imagen: ImageBitmap
  try {
    imagen = await createImageBitmap(archivo)
  } catch {
    throw new ErrorFoto('No se pudo leer la foto. Usa una foto JPG o PNG.')
  }
  const escala = Math.min(1, LADO_MAX / Math.max(imagen.width, imagen.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(imagen.width * escala)
  lienzo.height = Math.round(imagen.height * escala)
  lienzo.getContext('2d')!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  imagen.close()
  const dataUrl = lienzo.toDataURL('image/jpeg', 0.82)

  try {
    await operar('readwrite', (s) => s.put(dataUrl, id))
  } catch {
    throw new ErrorFoto('No se pudo guardar la foto: el navegador no tiene espacio disponible.')
  }
}

export async function quitarFoto(id: string): Promise<void> {
  await operar('readwrite', (s) => s.delete(id))
}

export async function borrarTodas(): Promise<void> {
  try {
    await operar('readwrite', (s) => s.clear())
  } catch {
    // Sin IndexedDB no hay fotos que borrar.
  }
}
