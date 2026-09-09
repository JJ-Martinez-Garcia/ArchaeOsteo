# Revisión desde el encargo original

Fecha: 2026-09-09. Referencia: texto inicial de 119 apartados aportado por el autor.
Este documento distingue implementación de validación científica. No declara
terminado el atlas profesional completo solicitado en el encargo.

La lista completa de cierre, con los 119 apartados y mejoras adicionales, está en
[PROJECT_BACKLOG.md](PROJECT_BACKLOG.md). Se mantiene abierta hasta verificar cada requisito.

## Cambios de esta revisión

- Integridad de datos: CSV con notas multilínea, validación de columnas/comillas,
  fusión sin sobrescribir celdas vacías, rechazo atómico y bloqueo revalidado al confirmar.
  Los campos de informe se normalizan ahora a una lista cerrada de textos antes de
  persistirse, evitando que copias malformadas introduzcan objetos en la interfaz.
- Jerarquía: los campos históricos de contexto se proyectan a entidades normalizadas de
  yacimiento, campaña, sector, contexto e individuo con IDs estables y relaciones padre;
  la estructura se conserva en el modelo local y en las copias, y la ficha muestra un
  resumen de los niveles reconocidos al guardar.
  Además, el panel “Jerarquía del proyecto” permite añadir entidades y sus IDs padre sin
  borrar observaciones; su contenido se incluye en la prueba de formularios estrechos.
  El cambio se identifica como esquema de proyecto 3 y los proyectos anteriores se
  normalizan al cargarse.
  La normalización elimina referencias padre inexistentes al importar o restaurar datos,
  conservando la entidad y evitando relaciones huérfanas.
- Rendimiento: el visor muestra en vivo el número de mallas y triángulos de la escena,
  junto con cuántos GLB propios y esquemas están cargados, para detectar perfiles costosos
  antes de probarlos en móviles de memoria limitada. La carga de perfiles limita la
  concurrencia a tres modelos en móviles o dispositivos con ≤2 GB declarados, frente a
  ocho en escritorio.
- Historial ampliado a ficha científica e importación, con pesos/porciones/dentición/contexto.
  Tabla y mediciones conservan ausencia frente a cero. Medidas y landmarks bloqueados.
- Guardado serializado con snapshots, fallback independiente por proyecto y aviso
  persistente de fallo. Recupera la copia más reciente del mismo ID y no abandona
  el proyecto desde el selector si no consigue guardarlo. Pruebas con fallos inducidos.
- XLSX dental exporta códigos canónicos y acepta etiquetas históricas con FDI validado.
  Los detalles y límites están documentados en [DATA_INTEGRITY.md](DATA_INTEGRITY.md).
- Fotografías y fragmentos indeterminados incorporados al snapshot común de deshacer/rehacer;
  sus rutas de edición respetan el bloqueo del elemento seleccionado.
- Los snapshots comunes incluyen también preferencias visuales principales (aislamiento,
  explosión, opacidad, mesa, proyección, wireframe, X-Ray, etiquetas, paleta e iluminación)
  y su restauración sincroniza la escena y sus controles.
- El registro de cambios permite filtrar por método o texto (elemento, individuo,
  investigador) y descargar el subconjunto visible en CSV; la prueba E2E verifica su
  renderizado y actualización.
- Huesos largos y costillas admiten varias porciones simultáneas, cada una con estado y
  completitud propios; el registro nuevo convive con el campo `Portion` heredado y se
  incluye en copias y exportaciones.
- El buscador normaliza acentos y nombres ES/EN/latín/ID y añade sinónimos osteológicos
  frecuentes; el tesauro completo sigue requiriendo curación especializada.
- El modo aprendizaje dispone de preguntas por nivel y modos de identificar/localizar;
  oculta la ficha del hueso mientras dura el ejercicio y permite salir restaurándola.
- Los pesos identificados admiten g/kg por registro; se guardan canónicamente en gramos,
  conservan la unidad introducida para la ficha y mantienen exportaciones/totales anteriores.
