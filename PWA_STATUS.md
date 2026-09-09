# Estado de Osteo3D PWA

Fecha de revisión: 2026-09-09

## Estado operativo verificado

- Destino configurado de GitHub Pages: https://jj-martinez-garcia.github.io/ArchaeOsteo/ (la verificación externa depende de la red y de la propagación del despliegue).
- Repositorio y rama de publicación: `JJ-Martinez-Garcia/ArchaeOsteo`, `main`.
- Manifiesto PWA con `standalone`, iconos PNG de 192 y 512 px, accesos directos a inventario e informe y rutas relativas compatibles con GitHub Pages.
- Service Worker con precarga del shell, caché de recursos generados por Vite, recuperación offline y actualización controlada mediante `SKIP_WAITING`. El nombre de caché se calcula por versión y fingerprint de assets en cada build.
- Datos de proyectos, inventario, informes y fotografías guardados con IndexedDB y fallback localStorage por proyecto; los binarios de modelos personalizados usan caché separada y no se incluyen en la copia JSON.
- Guardado verificado mediante fallos inducidos de IndexedDB y cuota: aviso persistente si fallan ambos almacenes, recuperación por ID y cola de snapshots independientes. CSV multilínea, bloqueo, deshacer/rehacer y valores desconocidos también probados en navegador.
- Visor Three.js/WebGL con controles de cámara, selección, aislamiento, transparencia, rayos X, wireframe, colores regionales, explosión y modo de mesa.
- Interfaz en español e inglés, incluida la localización de controles y avisos después de la interacción.
- Créditos y licencias de código, terceros y modelos visibles desde la aplicación y precacheados
  para consulta offline.
- Informe imprimible con mapa regional esquemático, etiquetas ES/EN, paginación A4 y tablas con
  cabeceras repetibles; XLSX incluye una hoja `Esquema` y hojas auxiliares importables.

## Comprobaciones reproducibles

Desde la raíz del repositorio:

```text
pnpm test
pnpm validate-pwa
pnpm validate-model-assets
pnpm test:e2e
pnpm verify-pages -- https://jj-martinez-garcia.github.io/ArchaeOsteo/
git diff --check
```

La prueba E2E abre la compilación en un perfil temporal de Chrome, comprueba el manifiesto detectado por el navegador, el registro y control del Service Worker, la cobertura publicada, la carga GLB y la persistencia IndexedDB. En la prueba local detiene además el servidor HTTP, reinicia la aplicación sin red y exige que una petición inédita falle, evitando confundir la recuperación de caché con una respuesta todavía servida por la red. El modo `OSTEO3D_E2E_URL` verifica la integración en línea del despliegue; `verify-pages` comprueba la entrada HTML publicada con reintentos y timeout configurables. La garantía offline se obtiene sobre el artefacto local idéntico que después publica el workflow.

El workflow `.github/workflows/pages.yml` ejecuta además la instalación reproducible, la compilación Vite, la verificación de sintaxis, las pruebas smoke, las validaciones PWA y de modelos, la prueba E2E en Chrome y el despliegue a Pages. El estado actualizado se consulta en [GitHub Actions](https://github.com/JJ-Martinez-Garcia/ArchaeOsteo/actions), evitando fijar aquí un número de ejecución que quede obsoleto.

## Models 3D: estado y criterio de publicación

`public/models/manifest.json` contiene los cuatro perfiles requeridos (`adult_male`, `adult_female`, `infant` y `neonate`). El perfil `adult_male` está en estado `partial` y publica 179 de 192 elementos: el cráneo CC0 `skull.glb` y 178 adaptaciones Open3Dmodel bajo CC BY-SA 4.0. Los otros tres perfiles han pasado de `placeholder` a `partial`: incluyen 537 GLB propios didácticos (MIT), con formas y proporciones regionales diferenciadas. Los 13 registros sin malla de cada perfil son categorías agregadas/indeterminadas. Ninguno de los modelos propios está calibrado ni científicamente validado.

Para publicar un perfil se deben aportar archivos GLB independientes por `Bone_ID` y completar `public/models/SOURCES.md` y `public/models/sources.json` con autoría, institución, URL permanente, licencia, versión, fecha de consulta, modificaciones y recuento de assets. El validador comprueba la cabecera GLB, la correspondencia exacta del nodo `Bone_ID`, el manifiesto y el registro de fuentes.

No se debe cambiar `asset_status` a `partial` o `ready` ni redistribuir modelos externos hasta completar esa trazabilidad y verificar la cobertura anatómica del perfil.

## Flujo de incorporación posterior

1. Colocar los GLB en `public/models/<perfil>/<bone_id>.glb`.
2. Añadir la ficha de licencia y procedencia en `SOURCES.md` y el registro estructurado en `sources.json`.
3. Actualizar `asset_status`, `asset_count` y tamaño aproximado del perfil.
4. Ejecutar `node scripts/validate-model-assets.mjs`.
5. Ejecutar las validaciones PWA, compilar y publicar mediante el workflow de Pages.
