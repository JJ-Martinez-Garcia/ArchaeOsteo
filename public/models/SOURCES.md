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

El perfil adulto masculino tiene cobertura `partial`: incluye un cráneo GLB CC0 verificado. Los perfiles adulto femenino, infante y neonato siguen en `placeholder`; el visor utiliza primitivas geométricas de demostración para los huesos sin asset publicado. `partial` no implica cobertura anatómica completa ni aptitud automática para medición.

### Publicado: ScatteringSkull (perfil adulto masculino)

- autor: Vladimir Petkovic;
- institución/repositorio: Khronos Group, glTF Sample Assets;
- URL permanente: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ScatteringSkull;
- licencia: CC0 1.0 Universal, según `LICENSE.md` del asset;
- versión: rama `main`, directorio `Models/ScatteringSkull`;
- fecha de consulta: `2026-09-08`;
- asset incluido: `public/models/adult_male/skull.glb` (`Bone_ID`: `skull`);
- modificación: se añadió el nombre de nodo glTF exacto `skull` al primer nodo para enlazar el asset con el catálogo. No se modificaron geometría ni materiales.

La aplicación se distribuye gratuitamente. La licencia CC0 permite la redistribución; se conserva esta atribución por trazabilidad y reconocimiento del autor.

### Candidato no publicado

Z-Anatomy (Models of human anatomy, [licencia declarada](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt)) es una posible fuente para estudiar el paquete adulto; su repositorio declara CC BY-SA 4.0 y requiere atribución de Z-Anatomy y del material BodyParts3D de origen. No se considera una fuente publicada para este proyecto: todavía falta verificar la conversión a GLB, la correspondencia de todos los `Bone_ID` y la existencia de modelos independientes para los cuatro perfiles. La licencia no autoriza a inferir que una reducción de escala constituya un modelo infantil o neonatal independiente.

### Candidatos revisados y no incorporados

El repositorio [Anatria-3D](https://github.com/Nurkan1/Anatria-3D) documenta dos atlas derivados de fuentes anatómicas distintas: masculino basado en Z-Anatomy y femenino basado en Human Reference Atlas. Su propio registro indica que el atlas femenino es un tronco y que no incluye cráneo, caja torácica ni extremidades; tampoco ofrece perfiles infantil o neonatal. Por tanto, no satisface el contrato de cuatro perfiles independientes de Osteo3D y no se incorpora como asset.

Consulta realizada: 2026-09-08. Esta revisión es documental; no se han descargado ni redistribuido archivos de ese repositorio.
