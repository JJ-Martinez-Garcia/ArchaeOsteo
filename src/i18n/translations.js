export const translations = {
  es: { language: 'Idioma', selected: 'SELECCIONADO', saved: 'Guardado localmente', ready: 'Listo', save: 'Guardar localmente', backup: 'Copia', share: 'Compartir', import: 'Importar', compare: 'Comparar perfiles', learning: 'Aprendizaje', sheet: 'Ficha', inventory: 'Inventario', dental: 'Odontograma', metrics: 'Medición', stats: 'Estadísticas', report: 'Informe', reset: 'Restablecer', isolate: 'Aislar hueso', center: 'Centrar cámara', previous: 'Anterior', next: 'Posterior', left: 'Izquierda', right: 'Derecha', scientificRecord: 'Registro científico', analysis: 'NISP · MNE · MNI', changes: 'Registro de cambios', sources: 'Fuentes y licencias', indeterminateFragments: 'Fragmentos indeterminados' },
  en: { language: 'Language', selected: 'SELECTED', saved: 'Saved locally', ready: 'Ready', save: 'Save locally', backup: 'Backup', share: 'Share', import: 'Import', compare: 'Compare profiles', learning: 'Learning', sheet: 'Sheet', inventory: 'Inventory', dental: 'Odontogram', metrics: 'Measurements', stats: 'Statistics', report: 'Report', reset: 'Reset', isolate: 'Isolate bone', center: 'Center camera', previous: 'Anterior', next: 'Posterior', left: 'Left', right: 'Right', scientificRecord: 'Scientific record', analysis: 'NISP · MNE · MNI', changes: 'Change log', sources: 'Sources and licenses', indeterminateFragments: 'Indeterminate fragments' }
};

export function translate(language, key) {
  return translations[language]?.[key] || translations.es[key] || key;
}