- Los fragmentos indeterminados aceptan la misma unidad y convierten a gramos para sus
  totales, manteniendo la unidad original visible.
- La importación de un modelo personalizado respeta el bloqueo del registro seleccionado
  y no reemplaza su malla mientras el registro esté bloqueado.
- Copia `.osteo3d` autocontenida con modelos personalizados cacheados, manifiesto,
  comprobación CRC por ZIP, SHA-256 de `project.json` y de cada modelo en el manifiesto, además de restauración
  probada; JSON se mantiene como formato ligero.
- Osteometría: calibración por dos landmarks y distancia convertida a milímetros,
  con escala por elemento, fecha y procedencia del dato introducido por el usuario;
  no se presenta como calibración científica global.
- Landmarks: captura directa sobre la superficie de la malla seleccionada, guardando
  coordenadas locales, origen `surface_pick`, fecha y operación reversible; se mantiene
  la distinción entre coordenada relativa y medición física.
- Landmarks editables desde la ficha (nombre, categoría y coordenadas), con actualización
  visual y pruebas E2E. Cada landmark conserva la referencia del perfil, procedencia y
  versión de la malla; si cambia una malla con landmarks o calibración, la interfaz lo
  marca, bloquea una nueva calibración y exige confirmación explícita. No se transforma
  automáticamente una coordenada local sin correspondencia anatómica verificable.

- Ampliación: se publican 537 GLB propios para femenino, infante y neonato,
  con metadatos y licencia incorporados; no se han validado científicamente.
- Panel derecho adaptable y separador accesible por ratón/teclado con persistencia.
  Pruebas de todas las pestañas y formularios ampliados a 300 px, en PC de 1024/1440 px;
  el visor ajusta su resolución al cambiar la separación. Los formularios extendidos
  limitan su ancho y la pestaña de informe rellena todos sus campos al abrirse sin
  depender de temporizadores.
- La transparencia visual admite ahora el rango completo 0–100% por hueso, región o
  esqueleto, y el restablecimiento devuelve también ambiente y dirección de la luz.
- El visor incorpora vistas locales medial, lateral, proximal y distal centradas en el
  elemento seleccionado, con lateralidad aplicada a las vistas medial/lateral.
- El informe admite campos explícitos de fuentes consultadas, método y alcance, y
  limitaciones/revisión pendiente; se conservan como texto introducido por el investigador.
- Los diálogos de creación y confirmación tienen foco inicial, ciclo de Tab/Mayús+Tab,
  Escape, restauración del foco y relaciones `aria-labelledby`/`aria-describedby`.
- El informe imprimible localiza sus etiquetas fijas al inglés cuando el proyecto está en
  inglés y conserva sin traducir el texto científico introducido por el investigador.
- Los refrescos de paneles, etiquetas, iluminación y colores del visor se omiten en segundo
  plano; el panel estadístico usa un único ciclo visible para reducir trabajo periódico.
- NISP/MNE/MNI muestran el método y el carácter provisional; una revisión manual exige
  valor entero, justificación y firma del inventario actual, y queda incluida en el
  historial reversible para evitar que un cambio posterior conserve un valor obsoleto.

- 179 elementos con geometría procedural propia para los cuatro perfiles (716
  combinaciones). Código fuente reproducible y exportación individual GLB con
  autoría, MIT, versión y límites. Se conservan los 179 GLB externos del adulto.
- Se corrigen alineación esquemática de columna/pelvis, muñecas/manos y tobillos/pies,
  lateralidad de la vista anterior y separación de falanges medias/distales.
- Los 13 registros agregados/indeterminados dejan de duplicar piezas en el visor,
  sin borrar inventarios. Cráneo, esternón y algunos conjuntos siguen agrupados.
- Los perfiles inmaduros usan proporciones independientes por región y componentes
  separados; no son reducciones uniformes. Cartílago ilustrativo señalado en azul.
- Despliegue con empaquetado sin solapamientos de envolventes y rotaciones con slerp.
  La mesa utiliza esa disposición inicial y conserva sus transformaciones.
