// Parse records, not lines: quoted scientific notes can contain CR/LF and commas.
export function parseCsvRecords(text) {
  const input = String(text).replace(/^\uFEFF/, '');
  const records = [];
  let row = [], value = '', mode = 'start', touched = false, line = 1;
  const field = () => { row.push(value); value = ''; mode = 'start'; };
  const record = () => { field(); if (touched) records.push(row); row = []; touched = false; };
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (mode === 'quoted') {
      if (char === '"') {
        if (input[i + 1] === '"') { value += '"'; i += 1; }
        else mode = 'closed';
      } else { value += char; if (char === '\n') line += 1; }
      continue;
    }
    if (char === ',') { touched = true; field(); }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      record(); line += 1;
    } else if (char === '"' && mode === 'start') { touched = true; mode = 'quoted'; }
    else {
      if (char === '"' || mode === 'closed') throw new Error(`CSV: comillas incorrectas en la línea ${line}.`);
      touched = true; mode = 'plain'; value += char;
    }
  }
  if (mode === 'quoted') throw new Error(`CSV: comillas sin cerrar al final de la línea ${line}.`);
  if (touched || row.length || value.length) record();
  return records;
}

export function parseCsv(text) {
  const records = parseCsvRecords(text);
  if (records.length < 2) throw new Error('El CSV no contiene registros.');
  const headers = records[0].map(header => header.trim());
  if (!headers.includes('Bone_ID')) throw new Error('El CSV debe incluir la columna Bone_ID.');
  if (headers.some(header => !header) || new Set(headers).size !== headers.length) throw new Error('El CSV contiene encabezados vacíos o duplicados.');
  return records.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`CSV: registro ${index + 2} con ${values.length} campos; se esperaban ${headers.length}.`);
    return Object.fromEntries(headers.map((header, field) => [header, values[field]]));
  });
}
