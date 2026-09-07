# Fuentes y licencias

No se han redistribuido modelos anatómicos de terceros en esta fase. Las geometrías incluidas son primitivas de interfaz y no deben interpretarse como modelos científicos.

La arquitectura de assets está definida en `public/models/manifest.json` y `src/anatomy/catalog.js`. Las rutas por perfil permanecen en modo `placeholder` hasta disponer de modelos con licencia verificable.

Antes de incorporar modelos reales, registrar para cada asset: autor, institución, URL, licencia, versión, modificaciones y fecha de consulta.

## Candidato en evaluación (no publicado)

**Z-Anatomy — Models of human anatomy** se mantiene como fuente candidata para el perfil adulto. Su repositorio declara licencia **CC BY-SA 4.0** y atribuye el material anatómico original a BodyParts3D; antes de usarlo habría que convertir y revisar los elementos en GLB independientes, comprobar la cobertura de `Bone_ID` y documentar la cadena de atribución y cualquier modificación.

Este candidato no se ha incorporado al repositorio ni a la caché de la aplicación. Los cuatro perfiles continúan correctamente en estado `placeholder` hasta disponer de paquetes independientes y verificables para masculino, femenino, infante y neonato.
