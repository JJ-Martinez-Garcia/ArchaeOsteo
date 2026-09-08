# Estado de Osteo3D PWA

Fecha de revisión: 2026-09-08

## Estado operativo verificado

- Aplicación publicada en GitHub Pages: https://jj-martinez-garcia.github.io/ArchaeOsteo/
- Repositorio y rama de publicación: `JJ-Martinez-Garcia/ArchaeOsteo`, `main`.
- Manifiesto PWA con `standalone`, iconos PNG de 192 y 512 px, accesos directos a inventario e informe y rutas relativas compatibles con GitHub Pages.
- Service Worker con precarga del shell, caché de recursos generados por Vite, recuperación offline y actualización controlada mediante `SKIP_WAITING`. El nombre de caché se calcula por versión y fingerprint de assets en cada build.
- Datos de proyectos, inventario, informes, fotografías y modelos importados guardados localmente con IndexedDB y respaldo localStorage.
- Visor Three.js/WebGL con controles de cámara, selección, aislamiento, transparencia, rayos X, wireframe, colores regionales, explosión y modo de mesa.
- Interfaz en español e inglés, incluida la localización de controles y avisos después de la interacción.

## Comprobaciones reproducibles

Desde la raíz del repositorio:

```text
node tests/smoke.test.mjs
node scripts/check-js-syntax.mjs
node scripts/validate-pwa.mjs
node scripts/validate-model-assets.mjs
git diff --check
```

El workflow `.github/workflows/pages.yml` ejecuta además la instalación reproducible, la compilación Vite, la verificación de sintaxis, las pruebas smoke, las validaciones PWA y de modelos, y el despliegue a Pages. La ejecución verde más reciente corresponde al commit `6a1e95a` (run `34218230456`).

## Models 3D: estado y criterio de publicación

`public/models/manifest.json` contiene los cuatro perfiles requeridos (`adult_male`, `adult_female`, `infant` y `neonate`). El perfil `adult_male` está en estado `partial` y publica 179 de 192 elementos: el cráneo CC0 `skull.glb` y 178 adaptaciones Open3Dmodel bajo CC BY-SA 4.0. Los otros tres perfiles permanecen en `placeholder`. El visor usa marcadores geométricos independientes para los huesos sin asset publicado, sin presentarlos como evidencia anatómica.

Para publicar un perfil se deben aportar archivos GLB independientes por `Bone_ID` y completar `public/models/SOURCES.md` y `public/models/sources.json` con autoría, institución, URL permanente, licencia, versión, fecha de consulta, modificaciones y recuento de assets. El validador comprueba la cabecera GLB, la correspondencia exacta del nodo `Bone_ID`, el manifiesto y el registro de fuentes.

No se debe cambiar `asset_status` a `partial` o `ready` ni redistribuir modelos externos hasta completar esa trazabilidad y verificar la cobertura anatómica del perfil.

## Flujo de incorporación posterior

1. Colocar los GLB en `public/models/<perfil>/<bone_id>.glb`.
2. Añadir la ficha de licencia y procedencia en `SOURCES.md` y el registro estructurado en `sources.json`.
3. Actualizar `asset_status`, `asset_count` y tamaño aproximado del perfil.
4. Ejecutar `node scripts/validate-model-assets.mjs`.
5. Ejecutar las validaciones PWA, compilar y publicar mediante el workflow de Pages.
