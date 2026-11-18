import { useEffect, useRef, type CSSProperties } from 'react'
import { BarChart, LineChart, ScatterChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { cn } from '@/lib/utils'

// Solo los módulos que usa el proyecto: mantiene el bundle de gráficos pequeño.
echarts.use([BarChart, LineChart, ScatterChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer])

export type ChartOption = echarts.EChartsCoreOption

interface EChartProps {
  option: ChartOption
  /** Resumen en texto del gráfico para lectores de pantalla */
  label: string
  className?: string
  style?: CSSProperties
}

/** Gráfico ECharts en canvas. La opción debe venir memorizada (useMemo). */
export function EChart({ option, label, className, style }: EChartProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const grafico = useRef<echarts.ECharts | null>(null)
  const ultimaOpcion = useRef(option)

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const chart = echarts.init(el, null, { renderer: 'canvas' })
    grafico.current = chart
    chart.setOption(ultimaOpcion.current, { notMerge: true })

    const observador = new ResizeObserver(() => chart.resize())
    observador.observe(el)

    // Repinta cuando la fuente IBM Plex termina de cargar (el canvas no lo hace solo).
    document.fonts?.ready.then(() => {
      if (!chart.isDisposed()) chart.setOption(ultimaOpcion.current, { notMerge: true })
    })

    return () => {
      observador.disconnect()
      chart.dispose()
      grafico.current = null
    }
  }, [])

  useEffect(() => {
    ultimaOpcion.current = option
    grafico.current?.setOption(option, { notMerge: true })
  }, [option])

  return <div ref={contenedor} role="img" aria-label={label} className={cn('w-full', className)} style={style} />
}
