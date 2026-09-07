# Changelog

## 0.1.0

- Primer MVP PWA.
- Visor Three.js con huesos independientes de demostración.
- Búsqueda, ficha, selección, vistas, aislamiento y explosión.
- Service worker y persistencia local básica.

## 0.2.0

- Inventario pintable con conservación y porcentaje conservado.
- Historial de deshacer/rehacer durante la sesión.
- Exportación de inventario a JSON y CSV.
- Rutas relativas para despliegue bajo GitHub Pages.
- Tabla editable sincronizada, bloqueo de registros y aplicación de estados por región.
- Odontograma permanente FDI con presencia, ausencias AM/PM, desarrollo, caries y desgaste.
- Osteometría manual en milímetros y landmarks con coordenadas relativas al elemento.
- Panel de estadísticas y filtros conectados al visor 3D.
- Informe imprimible con salida preparada para PDF mediante el navegador.
- Exportación XLSX diferida con hojas de inventario y odontograma.
- Fotografías locales por elemento con almacenamiento offline.
- Three.js separado del bundle inicial mediante carga diferida.
- Instalación y actualización controlada de la PWA mediante manifest y service worker.
- Catálogo de perfiles, manifest de assets y loader GLB preparado sin redistribuir modelos no licenciados.
- Pruebas de humo automatizadas para la base PWA y sus módulos principales.
# 0.2.0 - 2026-09-07

- Añadido registro científico modular para fragmentos, porciones, tafonomía, patología y notas.
- Añadidas copias de seguridad e importación validada JSON/CSV/XLSX.
- Añadidos cálculos transparentes de NISP, MNE y MNI.
- Añadidos comparación de perfiles y modo aprendizaje.
- Actualizada la caché del service worker.

## 0.3.0 - 2026-09-07

- Ampliado el catálogo de marcadores independientes con vértebras, costillas, cintura, extremidades, manos y pies.
- Añadidos colores y protección de renderizado para las nuevas regiones anatómicas.
- Añadida prueba de humo para comprobar la presencia y el tamaño mínimo del catálogo ampliado.

## 0.4.0 - 2026-09-07

- Versionado IndexedDB a esquema 2 con migración segura de proyectos existentes.
- Añadida normalización de proyectos y recuperación automática desde `localStorage` cuando IndexedDB no está disponible.
- Añadido autosalvado periódico y al ocultar la aplicación.
- Añadido indicador visible de conectividad offline/online y metadatos PWA ampliados.
