# Design Brief — VehDemo

## Producto
Dashboard de gestión para un predio de venta de carros usados. Usuario principal: el dueño del predio. Enfoque en dinero, con métricas fáciles de entender: cuánto se ganó, cuánto se gastó y en qué, en un período. Cada vehículo se sigue desde la compra hasta la venta, con todos sus gastos. Se evitan métricas complejas (ROI, CAC, conversión, punto de equilibrio).

## Estructura
Cuatro pestañas:
1. Resumen (ganancias y gastos del período).
2. Inventario (lista de vehículos y detalle de cada uno, con registro).
3. Clientes (quienes le venden autos al predio y quienes los compran).
4. Reporte mensual (versión imprimible para guardar en PDF).

## Resumen
- Indicador principal: ganancia del período (ventas menos lo que costaron esos autos, con compra y gastos), con su gráfico de ganancia por mes.
- Tarjetas: Autos vendidos, Autos comprados, Gastos y Autos en el predio (con alerta si mucho dinero lleva más de 60 días). Solo número y flecha de cambio, sin texto explicativo.
- Regla: poco texto y más barras. Nada de promedios ni porcentajes difíciles; mostrar montos y cantidades. Sin descripciones bajo los títulos de panel.
- Gastos por mes (compra de autos y otros gastos), ¿En qué se gasta? (desglose por tipo), autos vendidos que dejaron más y menos, y autos con más de 60 días sin venderse.
- Definiciones: *ventas* = precio de los autos vendidos en el período; *gastos* = compras de autos + todos los demás gastos con fecha en el período; *ganancia* = ventas − costo total de esos mismos autos.

## Inventario
- Fases de un vehículo: Compra → En preparación → A la venta → Vendido.
- Lista paginada (20 por página) con pestañas por fase (En el predio por defecto), búsqueda por marca, modelo, año, placa, VIN o color, y orden. Columnas: compra, gastos, costo total, venta o precio pedido, y ganancia (real o esperada).
- Dos vistas (`?vista=tabla|tarjetas`; la primera vez, tarjetas). La vista elegida se recuerda en el navegador y el enlace «Inventario» del detalle regresa a la misma pestaña, búsqueda, página y vista: la tabla para comparar números; las tarjetas para reconocer cada auto por su foto. Tarjeta: foto 16:10, nombre y fase, placa y carrocería, precio (o venta) y costo, y abajo ganancia y días.
- Fotos: una por vehículo, se agrega desde el detalle. Se reduce a 1200 px en JPEG y se guarda en IndexedDB de este navegador (con la API, será una URL por vehículo). Sin foto se muestra la silueta de su carrocería (SUV, pickup, sedán, hatchback, microbús) en tonos de marca.
- Detalle: foto, cuentas del vehículo (compra + gastos = costo total; venta − costo total = ganancia), recorrido por fases, ficha técnica, clientes, anotaciones y tabla de gastos.
- Ficha técnica: marca, modelo, año, carrocería, color, combustible (gasolina, diésel, híbrido, eléctrico), kilometraje actual, placa, VIN (17 caracteres sin I, O ni Q; único en el inventario), número de motor y modalidad de ingreso. Se captura al registrar el ingreso y se edita desde el detalle (p. ej. para actualizar el kilometraje).
- Modalidad de ingreso: *propio del predio* o *en consignación*. En consignación el auto sigue siendo del dueño; el campo de compra pasa a ser «Acordado con el dueño» (lo que se le paga al venderse) y las cuentas no cambian: venta − acordado − gastos = ganancia. Se marca con la etiqueta «Consignación» en lista, tarjetas y detalle.
- Anotaciones: bitácora por vehículo, de la más reciente a la más antigua, con fecha y hora. Cada nota lleva texto, una foto opcional o ambos (golpes, piezas cambiadas, documentos); la foto se guarda como las del vehículo, con la clave `nota:<id>`.
- Registro: registrar ingreso (antes «compra»: ficha técnica, modalidad y a quién se le compró), agregar o eliminar gasto, poner a la venta (precio pedido) y registrar venta (comprador obligatorio; la comisión se guarda como gasto). Los formularios muestran la ganancia resultante antes de guardar.
- Tipos de gasto: mecánica, pintura y enderezado, llantas, limpieza y detallado, trámites y traspaso, traslado, publicidad, comisión de venta y otro.

## Reporte de inventario
- Ruta `/inventario/reporte?fase=predio|preparacion|disponible`; se abre con «Reporte PDF» desde Inventario con la pestaña actual (Vendidos y Todos se reportan como todo el predio). Misma hoja carta e impresión que el reporte mensual; las piezas compartidas viven en `components/reporte/piezas.tsx`.
- Contenido: autos propios (cantidad, cuánto costaron, cuánto se pide y ganancia esperada de los que ya tienen precio); consignación aparte, porque lo acordado no es dinero del predio; barras por fase y por días en el predio (0–30, 31–60, más de 60 en rojo); lista completa por fase, de más a menos días, con total por fase. El total nunca queda solo en otra página.

