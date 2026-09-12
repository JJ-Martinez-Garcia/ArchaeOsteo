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

Los cuatro perfiles tienen cobertura `partial`: 179 GLB por perfil y 13 categorías de inventario sin malla. El adulto masculino conserva los recursos externos descritos abajo. Femenino, infante y neonato son adaptaciones visuales exportadas con Blender desde esos GLB. `partial` no implica cobertura anatómica completa ni aptitud para medición.

### Publicado: adaptación visual del adulto femenino

- Fuente base: los 179 GLB del perfil adulto masculino, documentados en este registro.
- Licencia: CC BY-SA 4.0; la adaptación conserva las obligaciones de atribución y compartir-igual.
- Generador: `scripts/blender-adapt-female-models.py`, ejecutado con Blender 5.2; versión `blender-adaptation-1.0.0`; fecha: 2026-09-11.
- Modificación: mallas masculinas conservadas y transformadas con escalas proporcionales controladas por hueso para una presentación visual de perfil femenino. No es un espécimen femenino, escaneo, estimador de sexo ni modelo morfométrico validado.
- 179 archivos GLB derivados, con metadatos `adapted_from: adult_male` y advertencia de uso didáctico.

### Publicados: adaptaciones Blender de infante y neonato

- Autoría: Osteo3D contributors, 2026; proyecto ArchaeOsteo.
- Licencia: CC BY-SA 4.0, heredada de los GLB adultos de origen.
- Fuente y generador: https://github.com/JJ-Martinez-Garcia/ArchaeOsteo/blob/main/scripts/blender-adapt-female-models.py
- Versión: blender-adaptation-1.0.0; fecha: 2026-09-11.
- 179 archivos por perfil (358 nuevos). Generación: script de Blender en modo background.
- Se reutilizan las mallas adultas masculinas y se aplican escalas visuales controladas: 0,78 global para infante y 0,62 para neonato, con proporción craneal/mandibular relativa ampliada. No son especímenes pediátricos ni modelos de crecimiento validados.
- No se asigna una edad exacta; los registros de componentes y rangos de osificación son observacionales/orientativos.
- Metadatos: ID, nombres ES/EN/latín del catálogo, lado, región, perfil, versión, autoría, licencia y advertencia de escala arbitraria. La nomenclatura del catálogo sigue pendiente de curación especializada.
- Límites y referencias: [PROCEDURAL.md](PROCEDURAL.md). Se requiere validación especializada antes de uso científico.

### Referencias orientativas de osificación

Los rangos que aparecen en la ficha de infante/neonato proceden de estudios
radiográficos y se muestran únicamente como contexto didáctico. No son una tabla
universal ni un estimador automático de edad:

- Codo pediátrico (capitulum, cabeza radial, epicóndilos, tróclea y olécranon):
  [PMC5782864](https://pmc.ncbi.nlm.nih.gov/articles/PMC5782864/).
- Mano y muñeca pediátricas (grande, ganchoso y pisiforme):
  [PMC4266871](https://pmc.ncbi.nlm.nih.gov/articles/PMC4266871/).

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

No se generaron modelos para las 13 entradas agregadas o indeterminadas del catálogo, porque asociarles una anatomía concreta falsearía su significado. Los perfiles femenino, infantil y neonatal reutilizan visualmente las mallas adultas mediante adaptaciones de escala documentadas; esto no los convierte en especímenes femeninos o pediátricos ni en modelos anatómicos validados.

El archivo fuente es un esqueleto humano adulto de referencia y no aporta por sí solo una validación métrica de sexo, edad o población. Su ubicación en `adult_male` mantiene el contrato actual del visor, pero no debe emplearse para estimar dimorfismo sexual, edad, diagnóstico ni medidas osteométricas sin una validación científica independiente.

### Candidato no publicado

Z-Anatomy (Models of human anatomy, [licencia declarada](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt)) es una posible fuente para estudiar el paquete adulto; su repositorio declara CC BY-SA 4.0 y requiere atribución de Z-Anatomy y del material BodyParts3D de origen. No se considera una fuente publicada para este proyecto: todavía falta verificar la conversión a GLB, la correspondencia de todos los `Bone_ID` y la existencia de modelos independientes para los cuatro perfiles. La licencia no autoriza a inferir que una reducción de escala constituya un modelo infantil o neonatal independiente.

### Candidatos revisados y no incorporados

El repositorio [Anatria-3D](https://github.com/Nurkan1/Anatria-3D) documenta dos atlas derivados de fuentes anatómicas distintas: masculino basado en Z-Anatomy y femenino basado en Human Reference Atlas. Su propio registro indica que el atlas femenino es un tronco y que no incluye cráneo, caja torácica ni extremidades; tampoco ofrece perfiles infantil o neonatal. Por tanto, no satisface el contrato de cuatro perfiles independientes de Osteo3D y no se incorpora como asset.

Consulta realizada: 2026-09-08. Esta revisión es documental; no se han descargado ni redistribuido archivos de ese repositorio.
