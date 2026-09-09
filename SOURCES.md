# Fuentes y licencias

La aplicación redistribuye modelos anatómicos de terceros con licencia libre y atribución verificable. El perfil adulto masculino incluye 179 de 192 elementos: un cráneo de Vladimir Petkovic bajo CC0 1.0 Universal y 178 adaptaciones del esqueleto Open3Dmodel bajo CC BY-SA 4.0.

La arquitectura de assets está definida en `public/models/manifest.json` y `src/anatomy/catalog.js`. El registro detallado de autoría, URLs permanentes, versiones, modificaciones y licencias está en `public/models/SOURCES.md`. Los perfiles adulto femenino, infante y neonato incluyen ahora 179 GLB propios por perfil bajo MIT: son modelos didácticos originales, no escaneos ni anatomía validada. El catálogo conserva 13 categorías sin malla.

## Candidato en evaluación (no publicado)

**Z-Anatomy — Models of human anatomy** se mantiene como fuente candidata para el perfil adulto. Su repositorio declara licencia **CC BY-SA 4.0** y atribuye el material anatómico original a BodyParts3D; antes de usarlo habría que convertir y revisar los elementos en GLB independientes, comprobar la cobertura de `Bone_ID` y documentar la cadena de atribución y cualquier modificación.

Este candidato no se ha incorporado. No se utilizará para inventar perfiles femenino, infantil o neonatal mediante una simple reducción de escala.
