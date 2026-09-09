# Osteo3D

Base inicial de una PWA modular para atlas osteológico 3D e inventario bioarqueológico.

## Estado actual

Importación CSV multilínea con fusión explícita, bloqueos y deshacer/rehacer.
Los campos vacíos no se convierten en cero; el guardado avisa si falla y conserva
copias de recuperación por proyecto. [Garantías y límites de datos](DATA_INTEGRITY.md).

Panel derecho de PC: separador arrastrable entre visor y ficha, anchura recordada,
flechas de teclado y doble clic para restablecer. Pestañas y formularios se adaptan
sin desplazamiento horizontal del panel; las tablas extensas mantienen su propio scroll.

Los perfiles femenino, infante y neonato incluyen ahora **537 GLB propios** (179
por perfil) con nombres, componentes y licencia MIT, además del generador reproducible
`pnpm generate-profile-models`. Son modelos didácticos, no reconstrucciones validadas
de especímenes. Consultar [fuentes y límites](public/models/SOURCES.md).

Actualización 2026-09-09: los cuatro perfiles cuentan con **179 representaciones 3D
esquemáticas propias por perfil**, disponibles offline y exportables como GLB.
Se conservan los modelos externos y sus créditos. Los esquemas no son escaneos,
no tienen escala métrica y no sirven para estimar edad o sexo. Los otros 13
registros del catálogo son categorías agregadas/indeterminadas, no huesos ausentes.
Consulta [la revisión del encargo y pendientes](PROJECT_REVIEW.md) y
[el método del generador](public/models/PROCEDURAL.md).

[Lista de cierre de los 119 puntos y mejoras propuestas](PROJECT_BACKLOG.md).

MNE/MNI automáticos son provisionales y ya no convierten fragmentos en huesos o
individuos. Admiten revisión manual justificada; si cambia el inventario se exige
actualizar la revisión. Las distancias del visor se indican en unidades arbitrarias.

Esta primera fase implementa un MVP ejecutable con:

- visor Three.js con elementos osteológicos independientes;
- cámara orbital con rotación por arrastre, zoom con rueda, desplazamiento y centrado contextual;
- selección por clic, árbol y búsqueda en español/inglés/latín/ID;
- ficha básica, aislamiento, centrado, vistas y control de explosión;
- selector de perfiles preparado para adulto masculino, adulto femenino, infante y neonato;
- mesa osteológica reversible para revisar los elementos en una disposición plana sin alterar el inventario;
- persistencia local básica y service worker de shell;
- pestaña “Pintar inventario” con estados, pendientes y contador de revisión;
- tabla editable sincronizada, bloqueo de registros y aplicación por región;
- tabla científica ampliada con fragmentos, porciones, tafonomía y patología por elemento;
- odontograma permanente FDI con estados dentales (incluidos fragmentación y patología) y persistencia local;
- odontograma deciduo FDI independiente (20 dientes) con persistencia separada;
- módulo de osteometría con medidas en milímetros, landmarks relativos y resumen de cobertura;
- osteometría ampliada con diámetro, unidades mm/cm, distancia entre landmarks y marcadores visibles sobre el hueso;
- panel de estadísticas con representación, conservación media y filtros por estado, región y lateralidad;
- filtros científicos por registro de tafonomía y patología aplicados al visor y a las estadísticas;
- informe osteoarqueológico imprimible con identificación, inventario, dentición, mediciones y landmarks;
- exportación XLSX diferida con hojas de inventario y odontogramas permanente/deciduo;
- porciones anatómicas dependientes del tipo de elemento y cuantificación agrupada por individuo;
- fotografías locales asociadas al elemento seleccionado y almacenadas offline;
- registro científico de fragmentos, porciones, tafonomía, patología y notas;
- registro separado de fragmentos indeterminados con tipo, tamaño, peso, contexto y observaciones;
- registro de peso por elemento, total y región, con separación del peso indeterminado;
- mapa visual de conservación esquelética actualizado con el inventario;
- copias de seguridad JSON e importación validada de JSON, CSV y XLSX;
- compartir copias mediante Web Share API con fallback seguro a descarga;
- historial auditable de cambios de presencia, acciones masivas y deshacer/rehacer, persistido con el proyecto;
- análisis transparente de NISP, MNE y MNI con desglose de método;
- comparación de perfiles, quiz de identificación y selector español/inglés para navegación y acciones principales;
- Three.js cargado de forma diferida para reducir el bundle inicial;
- instalación y actualización de la PWA controladas por el usuario;
- persistencia IndexedDB versionada (esquema 2) con normalización y respaldo automático a `localStorage`;
- gestor local de proyectos con selector, creación de proyectos y persistencia independiente por proyecto;
- autosalvado silencioso cada 30 segundos y al pasar la aplicación a segundo plano;
- indicador de conectividad para distinguir trabajo sincronizado de trabajo local offline;
- precarga offline del HTML, manifest y chunks JS/CSS del build publicado;
- líneas guía en modo explosión para relacionar cada elemento con su posición anatómica;
- catálogo de perfiles y loader preparado para assets GLB independientes;
- decodificación Meshopt integrada y Draco opcional mediante ruta de decodificador configurable;
- importación de GLB locales por perfil, con validación de cabecera `glTF`, correspondencia con `Bone_ID` y caché offline;
- importación temporal de modelos propios GLB, GLTF, OBJ y STL para el elemento seleccionado;
- transparencia aplicada al hueso, a su región o al esqueleto completo, persistida por proyecto;
- modo visual X-Ray reversible para inspección de estructuras superpuestas;
- etiquetas configurables para el elemento seleccionado, regiones, catálogo completo o ninguna;
- modo de coloración por región con alternativa de color neutro;
- comparación 3D de referencia entre perfiles, con escala diferenciada y aviso de geometría provisional;
- reproducción y pausa del despliegue osteológico mediante animación del slider de explosión;
- limpieza automática de la referencia 3D al restablecer la vista o cambiar de proyecto;
- validador de manifiestos GLB que exige perfiles, rutas, estado de cobertura y licencia antes de incorporar assets;
- catálogo ampliado de marcadores independientes para columna, costillas, cintura, extremidades, manos y pies;
- pruebas de humo automatizadas para manifest, offline, módulos y artefactos de build;
- prueba de extremo a extremo en Chrome real para manifiesto, Service Worker, GLB, IndexedDB y reinicio sin conexión;
- interfaz responsive para escritorio y móvil.
- recuperación de errores de interfaz con aviso no destructivo y diagnóstico en consola;

