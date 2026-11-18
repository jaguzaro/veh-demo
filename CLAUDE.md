# VehDemo — Sistema de reportes y dashboards

## Contexto
Frontend de un sistema grande de reportes y dashboards (uso interno, detrás de login). Consume una API en Go. Prioridades: velocidad de carga y responsividad. Esto es una demo inicial.

## Stack
React + TypeScript + Vite (SPA, sin SSR), Tailwind v4, TanStack Router/Query/Table, shadcn/ui (Radix) solo como base estructural y de accesibilidad.

## Reglas de rendimiento
- Code-splitting por ruta (lazy loading).
- Tablas grandes siempre virtualizadas.
- Gráficos en canvas (ECharts), no en SVG masivo.
- Datos con TanStack Query (caché); no pedir datos crudos, usar endpoints agregados y paginados.
- Evitar re-renders innecesarios.

## Reglas de diseño
- Prohibido usar los valores por defecto de Tailwind/shadcn como apariencia final. Toda decisión visual (color, tipografía, espaciado, radios) sale de los tokens del sistema de diseño del proyecto.
- Evitar el aspecto genérico de IA: tipografía Inter por defecto, degradados morados, tarjetas redondeadas uniformes, sombras iguales en todo.
- Interfaz orientada a lectura rápida de datos: densidad media, jerarquía clara, poca decoración.
- Antes de crear pantallas, debe existir el sistema de diseño persistido (DESIGN-BRIEF.md y tokens).

## Uso de skills
- ui-ux-pro-max: definir y persistir el sistema de diseño.
- frontend-design: construir cada pantalla sobre ese sistema.
- impeccable: auditar y criticar cada pantalla al terminarla.
- vercel-react-best-practices: al escribir o revisar código React.
- web-design-guidelines: revisión de accesibilidad y UI del código.
- shadcn: al agregar o componer componentes.

## Reglas de trabajo
- Construir una pantalla a la vez y auditarla antes de pasar a la siguiente.
- No instalar dependencias nuevas sin avisar.
