# Changelog

## [Unreleased] · 2026-09-11

### Añadido

- Perfiles 3D adulto femenino, infante y neonato, con procedencia y límites visibles.
- Inventario científico con jerarquía normalizada, porciones, odontogramas,
  desarrollo inmaduro, tafonomía, patología/trauma, fotografías y exportaciones.
- Informe imprimible A4 con mapa esquelético vectorial, contexto, observaciones y
  hojas auxiliares XLSX.
- Comparación de inventarios incluyendo el proyecto activo y controles de almacenamiento.

### Mejorado

- Interfaz móvil con objetivos táctiles de 44 px y controles de iluminación sin
  superposición sobre el visor.
- Carga GLB limitada a 2–4 decodificadores y cesión del hilo tras cada modelo.
- Actualizaciones PWA protegidas frente a formularios del informe sin guardar.
- Diagnósticos E2E por fases y timeouts CDP para informar bloqueos del navegador.

### Limitaciones

- Las mallas adaptadas y generadas son didácticas: requieren revisión anatómica
  especializada antes de cualquier uso científico.
- La validación en móviles físicos, colecciones reales y la publicación en Pages
  dependen del entorno externo y de la ejecución de GitHub Actions.
