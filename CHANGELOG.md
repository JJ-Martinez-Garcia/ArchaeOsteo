# Changelog

## 0.9.0

- Añadida mesa osteológica reversible en el visor 3D.
- Añadido historial auditable para acciones masivas y deshacer/rehacer del inventario.
- Ampliadas las etiquetas de interfaz en español e inglés.
- Persistido el registro de cambios en IndexedDB, fallback local, copias y exportación JSON.

## 0.7.0

- Registro científico de individuo por elemento y exportaciones con el identificador conservado.
- Porciones anatómicas dependientes del tipo de elemento, incluyendo epífisis y diáfisis de huesos largos.
- Resumen transparente de cuantificación por individuo junto a NISP, MNE y MNI.

## 0.8.0

- Añadido selector y creación de proyectos locales persistidos de forma independiente en IndexedDB.
- Conservado el inventario activo al cambiar de proyecto y reiniciado el formulario al crear uno nuevo.
- Añadida validación automatizada del manifiesto de paquetes GLB y resumen de cobertura por perfil.
- Añadida cámara orbital funcional con rotación, zoom, desplazamiento y centrado del hueso seleccionado.
- El service worker precarga los chunks JS/CSS declarados por `index.html` para permitir arranque offline tras la primera visita.

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

## 0.5.0 - 2026-09-07

- Añadidos filtros de tafonomía y patología/trauma en estadísticas.
- Aplicados los filtros científicos al visor 3D para aislar los elementos con o sin registro.
- Añadidas las regiones Manos y Pies a la aplicación masiva de estados y al filtrado regional.
- Persistidos los filtros activos dentro del proyecto local.

## 0.6.0 - 2026-09-07

- Añadido odontograma deciduo FDI de 20 piezas separado del permanente.
- Añadidas hojas XLSX independientes para dentición permanente y decidua.
- Ampliada la tabla de inventario con fragmentos, porción, tafonomía y patología.
- Persistido el tipo de dentición activo y sus estados en copias y proyectos locales.