## Clientes
- Un solo registro de personas: la misma persona puede venderle un auto al predio y luego comprar otro. Pestañas: Todos, Compraron un auto, Vendieron al predio.
- Datos: nombres, apellidos, DPI (CUI de 13 dígitos con dígito verificador, departamento y municipio válidos; no se repite), NIT con su verificador o CF, teléfono de 8 dígitos (acepta +502), correo opcional y dirección opcional (se usa en el traspaso).
- Se eligen dentro de los formularios de ingreso y venta con un buscador (nombre, DPI, NIT o teléfono, sin importar acentos) o se registran ahí mismo sin salir del formulario.
- Detalle del cliente: sus datos y la lista de negocios con el predio (qué auto, si lo vendió, lo dejó en consignación o lo compró, fecha y monto).

## Reporte mensual
- Ruta `/reporte?mes=AAAA-MM`; por defecto, el último mes cerrado. Se descarga con la impresión del navegador («Guardar como PDF»), sin librerías de PDF.
- Hoja tamaño carta: ganancia con la cuenta Vendiste − Te costaron, números del mes comparados con el mes anterior en cantidades (no porcentajes), ganancia de 6 meses y gastos por tipo en barras HTML (se imprimen nítidas), tabla de autos vendidos con total y autos con más de 60 días al cierre.
- Impresión: sin menú (`print:hidden`), `@page` carta, colores exactos; el total va en el cuerpo de la tabla para que no se repita en cada página.
- El envío automático cada fin de mes corresponde a la API en Go.

## Filtros
Resumen: período (este mes, mes pasado, últimos 3 o 6 meses, este año, últimos 12 meses). Inventario: fase, búsqueda y orden. El predio no maneja sucursales: siempre se ve el total del predio. Los filtros viven en la URL.

## Paleta
Azul y blanco. Azul como color de marca y de datos; blanco como superficie. Los colores de alerta (verde, amarillo, rojo) se usan solo de forma semántica para alertas (pérdidas, autos con muchos días en el predio) y nunca como decoración.

## Prioridades de diseño
- Menos es más: números grandes, gráficos claros, poca tabla con texto.
- Lectura rápida y jerarquía clara; densidad media.
- Responsivo (escritorio primero, usable en tablet y móvil).

## Tono visual, tipografía y referencias
Dirección elegida: **"Libro Mayor Suizo"**. Swiss minimal y plano: retícula estricta, líneas finas en vez de sombras, un único azul cobalto como color de marca y de datos. La jerarquía la dan el tamaño y el peso tipográfico, no la decoración.

Los tokens viven en `src/index.css` (bloque `@theme`), que es la fuente de verdad. Las paletas, sombras, tamaños de texto y fuentes por defecto de Tailwind están desactivados: solo existen los tokens del sistema.

### Color
- **Azul cobalto (marca = 600):** 50 `#EFF4FF` · 100 `#DBE6FE` · 200 `#BFD3FE` · 300 `#93B4FD` · 400 `#6090FA` · 500 `#3B6EF5` · **600 `#2552E0`** · 700 `#1D41C2` · 800 `#1E389D` · 900 `#1E327C` · 950 `#141F4D`.
- **Neutros fríos:** 0 `#FFFFFF` (tarjeta) · 50 `#F7F8FA` (fondo de página) · 100 `#EEF0F4` (retícula, hover) · 200 `#DDE1E8` (borde) · 300 `#C3C9D4` · 400 `#868FA0` (borde fuerte, inputs) · 500 `#646E80` (texto terciario) · 600 `#4B5466` (texto secundario) · 700 `#363E4E` · 800 `#232A38` · 900 `#151A24` (texto principal).
- **Semánticos** (relleno / texto): verde `#16A34A` / `#15803D` · amarillo `#D97706` / `#B45309` · rojo `#DC2626` / `#B91C1C`. Solo para alertas: pérdidas, autos con más de 60 días y alertas de KPI. El amarillo nunca se usa como texto en su tono de relleno.
- **Series de gráficos:** 1 cobalto 600 (principal) · 2 cobalto 400 (comparativo / meta) · 3 cobalto 800 · 4 neutro 400 · 5 cobalto 950.
- **Contraste verificado (WCAG AA):** todo texto ≥ 4.5:1 sobre blanco y sobre el fondo de página; rellenos de gráficos, bordes de inputs y barras de alerta ≥ 3:1 sobre blanco.

