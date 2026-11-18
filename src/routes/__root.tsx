import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fmtFecha } from '@/lib/format'
import { alternarTema, useTema } from '@/lib/tema'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Layout,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <p className="text-base font-semibold">Esta página no existe</p>
      <Link to="/" className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline">
        Ir al resumen
      </Link>
    </div>
  ),
})

const FECHA_DATOS = fmtFecha(Date.now())

const SECCIONES = [
  { to: '/', etiqueta: 'Resumen', exacto: true },
  { to: '/inventario', etiqueta: 'Inventario', exacto: false },
  { to: '/clientes', etiqueta: 'Clientes', exacto: false },
  { to: '/reporte', etiqueta: 'Reporte', extra: ' mensual', exacto: false },
] as const

function Layout() {
  const oscuro = useTema() === 'oscuro'
  const IconoTema = oscuro ? Sun : Moon
  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-card focus:px-3 focus:py-2 focus:shadow-overlay"
      >
        Saltar al contenido
      </a>
      <header className="border-b bg-card print:hidden">
        {/* En móvil el menú baja a una segunda fila: en 360 px no caben logo, 4 secciones y el botón de tema. */}
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-stretch gap-x-5 px-4 sm:gap-x-8 lg:px-8">
          <Link to="/" className="order-1 flex h-14 items-center text-lg font-semibold tracking-tight text-foreground">
            VehDemo
          </Link>
          <nav aria-label="Secciones" className="order-3 flex h-11 w-full items-stretch gap-4 sm:order-2 sm:h-14 sm:w-auto sm:gap-6">
            {SECCIONES.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                activeOptions={{ exact: s.exacto, includeSearch: false }}
                className="-mb-px flex items-center border-b-2 whitespace-pre border-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground"
              >
                {s.etiqueta}
                {'extra' in s && <span className="max-sm:hidden">{s.extra}</span>}
              </Link>
            ))}
          </nav>
          <div className="order-2 ml-auto flex h-14 items-center gap-3 sm:order-3">
            <p className="hidden text-xs text-muted-foreground md:block">Hoy es {FECHA_DATOS}</p>
            <Button
              variant="ghost"
              size="icon"
              className="max-sm:size-10"
              onClick={alternarTema}
              aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={oscuro ? 'Modo claro' : 'Modo oscuro'}
            >
              <IconoTema aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-[1440px] px-4 pt-6 pb-12 lg:px-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  )
}
