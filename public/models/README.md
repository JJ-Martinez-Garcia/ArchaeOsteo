# Modelos anatómicos

Esta carpeta está preparada para paquetes GLB independientes por perfil:

```text
models/
  adult_male/left_femur.glb
  adult_female/left_femur.glb
  infant/left_femur.glb
  neonate/left_femur.glb
```

Cada asset debe contar con una entrada en `SOURCES.md` con autor, institución, URL, licencia, versión, modificaciones y fecha de consulta. Actualmente el perfil `adult_male` incluye 179 de 192 elementos: un cráneo CC0 y 178 adaptaciones Open3Dmodel bajo CC BY-SA 4.0. Los 13 elementos agregados o indeterminados no tienen malla independiente. Los perfiles femenino, infantil y neonatal incluyen 179 GLB procedurales propios por perfil, distribuidos bajo MIT, pero son reconstrucciones didácticas esquemáticas sin escala métrica ni validación anatómica; no deben usarse para diagnóstico, estimación de edad/sexo ni morfometría.