- Carga Draco compartida, límite de trabajadores y descarte de cargas obsoletas
  al cambiar de perfil. Restauración de mallas al cambiar de proyecto.
- Distancia de landmarks identificada como unidades locales arbitrarias, nunca mm.
  Las mediciones físicas siguen siendo entradas manuales independientes.
- Se elimina la conversión incorrecta de fragmentos a MNE/MNI. Revisión manual
  con justificación, fecha y detección de cambios posteriores en el inventario.
- Se corrige el salto de línea del CSV de pesos y el acceso al perfil/catálogo móvil.

## Matriz de alcance

| Apartados originales | Estado comprobado / trabajo pendiente |
| --- | --- |
| 1, 5, 35, 84, 95–96 | Cuatro perfiles esquemáticos y créditos; faltan modelos inmaduros de referencia, segmentación completa del cráneo, dentición 3D y catálogo de centros de osificación. No existe validación morfométrica ni por especialista. |
| 2–4, 10, 12–13, 15–19 | Motor, selección, árbol, búsqueda, vistas, transparencia, materiales, iluminación (intensidad, ambiente, presets y dirección persistente) y etiquetas implementados. Selección por superficie ignora piezas ocultas. Las fichas científicas no documentadas no se inventan. |
| 6–9, 66 | Despliegue, slerp y mesa operativos. La disposición usa estantes compactos, no el orden regional exacto del encargo. No se certifica ausencia de colisiones durante toda la transición ni articulación exacta de los GLB externos. |
| 11, 20–21 | Fichas y osteometría manual; landmarks relativos. Falta calibración métrica trazable, selección de landmarks por clic y biblioteca anatómica curada. |
| 14, 22, 83 | Comparación de perfiles esquemáticos e inventarios y ejercicios básicos existentes. La comparación de inventarios identifica y filtra por individuo, contexto, UE y campaña, coteja porciones independientes por elemento y conserva la diferencia entre valores cero y campos desconocidos (`—`). Pendientes escala física común, sincronización avanzada de vistas, comparación por más de dos fuentes, comparación por hueso más profunda y revisión pedagógica. |
| 23–34, 36–37, 41–57, 59–65, 67–73 | Inventario, estados, conservación, porciones, lateralidad, dientes FDI, fragmentos, peso, fotos, notas, filtros, pintura y tablas implementados. E2E cubre odontograma permanente/deciduo, acciones masivas confirmadas, selección múltiple reversible, modos rápidos y sinónimos del buscador. No se certifican todos los casos de cada formulario ni un mapa científico completo. |
| 38–40, 97 | Métodos visibles y corrección del uso de fragmentos. NISP automático cuenta registros; MNE/MNI son mínimos provisionales según categorías determinadas y asociaciones introducidas. Las medias de resumen, regionales y de conservación excluyen valores desconocidos; el mapa de fragmentación también separa fragmentos observados de elementos sin registro. Para colecciones mezcladas se necesita análisis especializado y revisión manual documentada. |
| 58, 69 | Deshacer/rehacer y registro de cambios mediante snapshots comunes para inventario, ficha científica, importación, fotografías, fragmentos indeterminados, odontogramas, contexto, medidas, landmarks y calibraciones; quedan operaciones visuales/configuración y una auditoría transaccional más completa. |
| 74–78 | Informe imprimible/PDF del navegador con reglas A4 para paginación, JSON, CSV multilínea, XLSX e importación con previsualización existentes. CSV/XLSX protegen ahora texto introducido con prefijos de fórmula. XLSX incluye una hoja `Esquema` autodocumentada e importa hojas auxiliares de osteometría, landmarks, calibraciones, referencias, revisión, cambios y metadatos; el informe añade un mapa regional SVG esquemático, y siguen pendientes cartografía anatómica profesional, round-trip con casos reales y PDF de maquetación avanzada. |
| 79–82, 98 | IndexedDB, proyectos, guardado y copias de datos locales. Las copias `.osteo3d` incluyen binarios, CRC y SHA-256; la CSP y `no-referrer` limitan salidas implícitas, y `validate-privacy` audita el código fuente en CI. La jerarquía normalizada ya conserva entidades y relaciones básicas; queda una interfaz relacional completa para múltiples yacimientos/campañas y los binarios de modelos personalizados no van incluidos en la copia JSON. No eliminar la caché como sustituto de una copia completa. |
| 85, 90–92, 114–115 | ES/EN y búsqueda por latín existentes; acceso móvil a catálogo/perfil corregido; foco visible, diálogos con foco modal y movimiento reducido incorporados. Queda traducción de algunos controles/métodos nuevos y auditoría de contraste, lector de pantalla, zoom y tamaños táctiles con dispositivos reales. |
| 86–89, 100, 112–113 | PWA, descarga/caché por perfil, carga diferida e importación de modelos operativas; los esquemas están en el shell offline. Faltan optimización/medición sostenida en móviles reales y validación de todos los formatos personalizados. |
| 93–94, 108–109, 116 | Separación nueva del generador, análisis y cargador; preservación de IDs y datos. Los ciclos periódicos de UI se omiten en segundo plano, pero `main.js` conserva deuda de modularidad y algunos temporizadores históricos. |
| 99, 101–107, 110–111, 117–119 | GitHub/Pages y pruebas automatizadas existentes. Las siete fases y el resultado profesional completo no deben marcarse terminados mientras queden los puntos científicos y funcionales anteriores. |

