# Contribuir a Osteo3D

Gracias por contribuir a ArchaeOsteo/Osteo3D. El proyecto es software gratuito y se
publica bajo la licencia MIT; los créditos y licencias de cada modelo 3D deben
conservarse al añadir o sustituir assets.

## Antes de abrir un cambio

- Explica el problema o la mejora y el alcance de los datos afectados.
- No incluyas inventarios, fotografías de excavación ni datos personales reales.
- Para modelos 3D, añade procedencia, licencia, autoría, perfil de edad, escala si
  existe y límites de uso en `public/models/sources.json` y la documentación asociada.
- Mantén `CITATION.cff` si cambia la autoría del software, su versión o su URL de
  repositorio; no sustituyas los créditos de terceros por la licencia del código.
- Las afirmaciones anatómicas deben distinguirse de la geometría esquemática y contar
  con revisión especializada antes de presentarse como referencia científica.

## Verificación local

Ejecuta, como mínimo:

```text
pnpm test
pnpm validate-model-assets
pnpm validate-citation
pnpm validate-pwa
pnpm build
```

Los cambios de interacción deben incluir una prueba de dominio o E2E cuando sea
posible. No se deben desactivar pruebas para ocultar una limitación del navegador.

## Pull requests

Describe la conducta anterior y la nueva, los formatos afectados, las pruebas
ejecutadas y cualquier limitación que siga abierta. Mantén actualizado
`PROJECT_BACKLOG.md`, `PROJECT_REVIEW.md` y `CHANGELOG.md` cuando cambie el alcance.