El perfil adulto masculino publica 179 de 192 elementos GLB documentados: un cráneo CC0 y 178 adaptaciones Open3Dmodel bajo CC BY-SA 4.0. Los 13 elementos agregados o indeterminados restantes y los perfiles adulto femenino, infante y neonato usan marcadores geométricos de desarrollo, que no deben interpretarse como modelos aptos para medición o diagnóstico. El investigador también puede importar paquetes GLB por `Bone_ID` o asociar un modelo propio GLB, GLTF, OBJ o STL al hueso seleccionado. Los modelos propios y sus metadatos se guardan en la caché local del navegador para reutilizarlos offline; no se publican en el repositorio ni se incluyen dentro de las copias JSON, por lo que una restauración en otro navegador debe volver a importar los archivos.

## Arquitectura prevista

La aplicación se organizará por dominios: `viewer`, `anatomy`, `inventory`, `osteometry`, `odontology`, `taphonomy`, `pathology`, `database`, `export`, `reports` e `i18n`. Los datos científicos deberán conservarse como registros independientes de la escena 3D, con IDs estables y transformaciones anatómica/desplegada separadas.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm test
npm run validate-pwa
npm run validate-model-assets
npm run test:e2e
```

`npm test` comienza verificando la sintaxis de todos los archivos JavaScript de `src`, `scripts` y `tests`, y después ejecuta las pruebas de humo. El mismo control se ejecuta en GitHub Actions antes del despliegue.

`npm run test:e2e` necesita una compilación previa en `dist` y Chrome, Edge o Chromium. La prueba local abre un perfil de navegador temporal, valida la carga de un GLB y la persistencia, detiene el servidor, activa el modo sin red y exige que la aplicación vuelva a arrancar desde el Service Worker. También puede comprobar la integración en línea de un despliegue existente mediante `OSTEO3D_E2E_URL=https://.../ npm run test:e2e`; la garantía offline se mantiene en la prueba local determinista del mismo artefacto.

## Probar la PWA publicada

La versión desplegada está disponible en [GitHub Pages](https://jj-martinez-garcia.github.io/ArchaeOsteo/). Para instalarla, abre la URL en un navegador compatible y usa el botón `Instalar PWA` o la opción equivalente del navegador. En iOS/iPadOS: `Compartir → Añadir a pantalla de inicio`.

Para comprobar el funcionamiento offline, abre la aplicación una vez con conexión, espera a que el diagnóstico indique que el shell está en caché y vuelve a abrirla sin red. Los proyectos, el inventario y los modelos importados se conservan localmente en el navegador; los modelos propios no forman parte de las copias JSON.

Cuando se publica una nueva versión, la aplicación muestra `Nueva versión disponible`. Guarda primero los datos locales y pulsa `Actualizar ahora`; el service worker activa el nuevo shell y recarga la aplicación de forma controlada.

El workflow de GitHub Actions ejecuta automáticamente `pnpm build`, los smoke tests, las validaciones PWA y de modelos y la prueba E2E en Chrome antes de desplegar a Pages.

## Fases siguientes

1. Completar los 13 elementos adultos pendientes y localizar modelos independientes para los perfiles femenino, infantil y neonatal.
2. Separar completamente inventario, informes y configuración en stores especializados.
3. Añadir porciones específicas por anatomía y controles de cuantificación por individuo.
4. Incorporar modelos GLB documentados para los perfiles todavía pendientes.

La especificación completa de producto está documentada en el requisito de proyecto entregado a Codex.
