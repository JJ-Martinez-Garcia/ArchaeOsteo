import assert from 'node:assert/strict';

const target = process.argv[2] || process.env.OSTEO3D_PAGES_URL;
if (!target) throw new Error('Indica la URL publicada como argumento o en OSTEO3D_PAGES_URL.');
const url = new URL(target);
const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const attempts = positiveInteger(process.env.OSTEO3D_VERIFY_ATTEMPTS, 12);
const delayMs = positiveInteger(process.env.OSTEO3D_VERIFY_DELAY_MS, 3000);
const timeoutMs = positiveInteger(process.env.OSTEO3D_VERIFY_TIMEOUT_MS, 10000);
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let lastError;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'text/html' } });
    const html = await response.text();
    assert.equal(response.ok, true, `HTTP ${response.status}`);
    assert.match(html, /<title>Osteo3D/);
    assert.match(html, /manifest\.json/);
    assert.match(html, /assets\//);
    console.log(`Published Pages entry point: OK · ${response.url} · attempt ${attempt}`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < attempts) await wait(delayMs);
  }
}

throw new Error(`La URL publicada no pasó la verificación tras ${attempts} intentos: ${lastError?.message || lastError}`);
