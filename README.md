# Osteo3D

Base inicial de una PWA modular para atlas osteológico 3D e inventario bioarqueológico.

## Estado actual

Esta primera fase implementa un MVP ejecutable con:

- visor Three.js con elementos osteológicos independientes;
- selección por clic, árbol y búsqueda en español/inglés/latín/ID;
- ficha básica, aislamiento, centrado, vistas y control de explosión;
- selector de perfiles preparado para adulto masculino, adulto femenino, infante y neonato;
- persistencia local básica y service worker de shell;
- pestaña “Pintar inventario” con estados, pendientes y contador de revisión;
- tabla editable sincronizada, bloqueo de registros y aplicación por región;
- odontograma permanente FDI con estados dentales y persistencia local;
- módulo de osteometría con medidas en milímetros, landmarks relativos y resumen de cobertura;
- panel de estadísticas con representación, conservación media y filtros por estado, región y lateralidad;
- informe osteoarqueológico imprimible con identificación, inventario, dentición, mediciones y landmarks;
- exportación XLSX diferida con hojas de inventario y odontograma;
- fotografías locales asociadas al elemento seleccionado y almacenadas offline;
- Three.js cargado de forma diferida para reducir el bundle inicial;
- instalación y actualización de la PWA controladas por el usuario;
- catálogo de perfiles y loader preparado para assets GLB independientes;
- pruebas de humo automatizadas para manifest, offline, módulos y artefactos de build;
- interfaz responsive para escritorio y móvil.

Los elementos 3D actuales son marcadores geométricos de desarrollo. No representan modelos anatómicos aptos para medición o diagnóstico. Los modelos reales deberán incorporarse como GLB documentados en `SOURCES.md` y separados por perfil.

## Arquitectura prevista

La aplicación se organizará por dominios: `viewer`, `anatomy`, `inventory`, `osteometry`, `odontology`, `taphonomy`, `pathology`, `database`, `export`, `reports` e `i18n`. Los datos científicos deberán conservarse como registros independientes de la escena 3D, con IDs estables y transformaciones anatómica/desplegada separadas.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm test
```

## Fases siguientes

1. Sustituir marcadores por modelos GLB con metadatos y licencias.
2. Extraer el estado a módulos y añadir IndexedDB versionado.
3. Ampliar “Pintar inventario” con filtros avanzados, odontograma y conservación avanzada.
4. Añadir análisis osteoarqueológicos avanzados, modelos GLB documentados y pruebas end-to-end.

La especificación completa de producto está documentada en el requisito de proyecto entregado a Codex.
