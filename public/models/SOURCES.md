# Registro de fuentes y licencias de modelos

Este registro es obligatorio antes de publicar cualquier GLB en `public/models/`.

Por cada perfil y paquete se deben documentar:

- autor o autores;
- institución o repositorio de procedencia;
- URL permanente de la fuente;
- licencia exacta y sus condiciones de redistribución;
- versión o commit de origen;
- fecha de consulta (`YYYY-MM-DD`);
- modificaciones realizadas y herramientas utilizadas;
- número de assets incluidos y sus identificadores anatómicos.

El estado actual de los cuatro perfiles es `pending`: no se han incluido modelos de terceros y el visor utiliza primitivas geométricas de demostración. No cambiar `asset_status` a `partial` o `ready` hasta completar este registro y verificar cada archivo GLB.

### Candidato no publicado

Z-Anatomy (Models of human anatomy, [licencia declarada](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt)) es una posible fuente para estudiar el paquete adulto; su repositorio declara CC BY-SA 4.0 y requiere atribución de Z-Anatomy y del material BodyParts3D de origen. No se considera una fuente publicada para este proyecto: todavía falta verificar la conversión a GLB, la correspondencia de todos los `Bone_ID` y la existencia de modelos independientes para los cuatro perfiles. La licencia no autoriza a inferir que una reducción de escala constituya un modelo infantil o neonatal independiente.

### Candidatos revisados y no incorporados

El repositorio [Anatria-3D](https://github.com/Nurkan1/Anatria-3D) documenta dos atlas derivados de fuentes anatómicas distintas: masculino basado en Z-Anatomy y femenino basado en Human Reference Atlas. Su propio registro indica que el atlas femenino es un tronco y que no incluye cráneo, caja torácica ni extremidades; tampoco ofrece perfiles infantil o neonatal. Por tanto, no satisface el contrato de cuatro perfiles independientes de Osteo3D y no se incorpora como asset.

Consulta realizada: 2026-09-08. Esta revisión es documental; no se han descargado ni redistribuido archivos de ese repositorio.
