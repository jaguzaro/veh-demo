/**
 * Estilo base de los gráficos, leído de los tokens de src/index.css
 * para que ECharts (canvas) use exactamente el mismo sistema de diseño.
 */

const cache = new Map<string, string>()

/** Lee un token CSS, p. ej. token('color-brand-600') */
export function token(nombre: string): string {
  let valor = cache.get(nombre)
  if (valor === undefined) {
    valor = getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim()
    cache.set(nombre, valor)
  }
  return valor
}

export const fuente = () => token('font-sans') || 'sans-serif'

/**
 * Opciones comunes: sin animación (movimiento bajo) y tooltip con estilo del sistema.
 * La accesibilidad la da el contenedor (role="img" + resumen en español), no el módulo aria de ECharts.
 */
export function base() {
  return {
    animation: false,
    textStyle: { fontFamily: fuente(), fontSize: 12, color: token('color-neutral-600') },
    tooltip: {
      backgroundColor: token('color-neutral-0'),
      borderColor: token('color-neutral-200'),
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { fontFamily: fuente(), fontSize: 12, color: token('color-neutral-900') },
      extraCssText: 'border-radius:4px; box-shadow: var(--shadow-overlay);',
      confine: true,
    },
  }
}

export function ejeCategoria() {
  return {
    axisLine: { lineStyle: { color: token('color-neutral-200') } },
    axisTick: { show: false },
    axisLabel: { color: token('color-neutral-500'), fontSize: 12, fontFamily: fuente() },
  }
}

export function ejeValor() {
  return {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: token('color-neutral-500'), fontSize: 12, fontFamily: fuente() },
    splitLine: { lineStyle: { color: token('color-neutral-100') } },
  }
}
