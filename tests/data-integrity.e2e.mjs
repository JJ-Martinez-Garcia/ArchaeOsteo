import assert from 'node:assert/strict';

export async function testDataIntegrity(cdp, evaluate, waitForValue, projectReadExpression) {
  const run = expression => evaluate(cdp, expression);
  const read = () => run(projectReadExpression());
  const click = selector => run(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const importCsv = async text => {
    await run(`(async () => { const input = document.querySelector('#import-file'), transfer = new DataTransfer(); transfer.items.add(new File([${JSON.stringify(text)}], 'integrity.csv', {type:'text/csv'})); input.files = transfer.files; await input.onchange({target:input}); })()`);
    assert.equal(await run(`Boolean(document.querySelector('#confirm-import'))`), true);
  };
  await click('[data-bone="skull"]');
  await click('#tab-metrics');
  await run(`document.querySelector('#metric-length').value='0';document.querySelector('#metric-width').value='';document.querySelector('#metric-height').value='';document.querySelector('#metric-diameter').value='';document.querySelector('#save-metrics').click()`);
  await waitForValue(cdp, projectReadExpression(), p => p.measurements?.skull?.length === 0 && p.measurements.skull.diameter === null, 'Manual measurements preserve zero and unknown');
  await run(`document.querySelector('#landmark-name').value='incomplete';document.querySelector('#add-landmark').click()`);
  assert.match(await run(`document.querySelector('#toast').textContent`), /tres coordenadas/);
  await run(`(()=>{for(const [name,x] of [['A',0],['B',2]]){document.querySelector('#landmark-name').value=name;document.querySelector('#landmark-x').value=x;document.querySelector('#landmark-y').value='0';document.querySelector('#landmark-z').value='0';document.querySelector('#add-landmark').click();}})()`);
  await run(`document.querySelector('#landmark-reference-mm').value='50';document.querySelector('#calibrate-landmarks').click()`);
  await waitForValue(cdp, projectReadExpression(), p => p.calibrations?.skull?.referenceMm === 50, 'Persist user landmark calibration');
  assert.match(await run(`document.querySelector('#landmark-distance').textContent`), /Distancia calibrada|Calibrated distance/);
  await run(`(()=>{const row=document.querySelector('[data-landmark-row="0"]');row.querySelector('[data-landmark-field="name"]').value='A-editado';row.querySelector('[data-landmark-field="category"]').value='craniometric';row.querySelector('[data-save-landmark]').click();})()`);
  await waitForValue(cdp, projectReadExpression(), p => p.landmarks?.skull?.[0]?.name === 'A-editado' && p.landmarks.skull[0].category === 'craniometric', 'Edit persisted landmark');
  await run(`document.querySelector('#capture-surface-landmark').click()`);
  assert.equal(await run(`document.querySelector('#capture-surface-landmark').getAttribute('aria-pressed')`), 'true');
  await run(`document.querySelector('#capture-surface-landmark').click()`);
  assert.equal(await run(`document.querySelector('#capture-surface-landmark').getAttribute('aria-pressed')`), 'false');
  await click('#tab-inventory'); await click('#show-table');
  await run(`(()=>{const input=document.querySelector('[data-row-field="completeness"][data-row-id="skull"]');input.value='0';input.dispatchEvent(new Event('change'));})()`);
  await waitForValue(cdp, projectReadExpression(), p => p.completeness?.skull === 0, 'Table saves observed zero percent');
  await run(`(()=>{const input=document.querySelector('[data-row-field="completeness"][data-row-id="skull"]');input.value='';input.dispatchEvent(new Event('change'));})()`);
  await waitForValue(cdp, projectReadExpression(), p => !Object.hasOwn(p.completeness, 'skull'), 'Table clears unknown percentage');
  await click('#show-table');
  await click('#record-panel-button');
  await run(`document.querySelector('#record-weight').value='0';document.querySelector('#record-fragments').value='2';document.querySelector('#record-note').value='original';document.querySelector('#save-record').click()`);
  await waitForValue(cdp, projectReadExpression(), p => p.weights?.skull === 0 && p.notes?.skull === 'original', 'Save a true zero weight');
  await click('#record-panel-button');
  await run(`document.querySelector('#record-weight').value='';document.querySelector('#save-record').click()`);
  await waitForValue(cdp, projectReadExpression(), p => !Object.hasOwn(p.weights, 'skull'), 'Empty weight remains unknown');
  await importCsv('Bone_ID,Notes,Weight_g\nskull,"nota, con comillas ""y salto""\nsegunda línea",\n');
  assert.match(await run(`document.querySelector('#extended-panel').textContent`), /celdas no vacías/);
  await run(`document.querySelector('#confirm-import').onclick()`);
  assert.equal((await read()).notes.skull, 'nota, con comillas "y salto"\nsegunda línea');
  assert.equal((await read()).fragments.skull, 2, 'Omitted columns do not overwrite values');
  await click('#tab-inventory'); await click('#undo');
  await waitForValue(cdp, projectReadExpression(), p => p.notes?.skull === 'original', 'Undo CSV import');
  await click('#redo');
  await waitForValue(cdp, projectReadExpression(), p => p.notes?.skull?.includes('segunda línea'), 'Redo CSV import');
  // Lock after preview to exercise revalidation at confirmation time.
  await importCsv('Bone_ID,Notes\nskull,must not replace\n');
  await click('#lock-selected');
  await waitForValue(cdp, projectReadExpression(), p => p.locked?.skull === true, 'Lock selected record');
  await run(`document.querySelector('#confirm-import').onclick()`);
  assert.match((await read()).notes.skull, /segunda línea/);
  assert.match(await run(`document.querySelector('#toast').textContent`), /0 registros/);
  await click('#tab-metrics');
  await run(`document.querySelector('#metric-length').value='100';document.querySelector('#save-metrics').click()`);
  assert.equal((await read()).measurements.skull.length, 0, 'Measurements respect record lock');
  await click('#record-panel-button');
  assert.equal(await run(`document.querySelector('#save-record').disabled`), true);
  assert.equal(await run(`document.querySelector('#record-note').disabled`), true);
  // Direct handler invocation must also respect the lock, not just disabled controls.
  await run(`document.querySelector('#record-note').value='blocked';document.querySelector('#save-record').onclick()`);
  assert.match((await read()).notes.skull, /segunda línea/);
  await click('#tab-inventory'); await click('#lock-selected');
  await waitForValue(cdp, projectReadExpression(), p => !p.locked?.skull, 'Unlock test record');
  // Force both durable backends to fail without clearing any data.
  await run(`window.__osteoOpen = IDBFactory.prototype.open; window.__osteoSetItem = Storage.prototype.setItem; IDBFactory.prototype.open = function(){throw new DOMException('test','UnknownError')}; Storage.prototype.setItem = function(){throw new DOMException('test','QuotaExceededError')}; document.querySelector('#save').click()`);
  await waitForValue(cdp, `document.querySelector('#storage-status').dataset.saveState`, v => v === 'failed', 'Visible save failure');
  assert.match(await run(`document.querySelector('#toast').textContent`), /NO GUARDADO|NOT SAVED/);
  await run(`Storage.prototype.setItem = window.__osteoSetItem; document.querySelector('#save').click()`);
  await waitForValue(cdp, `document.querySelector('#storage-status').dataset.saveState`, v => v === 'localStorage', 'Successful recovery fallback');
  const recovered = await run(`JSON.parse(localStorage.getItem('osteo3d-project-fallback:default'))`);
  assert.match(recovered.notes.skull, /segunda línea/);
  await run(`IDBFactory.prototype.open = window.__osteoOpen; delete window.__osteoOpen; delete window.__osteoSetItem; document.querySelector('#save').click()`);
  await waitForValue(cdp, `document.querySelector('#storage-status').dataset.saveState`, v => v === 'indexedDB', 'Primary storage recovers');
  assert.equal(await run(`localStorage.getItem('osteo3d-project-fallback:default')`), null);
  await click('#tab-sheet');
  console.log('Data integrity browser: multiline CSV, undo/redo, locks and forced dual-storage failure/recovery OK.');
}
