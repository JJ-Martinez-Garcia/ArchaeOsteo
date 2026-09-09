const FORMULA_PREFIX = /^[=+\-@]/;

/** Keep user-entered strings literal when opened by spreadsheet software. */
export function protectSpreadsheetValue(value) {
  if (typeof value !== 'string' || !FORMULA_PREFIX.test(value)) return value;
  return `'${value}`;
}

export function protectSpreadsheetRows(rows) {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, protectSpreadsheetValue(value)])));
}