### Tipografía
- **IBM Plex Sans** (variable) para títulos (600) y texto (400/500). Las cifras de las tablas usan Plex Sans con cifras tabulares (se alinean igual y pesan menos que Plex Mono, que queda instalada pero sin uso).
- Cifras tabulares activadas globalmente.
- Escala: `xs` 12 · `sm` 14 (texto base de interfaz) · `base` 16 (título de panel) · `lg` 18 · `xl` 20 · `2xl` 24 (título de página) · `kpi` 36 (número KPI) · `kpi-sm` 28 (número KPI en móvil) · `hero` 56 (solo el indicador rey, uno por pantalla).
- Párrafos con `text-wrap: pretty` para evitar palabras sueltas al final.
- Fuentes servidas desde el propio bundle (`@fontsource`), sin Google Fonts.

### Forma, elevación y espacio
- **Radios:** 2 px en controles, 4 px en tarjetas. `rounded-full` solo para avatares e indicadores.
- **Sombras:** ninguna en la superficie. Las tarjetas usan borde de 1 px neutro 200. Única sombra (`shadow-overlay`) para popovers, menús y diálogos.
- **Densidad media:** escala de espacio en múltiplos de 4 px (4 · 8 · 12 · 16 · 24 · 32). Tarjetas con 16–20 px de relleno y 16 px entre ellas.
- **Movimiento bajo:** solo transiciones de color u opacidad de 120 ms. Sin animaciones de entrada. Se respeta `prefers-reduced-motion`.

### Patrón: tarjeta KPI
- Fondo blanco, borde de 1 px neutro 200, radio 4 px, sin ícono decorativo ni fondo de color.
- Etiqueta en `sm`, en tipo oración (nunca en mayúsculas), neutro 600. Número en `kpi` (36 px; `kpi-sm` en móvil), peso 600, neutro 900. Variación en una línea debajo, en verde o rojo de texto semántico. Si la variación supera el 300 % se muestra "Más de 300 %"; si el valor cambia de signo no se muestra porcentaje.
- **Estado de alerta** (tomado de la propuesta "Instrumento"): el borde izquierdo pasa a 2 px en el color de *texto* semántico (rojo `#B91C1C` o amarillo `#B45309`), y se añade un texto corto con ícono pequeño (por ejemplo "Bajo meta") para no depender solo del color. Un KPI sano no lleva barra (nunca verde). El cambio de estado es instantáneo.
- Cuando subir o bajar no es bueno ni malo (gastos, autos comprados), la variación se muestra en gris, sin juzgarla.

### Patrón: indicador principal (ganancia del período)
- Única superficie de color de la interfaz: banda en cobalto 700 a todo el ancho, primera en el Resumen. Es el elemento memorable; todo lo demás se mantiene sobrio.
- Ganancia en `hero` (56 px; 40 px en móvil) blanco; textos secundarios en cobalto 100 (6.48:1). Debajo, la cuenta que la explica: ventas y lo que costaron esos autos.
- Gráfico de ganancia por mes: meses del período en blanco y meses de contexto en cobalto 300 (3.94:1 sobre cobalto 700).

### Patrón: gráficos (ECharts, canvas)
- Barras planas en cobalto 600; comparativo o meta en cobalto 400. Sin retícula vertical; líneas horizontales en neutro 100. Ejes en `xs`, neutro 500.
- Rojo de texto semántico solo para pérdidas y autos con más de 60 días sin venderse.
- Preferir etiquetas directas a leyendas cuando haya pocas series.
- Sin animaciones. Cada gráfico lleva `role="img"` y un resumen en texto de sus datos para lectores de pantalla.
- Rankings cortos (pocas filas) en barras HTML, no en canvas.

### Patrón: formularios
- En diálogos (`shadow-overlay`, solo transición de opacidad). Etiqueta visible en cada campo, error junto al campo que se quita al editarlo, montos con prefijo "Q".
- Las acciones destructivas piden confirmación (eliminar gasto, restablecer datos de ejemplo).
- Fase del vehículo como etiqueta neutra o cobalto, nunca con colores semánticos.

### Patrón: estados
- Cargando: esqueletos con la altura final de cada bloque (sin saltos de layout). Al cambiar filtros se conservan los datos anteriores atenuados hasta que llegan los nuevos.
- Vacío: un mensaje que explica la causa y qué filtro cambiar.
- Error: mensaje claro y botón "Reintentar".

## Evitar
Aspecto genérico de IA (Inter por defecto, degradado morado, tarjetas redondeadas uniformes, sombras iguales en todo).

## Pendiente de definir
Modo oscuro (fuera de alcance por ahora). Conexión a la API en Go: hoy los datos de ejemplo vienen de `src/api/semilla.ts` y lo que se registra se guarda en el navegador (`src/api/store.ts`); al conectar la API solo cambian las funciones de `src/api/endpoints.ts`. Editar un vehículo o una venta ya registrada todavía no está disponible.
