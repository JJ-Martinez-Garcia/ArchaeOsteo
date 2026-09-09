# Plan de cierre del encargo completo

Actualizado: 2026-09-09. Fuente: los 119 apartados del encargo original.

El objetivo sigue abierto. Esta lista no sustituye ni reduce el encargo. Una función existente
no se considera cerrada hasta verificar todo su alcance. Ningún checkbox global está marcado
por una prueba parcial; los avances con evidencia se registran en PROJECT_REVIEW.md.

## Prioridad de trabajo

1. Integridad de datos: porciones, bloqueos, historial, guardado y copias completas.
2. Anatomía y registro: cráneo/dientes/componentes inmaduros, calibración y fuentes.
3. Interoperabilidad: esquemas y round-trip con validación por campo.
4. Comparación, aprendizaje, informes, accesibilidad y rendimiento.

## Requisitos y pruebas que faltan para cerrarlos

| Nº | Requisito original | Trabajo o evidencia de cierre pendiente |
| --- | --- | --- |
| 1 | PERFILES OSTEOLOGICOS | Validar los cuatro perfiles; segmentar huesos craneales, dentición y centros de osificación sin confundir didáctica con espécimen. |
| 2 | MOTOR 3D | Verificar IDs y transformaciones de todas las piezas importadas; el motor Three.js y los GLB propios están operativos. |
| 3 | VISOR 3D | Completar pruebas de interacción ratón/táctil, cámara y ocultación en todas las disposiciones. |
| 4 | SELECCIÓN DE HUESOS | Probar selección y centrado coherentes en posición anatómica, desplegada, mesa y comparación. |
| 5 | ESQUELETO COMPLETO | Validar articulación y proporciones de los GLB externos; el esqueleto propio está ensamblado de forma esquemática. |
| 6 | ESQUELETO DESPLEGADO | Sustituir estantes compactos por disposición regional según el encargo; verificar transiciones sin colisiones. |
| 7 | ANIMACIÓN DE DESPLIEGUE | Posición y slerp implementados; validar rotación, escala y orientación de todos los assets externos. |
| 8 | SLIDER DE EXPLOSIÓN | Slider operativo; probar extremos, valores intermedios, teclado y convivencia con aislamiento. |
| 9 | MESA OSTEOLÓGICA | Completar agrupación/ordenación de mesa y restauración por selección con persistencia. |
| 10 | EXAMINAR HUESO | Vistas anatómicas locales medial/lateral/proximal/distal centradas en el elemento seleccionado; queda validación anatómica de orientación en cada familia de huesos. |
| 11 | PANEL INFORMATIVO | Curar las 12 categorías de la ficha por hueso con referencias; no sustituir huecos por inferencias. |
| 12 | ÁRBOL OSTEOLOGICO | Verificar árbol por anatomía completa y componentes inmaduros; catálogo actual agrupa cráneo. |
| 13 | BUSCADOR | Búsqueda normalizada ES/EN/latín/ID con sinónimos osteológicos frecuentes (escápula/omóplato, peroné/fíbula, rótula/patela, etc.); queda curación completa del tesauro. |
| 14 | COMPARACIÓN | Comparación hueso a hueso, vista/rotación/zoom sincronizados y escala real solo con calibración. |
| 15 | TRANSPARENCIA | Control 0–100% por hueso/región/conjunto, persistente y con X-Ray limitado independientemente; queda verificación visual de contraste en todas las escenas. |
| 16 | MODOS VISUALES | Cerrar pruebas combinadas de todos los modos y de representación de inventario. |
| 17 | ILUMINACIÓN | Intensidad, presets, ambiente independiente y dirección de luz mediante azimut/elevación persistentes; queda validación visual de la paleta en dispositivos y escenas complejas. |
| 18 | COLORES POR REGIÓN | Comprobar contraste, leyenda y paleta con simulación de deficiencia cromática. |
| 19 | ETIQUETAS | Evitar colisión de etiquetas y asociar líneas guía; actualiza dinámicamente en cámara y selección. |
| 20 | OSTEOMETRÍA | Calibración por dos landmarks y conversión a mm implementada con procedencia del usuario; falta validación/protocolo osteométrico externo y calibración global por modelo. |
| 21 | LANDMARKS | Captura/visualización relativa, captura directa sobre superficie, edición, calibración local y revisión segura al sustituir modelos implementadas; queda una migración automática, que no es segura sin correspondencia anatómica, y versionado de modelos externos. |
| 22 | MODO APRENDIZAJE | Preguntas por niveles y modos identificar/localizar; la ficha se oculta durante el ejercicio para no revelar la respuesta y se restaura al salir. Queda validación pedagógica del banco. |
| 23 | INVENTARIO ARQUEOLÓGICO | Completar modelo de datos para colecciones con múltiples individuos y contextos. |
| 24 | CREACIÓN DE FICHA | Verificar persistencia/ronda de todos los campos de contexto en cada formato. |
| 25 | ESTADOS DE LOS HUESOS | Estados definidos; cerrar pruebas de cada transición y sincronización entre vistas. |
| 26 | CONSERVACIÓN | Distinguir no evaluado/no evaluable y porcentaje no registrado; validar estados y medias. |
| 27 | FRAGMENTACIÓN | Completitud/fragmentación como campos explícitos, separados de presencia y porcentaje. El resumen regional distingue recuentos observados de valores desconocidos y no los convierte en cero. |
| 28 | HUESOS LARGOS | Varias porciones con estado y completitud independientes simultáneos; se conserva además el campo `Portion` antiguo para compatibilidad. |
| 29 | LATERALIDAD | Lateralidad indeterminada/no aplicable con validación de importación y corrección. |
| 30 | INVENTARIO DENTAL | Códigos canónicos y compatibilidad ES/EN implementados; ampliar ronda XLSX a todas las hojas/estados y asociación con dientes 3D. |
| 31 | VÉRTEBRAS | Vértebras individualizadas; añadir contexto anatómico/fusión y pruebas de selección. |
| 32 | COSTILLAS | Costillas individualizadas; validar orientación/lateralidad y selección de todas. |
| 33 | MANOS | Huesos de mano individualizados; corregir nombres latinos y verificar identificación. |
| 34 | PIES | Huesos de pie individualizados; corregir nombres latinos y verificar identificación. |
| 35 | INFANTES Y NEONATOS | Registro independiente de epífisis/centros/componentes con relaciones de fusión y estados observados por componente, persistencia, deshacer y XLSX importable; queda validación osteológica especializada y un catálogo de centros de osificación con edades de referencia. |
| 36 | REPRESENTACIÓN ESQUELÉTICA | Separar denominadores anatómicos de categorías agregadas y de elementos esperados por perfil. |
| 37 | MAPA DE CONSERVACIÓN | Mapa del propio 3D según presencia/conservación/porcentaje/alteraciones, con patrones además de colores. |
| 38 | NISP | Modelo de especímenes por ficha y NISP real; el automático actual cuenta registros agrupados. |
| 39 | MNE | Cálculo automático provisional y revisión manual con entero, justificación y firma del inventario filtrado; conserva límites sobre porciones/solapamiento y exige revisión especializada. |
| 40 | MNI | Cálculo automático provisional y revisión manual con entero, justificación y firma del inventario filtrado; no cuenta fragmentos como individuos y conserva los límites de asociación. |
| 41 | FRAGMENTOS INDETERMINADOS | Validar cantidades/medidas opcionales, deshacer eliminación y vincular fragmentos a contexto. |
| 42 | PESO | Selector g/kg por registro identificado y fragmento indeterminado, almacenamiento canónico en gramos, exportación/totales compatibles y pruebas de ausencia frente a peso cero. |
| 43 | TAFONOMÍA | Catálogo curado y anotaciones múltiples estructuradas por hueso con evidencia. |
| 44 | PATOLOGÍA Y TRAUMA | Anotación de trauma/patología en superficie 3D enlazada a ficha, sin diagnóstico automático. |
| 45 | FOTOGRAFÍAS | Límite por archivo de 12 MB y guardia acumulada de 64 MB antes de leer nuevas imágenes; queda verificar edición y recuperación de binarios en cuotas reales. |
| 46 | PINTAR INVENTARIO | Pruebas de pintura táctil en tablet/móvil y accesos rápidos, sin arrastrar la cámara accidentalmente. |
| 47 | BARRA DE PINTURA | Barra y estado persistente operativos; probar todos los estados con teclado/táctil. |
| 48 | FUNCIONAMIENTO DE PINTAR INVENTARIO | Secuencia de pintar varios huesos, deshacer y recargar como E2E de inventario completo; la selección múltiple y acciones masivas confirmadas ya tienen cobertura E2E. |
| 49 | ACTUALIZACIÓN AUTOMÁTICA | Eliminar desincronizaciones entre figura, ficha, tabla, estadísticas, guardado y análisis. |
| 50 | PINTAR POR REGIONES | Verificar cada grupo regional, no modificar categorías fuera del alcance y respetar bloqueos. |
| 51 | FILTRO DE LATERALIDAD | Probar filtros izquierda/derecha/ambos y su interacción con grupos anatómicos. |
| 52 | ELEMENTOS PEQUEÑOS | Centrado/zoom adaptado al tamaño real del elemento y disposición actual, no coordenadas originales. |
| 53 | PINTAR DENTICIÓN | E2E de pintura FDI con dentición permanente y decidua, persistencia y deshacer verificadas; queda ampliar estados y bloqueo en dispositivos reales. |
| 54 | PINTAR CONSERVACIÓN | E2E de conservación individual, regional y bloqueada. |
| 55 | PINTAR PORCENTAJE | Atajos 100/75/50/25/<25 y ausencia de porcentaje no observado. |
| 56 | PINTAR ALTERACIONES | E2E de alteraciones múltiples sin sobrescritura de detalles existentes. |
| 57 | BORRADOR | Borrado de asignación coherente con todos los campos y recuperación por deshacer. |
| 58 | DESHACER / REHACER | Importaciones, ficha científica, medidas, fotografías, altas/bajas de fragmentos indeterminados y cambios visuales principales usan snapshots comunes reversibles; la cámara 3D también forma parte del snapshot. Queda ampliar la auditoría a configuración restante y probar recuperación tras recarga en todos los dispositivos. |
| 59 | BLOQUEAR REGISTROS | Formulario científico, importación revalidada, tablas, medidas, landmarks, fotos y modelos personalizados cubiertos; queda auditar nuevas rutas futuras. |
| 60 | MOSTRAR PENDIENTES | Resaltar pendientes sin ocultar de forma incoherente categorías o etiquetas. |
| 61 | PROGRESO | Denominador correcto por perfil y categorías; progreso siempre revisados, no presentes. |
| 62 | INVENTARIO RÁPIDO | Confirmación obligatoria, deshacer completo y recuperación tras recarga verificados en E2E; queda prueba en dispositivos reales. |
| 63 | PRESENCIA RÁPIDA | Prueba de presencia rápida y persistencia, sin modos incompatibles activos. |
| 64 | FRAGMENTACIÓN RÁPIDA | Ciclo de activación/desactivación y no solapamiento con presencia rápida verificados en E2E; queda respeto a bloqueo en dispositivo táctil. |
| 65 | SELECCIÓN MÚLTIPLE | Aplicar acciones comunes a selección múltiple como una única transacción reversible verificado en E2E; queda cobertura de combinaciones con filtros regionales. |
| 66 | PINTAR EN CUALQUIER DISPOSICIÓN | Pruebas de pintura en cuatro disposiciones y en elementos pequeños. |
| 67 | CONFIRMACIÓN VISUAL | Resaltado transitorio sin sobreescribir selección permanente o apariencia científica. |
| 68 | LEYENDA | Leyenda persistente con texto/iconos/patrones también dentro del 3D. |
| 69 | REGISTRO DE CAMBIOS | Snapshots comunes registran también cambios de fotografías, fragmentos indeterminados, odontogramas, contexto, jerarquía, medidas, landmarks, calibraciones, preferencias visuales y cámara 3D; la auditoría permite filtrar y exportar CSV, pero queda configuración restante y una auditoría transaccional más completa. |
| 70 | NOTAS | CSV multilínea probado; verificar todos los ámbitos de notas y su ronda con formatos restantes. |
| 71 | TABLA DE INVENTARIO | Vacío frente a cero probado en tabla; resolver edición continua sin perder foco y ampliar sincronización a todas las vistas. |
| 72 | FILTROS | Verificar combinaciones de todos los filtros contra tabla, árbol, 3D y estadísticas. |
| 73 | ESTADÍSTICAS | Medias basadas solo en datos observados y denominadores explícitos en resumen, mapa regional y mapa de conservación; se verificó en E2E que un porcentaje desconocido no se cuenta como cero. Queda ampliar combinaciones y revisión visual. |
| 74 | INFORME AUTOMÁTICO | Informe con fuentes/métodos/límites, fotos elegidas, mapa esquelético esquemático y reglas de impresión A4 para evitar cortes; queda cartografía anatómica profesional y maquetación PDF avanzada. |
| 75 | EXPORTACIÓN | JSON conserva la copia completa, incluida la vista de cámara; CSV contiene el inventario tabular; XLSX incluye e importa inventario, contexto, jerarquía, odontogramas, fragmentos, osteometría, landmarks, calibraciones, referencias, revisión, cambios y metadatos de fotos/modelos. Falta verificar round-trip con casos reales y decidir un formato tabular para binarios. |
| 76 | CSV/XLSX | Esquema estable y códigos canónicos, comillas/saltos de línea, trazabilidad de fuentes/método/límites y hoja `Jerarquía` con IDs padre. La cobertura de hojas auxiliares y una hoja `Esquema` autodocumentada están implementadas; queda auditoría con casos reales. |
| 77 | JSON | Esquema versionado JSON completo, migraciones, saneamiento de cámara 3D y validación de campos desconocidos. |
| 78 | IMPORTACIÓN | Fusión explícita, filas atómicas, bloqueo revalidado y deshacer implementados; XLSX recupera las hojas auxiliares estructuradas y JSON restaura la copia integral. Queda validación con colecciones reales y binarios fuera de XLSX. |
| 79 | BASE DE DATOS LOCAL | Modelo de entidades explícitas en IndexedDB y migraciones sin pérdida; la migración formal a esquema de proyecto v3 incorpora el registro jerárquico normalizado además de los mapas de inventario y está probada con proyectos v2. Queda auditoría de cuotas y escenarios extremos de recuperación. |
| 80 | JERARQUÍA DE PROYECTOS | Entidades normalizadas de yacimiento/campaña/sector/contexto/individuo, IDs estables, relaciones padre, editor no destructivo, selector de entidades padre existentes y round-trip JSON/OSTEO3D/XLSX verificados. Queda una vista relacional completa para múltiples campañas y asociación de cada registro a entidades con selector, no solo derivación desde campos. |
| 81 | AUTOGUARDADO | Fallo dual y recuperación por proyecto verificados; ampliar pruebas a todos los formularios, navegación pendiente y límites/cuota con fotografías grandes. |
| 82 | COPIAS DE SEGURIDAD | Copia completa con fotografías y modelos personalizados binarios, checksum CRC y SHA-256 por entrada en manifiesto y restauración verificada. Sigue pendiente una auditoría de límites/cuota y escenarios extremos de recuperación. |
| 83 | COMPARAR INVENTARIOS | Comparación detallada de dos proyectos locales con identidad visible de individuo/contexto/UE/campaña, filtro por esos valores y porciones independientes por elemento; además, vista agregada para dos o más fuentes (incluido el proyecto activo) con recuento por estado, exportación CSV con columna y estado de cada fuente, y E2E de dos fuentes locales. Los valores desconocidos se muestran como `—` y los ceros observados se conservan. Queda sincronización avanzada de vistas y revisión científica. |
| 84 | BASE ANATÓMICA | Catálogo modular con tipos y nomenclatura curados; source de datos separado ya iniciado. |
| 85 | INTERNACIONALIZACIÓN | ES/EN y textos principales disponibles; el informe imprimible y la auditoría localizan títulos y etiquetas fijas sin tocar el texto científico del investigador. Quedan algunos controles/métodos incrustados, RTL y nuevos idiomas. |
| 86 | PWA Y OFFLINE | PWA/offline probados en Chromium; confirmar navegación y operaciones completas tras instalación. |
| 87 | DESCARGA DE MODELOS | Paquetes de los cuatro perfiles disponibles; descarga transaccional que revierte solo los recursos añadidos si falla, y eliminación separada de modelos personales; queda prueba en dispositivos reales. |
| 88 | OPTIMIZACIÓN 3D | Liberación de geometrías/materiales, carga concurrente limitada en móviles/poca memoria y diagnóstico visible de mallas/triángulos/origen. Quedan LOD, presupuestos formales y medición en móviles reales. |
| 89 | RENDIMIENTO | Matriz de PC/Mac/Android/iOS/iPad y métricas reproducibles en dispositivos reales. |
| 90 | INTERFAZ DE ESCRITORIO | Panel redimensionable y formularios probados en PC; diálogos accesibles y refrescos en segundo plano optimizados. Queda comprobar zoom 125–200% y todos los tamaños. |
| 91 | INTERFAZ MÓVIL | Flujo de paneles móviles disponible y controles principales con objetivos táctiles mínimos de 44 px; queda prueba en dispositivos reales y operación con una mano. |
| 92 | ACCESIBILIDAD | Foco visible global, navegación semántica/teclado y soporte de movimiento reducido incorporados; queda auditoría de contraste, lector de pantalla, zoom y tamaños táctiles con dispositivos reales. |
| 93 | ARQUITECTURA DEL PROYECTO | Extraer controlador 3D y módulos de UI de main.js de forma incremental. |
| 94 | MODULARIDAD | Eliminar temporizadores de inicialización y dependencias cruzadas de UI/persistencia. |
| 95 | LICENCIAS DE MODELOS 3D | 537 GLB propios y 179 externos documentados; las fuentes, autoría, licencia y advertencia didáctica están incorporadas. Sigue pendiente la auditoría especializada de cada licencia/fuente externa y validar anatómicamente los GLB procedurales antes de cualquier uso científico. |
| 96 | PRECISIÓN CIENTÍFICA | Revisión anatómica por especialista y referencias trazables antes de uso científico. |
| 97 | TRANSPARENCIA DE LOS CÁLCULOS | Métodos y revisiones visibles; rastrear cada inferencia hasta observaciones reales. |
| 98 | PRIVACIDAD | Auditar peticiones y garantizar que datos/fotos locales no se transmiten por ningún flujo implícito. |
| 99 | FUTURAS AMPLIACIONES | Diseñar extensiones versionadas; no presentar estimación, fotogrametría o morfometría como ya disponibles. |
| 100 | IMPORTACIÓN DE MODELOS PROPIOS — PREPARAR ARQUITECTURA | Probar formatos/archivos auxiliares, vinculación a espécimen/contexto y exportación de metadatos. |
| 101 | FASE 1 — MVP | Reejecutar matriz de aceptación del MVP, incluyendo fallo WebGL y recuperación local. |
| 102 | FASE 2 | Validar fase 2 según geometría, disposición regional y mesa, no solo presencia de botones. |
| 103 | FASE 3 | Completar morfología/registro inmaduro y comparación científica: los GLB didácticos no bastan. |
| 104 | FASE 4 | Cerrar inventario, jerarquía, import/export, historial y pruebas de conservación. |
| 105 | FASE 5 | Cerrar osteometría calibrada, landmarks, odontograma y métodos cuantitativos. |
| 106 | FASE 6 | Cerrar anotaciones, fotos, PDF y comparación por individuo. |
| 107 | FASE 7 | Cerrar importación/modelos propios, anotaciones y herramientas avanzadas; definir validación científica. |
| 108 | CONTROL DE ERRORES | Validar fallos de red, modelo corrupto, cuota, migración, importación y recuperación sin falso éxito; la descarga de paquetes ya revierte parciales sin borrar entradas previas. |
| 109 | DATOS Y VISUALIZACIÓN | Probar invariantes de inventario al cambiar modelos, posición, escala, colores y perfil. |
| 110 | GITHUB | Repositorio con fuentes, pruebas, documentación, guía de contribución y política de seguridad; mantener changelog y ambas guías actuales. |
| 111 | GITHUB PAGES | Despliegue Pages con pruebas y verificación de la versión publicada tras cada entrega. |
| 112 | INSTALACIÓN | Verificar instalación/standalone en navegadores y plataformas soportadas, no solo manifest. |
| 113 | ACTUALIZACIONES | La actualización aplaza la recarga si el guardado devuelve `ok: false`; queda probar la transición completa con un Service Worker esperando y formulario sucio en dispositivos reales. |
| 114 | DISEÑO | Revisión visual final de todas las pantallas y estados, no solo el visor inicial. |
| 115 | EXPERIENCIA DE USUARIO | E2E del flujo completo crear individuo → pintar → revisar → informe con pocos pasos. |
| 116 | PRINCIPIO DE NO DESTRUCCIÓN | Confirmación, deshacer y copia previa en todo reemplazo/eliminación masiva. |
| 117 | RESULTADO FINAL | Auditoría final de los 30 entregables usando pruebas directas, sin declarar acabado por etapas. |
| 118 | INSTRUCCIÓN DE DESARROLLO PARA CODEX | Seguir etapas verificadas, compatibilidad y modularidad; no degradar funciones terminadas. |
| 119 | PRINCIPIOS PRIORITARIOS | Validación final según prioridades: rigor, utilidad, precisión, calidad, datos y accesibilidad. |

## Mejoras adicionales propuestas

- Preferencias de interfaz separadas del inventario (separador ya implementado).
- Indicador de procedencia y calibración por modelo; historial de sustituciones.
- Copias con verificación de integridad y prueba de recuperación antes de reemplazar datos.
- Deshacer único para toda modificación; modo de revisión antes de aplicar acciones masivas.
- Presupuesto de memoria/triángulos y diagnóstico de fallos comprensible.
- Pruebas de accesibilidad y capturas de todas las pantallas en CI.
- Migraciones de catálogo que preserven datos aunque se subdivida un hueso agrupado.

## Criterio de finalización

Revisar cada fila contra código, datos, pruebas de comportamiento y, cuando corresponda,
validación anatómica/documental. Las verificaciones científicas no se sustituyen por tests
JavaScript. Mantener abierto lo no verificado y registrar las dependencias externas.
