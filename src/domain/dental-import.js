const STATUS_LABELS = {
  present: ['Presente', 'Present'], absent_am: ['Ausente AM', 'Absent AM'], absent_pm: ['Ausente PM', 'Absent PM'],
  unerupted: ['No erupcionado', 'Unerupted'], developing: ['En formación', 'Developing'], caries: ['Caries'],
  wear: ['Desgaste', 'Wear'], fragmented: ['Fragmentado', 'Fragmented'], pathology: ['Patología', 'Pathology'],
  not_observable: ['No observable', 'Not observable'], not_recorded: ['No registrado', 'Not recorded']
};
const CODES = new Map(Object.entries(STATUS_LABELS).flatMap(([code, labels]) => [code, ...labels].map(label => [label.toLowerCase(), code])));

export function importDentalRows(current, rows, { deciduous = false, locked = {} } = {}) {
  const result = { ...current }, seen = new Set();
  for (const [index, row] of rows.entries()) {
    const id = String(row.Tooth_FDI ?? '').trim();
    const validId = deciduous ? /^[5-8][1-5]$/.test(id) : /^[1-4][1-8]$/.test(id);
    if (!validId || seen.has(id)) throw new Error(`Odontograma: FDI inválido o duplicado en la fila ${index + 2}: ${id}`);
    seen.add(id);
    const raw = String(row.Status ?? '').trim();
    if (!raw || locked[id]) continue;
    const status = CODES.get(raw.toLowerCase());
    if (!status) throw new Error(`Odontograma: estado desconocido para ${id}: ${raw}`);
    if (status === 'not_recorded') delete result[id]; else result[id] = status;
  }
  return result;
}
