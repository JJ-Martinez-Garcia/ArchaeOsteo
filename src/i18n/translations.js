export const translations = {
  es: { language: 'Idioma', selected: 'SELECCIONADO', saved: 'Guardado localmente', ready: 'Listo', backup: 'Copia de seguridad', import: 'Importar datos', compare: 'Comparar', learning: 'Aprendizaje' },
  en: { language: 'Language', selected: 'SELECTED', saved: 'Saved locally', ready: 'Ready', backup: 'Backup', import: 'Import data', compare: 'Compare', learning: 'Learning' }
};

export function translate(language, key) {
  return translations[language]?.[key] || translations.es[key] || key;
}
