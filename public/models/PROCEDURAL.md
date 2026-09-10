# Geometría propia de Osteo3D · 1.2.0

Autoría: Osteo3D contributors, 2026. Licencia MIT (véase LICENSE del repositorio).
Código fuente: `src/anatomy/procedural.js`. Fecha: 2026-09-10.

Los 179 identificadores anatómicos del catálogo tienen una representación
tridimensional generada en el navegador, disponible también sin conexión.
Además, femenino, infante y neonato se distribuyen como 537 archivos GLB
independientes en sus carpetas de perfil, con metadatos y licencia incluidos.
No se trata de tres escaneos: son modelos propios de reconstrucción didáctica.
Los otros 13 registros son categorías agregadas o indeterminadas, no huesos
adicionales. Se conservan sus datos, pero no se dibujan como piezas duplicadas.
El número 179 NO equivale a un inventario de los 206 huesos del adulto:
por ejemplo, el cráneo y el esternón continúan agrupados.

## Método

Curvas tubulares para costillas, clavículas y mandíbula; superficies de revolución
para diáfisis; arcos vertebrales con espacio central; placas extruidas para escápula
e ilion; arcos pélvicos con abertura; bóveda craneal segmentada y rebordes orbitarios;
volúmenes irregulares deterministas para carpo y tarso. Los extremos articulares
están simplificados. Cada componente tiene nombre y metadatos estables.

Hay cuatro conjuntos de parámetros: adulto masculino, adulto femenino, infante y
neonato. Tronco, cabeza, miembros y cinturas tienen factores independientes. La
versión 1.2.0 aumenta la resolución de las superficies, afina el perfil de las
diáfisis y separa mejor las placas epifisarias. En inmaduros añade fontanelas y
suturas esquemáticas en el cráneo, placas de crecimiento y marcadores ocres de
centros de osificación ilustrativos. No se asigna una edad concreta ni un calendario
de aparición/fusión: esos marcadores no representan centros verificados. Las formas
infantiles no son simples reducciones uniformes del adulto; el perfil femenino
incorpora además proporciones pélvicas y escapulares diferenciadas. Ninguna de estas
diferencias es un criterio diagnóstico de sexo o edad.

El modo GLB conserva los recursos licenciados previamente incorporados, ajustados
a envolventes esquemáticas de visualización. No se garantiza que sus orientaciones,
proporciones relativas o articulaciones reproduzcan las del espécimen fuente.
Para una disposición homogénea está disponible el modo esquemático completo.

## Límites y referencias

No se copiaron ilustraciones ni mallas de las referencias siguientes; se consultaron
como contexto conceptual. No se han realizado validación por especialista,
comparación contra TAC, calibración métrica ni pruebas de diagnóstico.

- OpenStax, Betts et al., *Anatomy and Physiology*, 7.5: desarrollo axial,
  separación de la bóveda y desarrollo mandibular.
  https://openstax.org/books/anatomy-and-physiology/pages/7-5-embryonic-development-of-the-axial-skeleton
- OpenStax, Betts et al., *Anatomy and Physiology*, 6.4: formación ósea y cartílago.
  https://openstax.org/books/anatomy-and-physiology/pages/6-4-bone-formation-and-development

Consulta: 2026-09-09. Acceso al libro:
https://openstax.org/books/anatomy-and-physiology/pages/1-introduction

No utilizar estos modelos para medición clínica, estimación de edad/sexo ni
diagnóstico. Las coordenadas son unidades arbitrarias, no milímetros.
Las medidas manuales del inventario son independientes de la geometría del visor.
Faltan dientes 3D, centros de osificación individualizados y segmentación completa
del cráneo. Las placas, suturas y centros ocres son recursos de explicación visual,
no sustituyen mallas derivadas de TAC, atlas o especímenes medidos. Las fichas sin
fuentes verificadas siguen mostrando información no disponible.

## Exportación y redistribución

El botón «Exportar hueso esquemático GLB» genera el elemento seleccionado con
componentes, perfil, versión, autoría, licencia y advertencia en los metadatos.
El GLB propio no incluye ni modifica las mallas Open3Dmodel/Khronos.
Distribuir también el aviso MIT de LICENSE. Los créditos de los modelos externos
siguen en SOURCES.md y sources.json, con sus respectivas licencias.
