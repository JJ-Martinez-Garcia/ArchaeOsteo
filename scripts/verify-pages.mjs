import assert from 'node:assert/strict';

const target = process.argv[2] || process.env.OSTEO3D_PAGES_URL;
if (!target) throw new Error('Indica la URL publicada como argumento o en OSTEO3D_PAGES_URL.');
const url = new URL(target);
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let lastError;

for (let attempt = 1; attempt <= 8; attempt += 1) {
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { accept: 'text/html' } });
    const html = await response.text();
    assert.equal(response.ok, true, `HTTP ${response.status}`);
    assert.match(html, /<title>Osteo3D/);
    assert.match(html, /manifest\.json/);
    assert.match(html, /assets\//);
    console.log(`Published Pages entry point: OK · ${response.url} · attempt ${attempt}`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 8) await wait(3000);
  }
}

throw new Error(`La URL publicada no pasó la verificación tras 8 intentos: ${lastError?.message || lastError}`);
