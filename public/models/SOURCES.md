# Registro de fuentes y licencias de modelos

Cada perfil publicado incluye en `sources.json` la URL de origen y una `license_url`
directa a los términos de la licencia; ambas se validan como enlaces HTTPS. Cuando un
paquete combina licencias, `license_urls` enumera todas las URL legales aplicables.

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

Los cuatro perfiles tienen cobertura `partial`: 179 GLB por perfil y 13 categorías de inventario sin malla. El adulto masculino conserva los recursos externos descritos abajo. Los otros tres perfiles incluyen modelos propios didácticos, no escaneos. `partial` no implica cobertura anatómica completa ni aptitud para medición.

### Publicados: tres paquetes propios (femenino, infante, neonato)

- Autoría: Osteo3D contributors, 2026; proyecto ArchaeOsteo.
- Licencia: MIT, aviso completo incluido en cada GLB y en LICENSE del repositorio.
- Fuente y generador: https://github.com/JJ-Martinez-Garcia/ArchaeOsteo/blob/main/src/anatomy/procedural.js
- Versión: procedural-1.2.0; fecha: 2026-09-10.
- 179 archivos por perfil (537 nuevos). Generación: `pnpm generate-profile-models`.
- Geometría matemática original, proporciones regionales independientes, formas craneales y pélvicas diferenciadas, diáfisis curvadas, extremos y relieves de huesos largos, componentes separados en inmaduros.
- No se copiaron mallas del adulto masculino. Las superficies azules son envolventes cartilaginosas didácticas y las piezas ocres son marcadores ilustrativos de centros de osificación; ninguno está certificado. No se asigna una edad exacta.
- Metadatos: ID, nombres ES/EN/latín del catálogo, lado, región, perfil, versión, autoría, licencia y advertencia de escala arbitraria. La nomenclatura del catálogo sigue pendiente de curación especializada.
- Límites y referencias: [PROCEDURAL.md](PROCEDURAL.md). Se requiere validación especializada antes de uso científico.

### Publicado: ScatteringSkull (perfil adulto masculino)

- autor: Vladimir Petkovic;
- institución/repositorio: Khronos Group, glTF Sample Assets;
- URL permanente: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/9429648735279342b4c32b8745f7904196607379/Models/ScatteringSkull;
- licencia: CC0 1.0 Universal, según `LICENSE.md` del asset;
- versión: commit `9429648735279342b4c32b8745f7904196607379`, directorio `Models/ScatteringSkull`;
- fecha de consulta: `2026-09-08`;
- asset incluido: `public/models/adult_male/skull.glb` (`Bone_ID`: `skull`);
- modificación: se añadió el nombre de nodo glTF exacto `skull` al primer nodo para enlazar el asset con el catálogo. No se modificaron geometría ni materiales.

La aplicación se distribuye gratuitamente. La licencia CC0 permite la redistribución; se conserva esta atribución por trazabilidad y reconocimiento del autor.

### Publicado: esqueleto Open3Dmodel (perfil adulto masculino)

- autoría: Open3Dmodel contributors / Open Anatomy lineage;
- institución/proyecto: Open3Dmodel / AnatomyTOOL; preparación web del GLB por `yamz8`;
- URL permanente del archivo usado: https://github.com/yamz8/human-body-simulator/blob/e6570d72bc74f044439798e8503d02e91b87b1ea/public/models/overview-skeleton.glb;
- licencia del modelo y de estas adaptaciones: Creative Commons Attribution-ShareAlike 4.0 International;
- texto legal distribuido: `public/licenses/CC-BY-SA-4.0.txt`;
- versión: commit `e6570d72bc74f044439798e8503d02e91b87b1ea`;
- SHA-256 del GLB fuente: `253c47077e4ae11421c8ff3eae68c9414335ee2f0ad911eddf8ea0ea7dc0a6ce`;
- fecha de consulta: `2026-09-08`;
- assets incluidos: 178 GLB de `public/models/adult_male/`, correspondientes a todos los assets publicados salvo `skull.glb`;
- modificaciones: las mallas se separaron en un GLB por `Bone_ID`; se retiraron referencias a mapas normales; los huesos pares izquierdos se generaron mediante espejo de los nodos derechos; se añadieron nodos raíz con el `Bone_ID` exacto. Los bloques de geometría Draco no se descomprimieron ni remodelaron.

Las adaptaciones Open3Dmodel se redistribuyen bajo CC BY-SA 4.0. Quien redistribuya o modifique esos GLB debe conservar la atribución, indicar los cambios y mantener la misma licencia para las adaptaciones. El código de la aplicación continúa bajo MIT como obra separada.

No se generaron modelos para las 13 entradas agregadas o indeterminadas del catálogo, porque asociarles una anatomía concreta falsearía su significado. Tampoco se reutiliza esta anatomía adulta para los perfiles femenino, infantil o neonatal.

El archivo fuente es un esqueleto humano adulto de referencia y no aporta por sí solo una validación métrica de sexo, edad o población. Su ubicación en `adult_male` mantiene el contrato actual del visor, pero no debe emplearse para estimar dimorfismo sexual, edad, diagnóstico ni medidas osteométricas sin una validación científica independiente.

### Candidato no publicado

Z-Anatomy (Models of human anatomy, [licencia declarada](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt)) es una posible fuente para estudiar el paquete adulto; su repositorio declara CC BY-SA 4.0 y requiere atribución de Z-Anatomy y del material BodyParts3D de origen. No se considera una fuente publicada para este proyecto: todavía falta verificar la conversión a GLB, la correspondencia de todos los `Bone_ID` y la existencia de modelos independientes para los cuatro perfiles. La licencia no autoriza a inferir que una reducción de escala constituya un modelo infantil o neonatal independiente.

### Candidatos revisados y no incorporados

El repositorio [Anatria-3D](https://github.com/Nurkan1/Anatria-3D) documenta dos atlas derivados de fuentes anatómicas distintas: masculino basado en Z-Anatomy y femenino basado en Human Reference Atlas. Su propio registro indica que el atlas femenino es un tronco y que no incluye cráneo, caja torácica ni extremidades; tampoco ofrece perfiles infantil o neonatal. Por tanto, no satisface el contrato de cuatro perfiles independientes de Osteo3D y no se incorpora como asset.

Consulta realizada: 2026-09-08. Esta revisión es documental; no se han descargado ni redistribuido archivos de ese repositorio.
