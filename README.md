# Osteo3D

Base inicial de una PWA modular para atlas osteológico 3D e inventario bioarqueológico.

## Estado actual

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
- interfaz responsive para escritorio y móvil.
- recuperación de errores de interfaz con aviso no destructivo y diagnóstico en consola;

Los elementos 3D actuales son marcadores geométricos de desarrollo, ahora organizados como piezas independientes para facilitar el inventario completo. No representan modelos anatómicos aptos para medición o diagnóstico. Los modelos reales deberán incorporarse como GLB documentados en `SOURCES.md` y separados por perfil. Mientras los assets públicos siguen pendientes, el investigador puede importar paquetes GLB por `Bone_ID` o asociar temporalmente un modelo propio GLB, GLTF, OBJ o STL al hueso seleccionado. Estos modelos quedan en la sesión del navegador y no se publican en el repositorio.

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
```

## Fases siguientes

1. Sustituir marcadores por modelos GLB con metadatos y licencias.
2. Separar completamente inventario, informes y configuración en stores especializados.
3. Añadir porciones específicas por anatomía y controles de cuantificación por individuo.
4. Incorporar modelos GLB documentados por perfil y pruebas end-to-end en navegador.

La especificación completa de producto está documentada en el requisito de proyecto entregado a Codex.
