# Guardado e intercambio de datos

Revisión: 2026-09-09. Estas garantías se verifican con `tests/data-integrity.test.mjs`
y `tests/data-integrity.e2e.mjs`; no equivalen al cierre de todos los requisitos originales.

## Importar CSV / XLSX

- CSV separado por comas, con encabezados únicos y columna `Bone_ID` obligatoria.
  Admite BOM, CRLF/LF, comas, comillas duplicadas y notas con saltos de línea dentro
  de campos entrecomillados. Rechaza comillas mal cerradas o distinto número de campos.
- Política de fusión: columnas omitidas y celdas vacías conservan los valores existentes.
  No asignan cero, 100 %, presencia, porción ni conservación por defecto. Un cero explícito
  es un dato. Para borrar un valor, vaciarlo en el formulario o la tabla, no mediante CSV.
- Las filas con ID desconocido/duplicado, números no válidos, estados no válidos,
  detalles JSON malformados o registros bloqueados se rechazan por completo y se
  enumeran en la vista previa. No modifican tampoco el contexto a través de esa fila.
- Al confirmar se vuelven a comprobar los bloqueos y el proyecto abierto. Los cambios
  se calculan sobre el estado actual, no sobre una copia antigua de la previsualización.
- Deshacer / rehacer desde Inventario recupera la importación como una sola operación,
  incluidos pesos, porciones, notas, detalles, dentición y contexto. El historial de
  deshacer es de sesión y se reinicia al cambiar de proyecto o restaurar una copia.
- XLSX exporta códigos dentales canónicos en `Status` y etiquetas en `Status_Label`.
  El importador admite también las etiquetas ES/EN de archivos históricos y valida
  los FDI de cada dentición. Las hojas auxiliares de contexto y fragmentos se explican
  en la vista previa: sustituyen esos apartados si contienen datos.

## Guardado

- Cada solicitud captura una copia independiente y se escribe en orden; un guardado
  lento no puede escribir accidentalmente el objeto mutable de una solicitud posterior.
- IndexedDB es el almacén principal. Si falla, se intenta guardar el proyecto completo
  en localStorage bajo una clave distinta para cada proyecto. La recuperación escoge
  la copia más reciente del mismo ID; nunca utiliza otro proyecto como sustituto.
- La aplicación muestra `NO GUARDADO` si fallan ambos almacenes. Mantiene los datos
  en pantalla, impide cambiar de proyecto desde el selector y solicita una copia antes
  de cerrar. Descargar una copia JSON es la vía de recuperación inmediata.
- La copia fallback se retira después de un guardado correcto en IndexedDB. Los fallos,
  abortos, bloqueos y recuperaciones tienen pruebas automatizadas.
- Esto no garantiza permanencia frente a borrar los datos del navegador o perder el
  dispositivo. Mantener copias externas sigue siendo necesario.

## Límites que siguen abiertos

La copia JSON contiene los datos y fotografías del proyecto, pero no los archivos
binarios de modelos personalizados. No es todavía una copia integral de todos los assets.
No hay esquema validado de todas las entidades/campos auxiliares, migraciones completas,
historial transaccional de fotografías ni intercambio sin pérdida de todos los campos
en todos los formatos. CSV tampoco se certifica aún frente a evaluación de fórmulas por
programas de hoja de cálculo. El plan completo permanece en `PROJECT_BACKLOG.md`.
