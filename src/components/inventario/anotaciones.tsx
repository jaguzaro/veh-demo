import { useId, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { fotoQuery, useAgregarNota, useEliminarNota } from '@/api/queries'
import { claveFotoNota, type Nota } from '@/api/tipos'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { mensajeDeError } from '@/lib/formulario'
import { cn } from '@/lib/utils'

const fechaHora = new Intl.DateTimeFormat('es-GT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const LIMITE = 1000

/**
 * Bitácora del vehículo: observaciones con fecha, de la más reciente a la más antigua.
 * Cada nota puede llevar una foto (un golpe, una pieza cambiada, un documento).
 */
export function Anotaciones({ vehiculoId, notas }: { vehiculoId: string; notas: Nota[] }) {
  return (
    <Panel titulo="Anotaciones" descripcion="Observaciones sobre el vehículo: revisiones, pendientes, llamadas de interesados.">
      <NuevaNota vehiculoId={vehiculoId} />
      {notas.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Todavía no hay anotaciones.</p>
      ) : (
        <ol className="mt-5 flex flex-col">
          {notas.map((n, i) => (
            <FilaNota key={n.id} vehiculoId={vehiculoId} nota={n} ultima={i === notas.length - 1} />
          ))}
        </ol>
      )}
    </Panel>
  )
}

function NuevaNota({ vehiculoId }: { vehiculoId: string }) {
  const id = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const agregar = useAgregarNota(vehiculoId)

  function elegirFoto(archivo: File | undefined) {
    if (vista) URL.revokeObjectURL(vista)
    if (!archivo) {
      setFoto(null)
      setVista(null)
      return
    }
    setFoto(archivo)
    setVista(URL.createObjectURL(archivo))
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!texto.trim() && !foto) {
      setAviso('Escribe la anotación o agrega una foto.')
      return
    }
    agregar.mutate(
      { texto, foto },
      {
        onSuccess: () => {
          setTexto('')
          elegirFoto(undefined)
        },
      },
    )
  }

  const error = aviso ?? (agregar.error ? mensajeDeError(agregar.error) : null)

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        Nueva anotación
      </label>
      <textarea
        id={id}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAviso(null)
        }}
        rows={3}
        maxLength={LIMITE}
        placeholder="Por ejemplo: se cambió la batería; el cliente vuelve el sábado."
        aria-invalid={!!error}
        aria-describedby={`${id}-ayuda`}
        className="w-full min-w-0 resize-y rounded-sm border border-input bg-card px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
      />
      {vista && (
        <div className="relative w-32">
          <img src={vista} alt="Foto que se adjuntará" className="aspect-[4/3] w-32 rounded-sm border object-cover" />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute -top-2 -right-2 size-6 rounded-full bg-card"
            aria-label="Quitar la foto"
            onClick={() => elegirFoto(undefined)}
          >
            <X aria-hidden />
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              elegirFoto(e.target.files?.[0])
              e.target.value = ''
              setAviso(null)
            }}
          />
          <Button type="button" variant="outline" className="h-9" onClick={() => entrada.current?.click()}>
            <ImagePlus aria-hidden />
            {foto ? 'Cambiar foto' : 'Adjuntar foto'}
          </Button>
          <p id={`${id}-ayuda`} className={cn('text-xs', error ? 'font-medium text-bad-text' : 'text-muted-foreground')} role={error ? 'alert' : undefined}>
            {error ?? (texto.length > LIMITE - 100 ? `Quedan ${LIMITE - texto.length} caracteres` : 'La foto es opcional.')}
          </p>
        </div>
        <Button type="submit" className="h-9" disabled={agregar.isPending}>
          {agregar.isPending ? 'Guardando…' : 'Guardar anotación'}
        </Button>
      </div>
    </form>
  )
}

function FilaNota({ vehiculoId, nota, ultima }: { vehiculoId: string; nota: Nota; ultima: boolean }) {
  const [confirmar, setConfirmar] = useState(false)
  const eliminar = useEliminarNota(vehiculoId)

  return (
    <li className="relative grid grid-cols-[12px_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
      {/* Línea de tiempo: punto y trazo hasta la siguiente nota */}
      <span aria-hidden className="mt-1.5 size-2.5 rounded-full border-2 border-brand-600 bg-card" />
      {!ultima && <span aria-hidden className="absolute top-5 bottom-0 left-[5px] w-px bg-border" />}
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <time dateTime={new Date(nota.fecha).toISOString()} className="text-xs text-muted-foreground">
            {fechaHora.format(nota.fecha)}
          </time>
          {confirmar ? (
            <span className="inline-flex items-center gap-1">
              <span className="mr-1 text-xs text-muted-foreground">¿Eliminar?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={eliminar.isPending}
                onClick={() => eliminar.mutate(nota.id, { onSettled: () => setConfirmar(false) })}
              >
                Sí, eliminar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmar(false)}>
                No
              </Button>
            </span>
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label="Eliminar anotación" onClick={() => setConfirmar(true)}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
        {nota.texto && <p className="max-w-prose text-sm whitespace-pre-line">{nota.texto}</p>}
        {nota.conFoto && <FotoNota notaId={nota.id} />}
      </div>
    </li>
  )
}

function FotoNota({ notaId }: { notaId: string }) {
  const { data: foto, isPending } = useQuery(fotoQuery(claveFotoNota(notaId)))
  const [grande, setGrande] = useState(false)
  if (isPending) return <div className="mt-2 aspect-[4/3] w-40 animate-pulse rounded-sm bg-muted" />
  if (!foto) return <p className="mt-1 text-xs text-subtle-foreground">La foto se guardó en otro navegador.</p>
  return (
    <button
      type="button"
      onClick={() => setGrande((g) => !g)}
      aria-expanded={grande}
      aria-label={grande ? 'Achicar la foto' : 'Ver la foto más grande'}
      className="mt-2 block cursor-zoom-in overflow-hidden rounded-sm border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-expanded:cursor-zoom-out"
    >
      <img
        src={foto}
        alt="Foto de la anotación"
        loading="lazy"
        decoding="async"
        className={cn('object-cover', grande ? 'max-h-[480px] w-full max-w-xl object-contain' : 'aspect-[4/3] w-40')}
      />
    </button>
  )
}