## Verificación reproducible

- `pnpm test`: sintaxis, regresiones funcionales de dominio y 716 geometrías;
  posiciones finitas, lateralidad, proporciones no uniformes, ausencia de
  intersecciones de cajas en posición desplegada, metadatos y ronda exportar/leer GLB.
- `pnpm build`, `pnpm validate-pwa`, `pnpm validate-shell`, `pnpm validate-model-assets`.
- `pnpm test:e2e`: Chromium real con WebGL, carga GLB, cambio entre los cuatro
  perfiles, 179 mallas esquemáticas, persistencia IndexedDB, vista móvil sin
  desbordamiento horizontal y arranque offline con servidor detenido.
- Integridad: se fuerzan fallos de IndexedDB y cuota, se recupera el guardado,
  se importa CSV multilínea, se deshace/rehace y se prueba un bloqueo posterior
  a la previsualización. Pruebas de medidas, tabla y peso desconocido frente a cero.
- `OSTEO3D_CAPTURE_3D=1`: capturas locales de revisión en `.tmp-model-review/`
  (no se publican ni contienen inventarios del usuario; se generan en un perfil de prueba).
- GitHub Actions ejecuta build, pruebas, validadores y E2E antes de Pages; tras el despliegue,
  `scripts/verify-pages.mjs` comprueba que la entrada pública responde y contiene manifest/assets.
  El verificador admite `OSTEO3D_VERIFY_ATTEMPTS`, `OSTEO3D_VERIFY_DELAY_MS` y
  `OSTEO3D_VERIFY_TIMEOUT_MS` para dar margen a la propagación de Pages sin dejar colgado
  el job ni ocultar un fallo final.

Las pruebas automatizadas no constituyen validación anatómica, antropológica,
diagnóstica o arqueométrica. No se ha realizado una revisión manual exhaustiva
de cada uno de los 119 apartados ni de cada malla importada.

## Referencias metodológicas

Marean et al., *Estimating the minimum number of skeletal elements (MNE) in
zooarchaeology: a review and a new image-analysis GIS approach*:
https://pubmed.ncbi.nlm.nih.gov/20043371/ (consulta 2026-09-09).
El análisis de solapamiento no se sustituye por contar fragmentos.
Contexto y límites del generador: `public/models/PROCEDURAL.md`.

## Siguiente trabajo prioritario

1. Curación y validación anatómica con especialista; aportar imágenes/mallas con
   procedencia, escala y grupo de edad documentados.
2. Registro independiente de componentes inmaduros y huesos craneales; dientes 3D.
3. Calibración métrica, captura de landmarks en superficie, revisión ante sustitución de
   malla y copia completa con binarios.
4. Verificar importación/exportación con casos reales, completar mapa esquelético, historial transaccional y traducciones.
