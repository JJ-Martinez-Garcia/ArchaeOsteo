import assert from 'node:assert/strict';
import { testInspectorLayout } from '../tests/inspector-layout.e2e.mjs';
import { testDataIntegrity } from '../tests/data-integrity.e2e.mjs';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const DIST_ROOT = path.resolve('dist');
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm'
};
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.BROWSER_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' : null,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }
  throw new Error('No se encontró Chrome, Edge o Chromium para la prueba E2E. Define CHROME_PATH.');
}

function safeDistPath(pathname) {
  const decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const resolved = path.resolve(DIST_ROOT, `.${decoded}`);
  if (resolved !== DIST_ROOT && !resolved.startsWith(`${DIST_ROOT}${path.sep}`)) return null;
  return resolved;
}

async function startStaticServer() {
  if (!(await fileExists(path.join(DIST_ROOT, 'index.html')))) {
    throw new Error('Falta dist/index.html. Ejecuta la compilación antes de la prueba E2E.');
  }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      let filePath = safeDistPath(url.pathname);
      if (!filePath) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      let fileStat = await stat(filePath).catch(() => null);
      if (fileStat?.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        fileStat = await stat(filePath).catch(() => null);
      }
      if (!fileStat?.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      const body = request.method === 'HEAD' ? null : await readFile(filePath);
      response.writeHead(200, {
        'Cache-Control': 'no-cache',
        'Content-Length': fileStat.size,
        'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        ...(path.basename(filePath) === 'sw.js' ? { 'Service-Worker-Allowed': '/' } : {})
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500).end(error.message);
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

async function waitForDevTools(profileDirectory, browserProcess, timeout = 15_000) {
  const activePortFile = path.join(profileDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (browserProcess.exitCode !== null) throw new Error(`El navegador terminó antes de iniciar DevTools (${browserProcess.exitCode}).`);
    if (await fileExists(activePortFile)) {
      const [port] = (await readFile(activePortFile, 'utf8')).trim().split(/\r?\n/);
      if (port) return Number(port);
    }
    await sleep(100);
  }
  throw new Error('El navegador no abrió el puerto de depuración dentro del tiempo esperado.');
}

async function pageTarget(port) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const target = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (target) return target;
    } catch {}
    await sleep(100);
  }
  throw new Error('No se encontró una pestaña controlable en el navegador.');
}

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DevTools WebSocket no respondió.')), 10_000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('No se pudo conectar a DevTools.')); }, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  const eventWaiters = [];
  const listeners = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result || {});
      return;
    }
    for (const listener of listeners.get(message.method) || []) listener(message.params || {});
    for (let index = eventWaiters.length - 1; index >= 0; index -= 1) {
      const waiter = eventWaiters[index];
      if (waiter.method !== message.method || !waiter.predicate(message.params || {})) continue;
      eventWaiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message.params || {});
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { method, resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const waitForEvent = (method, predicate = () => true, timeout = 30_000) => new Promise((resolve, reject) => {
    const waiter = { method, predicate, resolve, timer: null };
    waiter.timer = setTimeout(() => {
      const index = eventWaiters.indexOf(waiter);
      if (index >= 0) eventWaiters.splice(index, 1);
      reject(new Error(`No llegó el evento ${method} dentro del tiempo esperado.`));
    }, timeout);
    eventWaiters.push(waiter);
  });
  const on = (method, listener) => listeners.set(method, [...(listeners.get(method) || []), listener]);
  return { close: () => socket.close(), on, send, waitForEvent };
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    awaitPromise: true,
    expression,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(`Evaluación en navegador: ${description}`);
  }
  return result.result?.value;
}

async function waitForValue(client, expression, predicate, label, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  let lastValue;
  while (Date.now() < deadline) {
    try {
      lastValue = await evaluate(client, expression);
      if (predicate(lastValue)) return lastValue;
    } catch {}
    await sleep(200);
  }
  throw new Error(`${label} no alcanzó el estado esperado. Último valor: ${JSON.stringify(lastValue)}`);
}

async function navigate(client, method, params = {}, timeout = 30_000) {
  const loaded = client.waitForEvent('Page.loadEventFired', () => true, timeout);
  await client.send(method, params);
  await loaded;
}

async function setOfflineState(client, offline) {
  const conditions = {
    connectionType: offline ? 'none' : 'wifi',
    downloadThroughput: offline ? 0 : -1,
    latency: 0,
    offline,
    uploadThroughput: offline ? 0 : -1
  };
  try {
    await client.send('Network.emulateNetworkConditionsByRule', {
      emulateOfflineServiceWorker: offline,
      matchedNetworkConditions: [{ urlPattern: '', ...conditions }]
    });
    await client.send('Network.overrideNetworkState', conditions);
    return 'service-worker-aware';
  } catch {
    await client.send('Network.emulateNetworkConditions', conditions);
    return 'legacy';
  }
}

async function stopStaticServer(server) {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections?.();
  });
}

async function waitForProcessExit(processHandle, timeout = 5_000) {
  if (!processHandle || processHandle.exitCode !== null) return true;
  return Promise.race([
    new Promise(resolve => processHandle.once('exit', () => resolve(true))),
    sleep(timeout).then(() => false)
  ]);
}

function projectReadExpression() {
  return `(async () => new Promise(resolve => {
    const request = indexedDB.open('osteo3d', 2);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) { db.close(); resolve(null); return; }
      const item = db.transaction('projects').objectStore('projects').get('default');
      item.onerror = () => { db.close(); resolve(null); };
      item.onsuccess = () => { const value = item.result || null; db.close(); resolve(value); };
    };
  }))()`;
}

let browserProcess;
let cdp;
let staticServer;
let profileDirectory;
let stderr = '';

try {
  const configuredUrl = process.env.OSTEO3D_E2E_URL?.trim();
  let baseUrl;
  if (configuredUrl) {
    baseUrl = new URL(configuredUrl).href;
  } else {
    const local = await startStaticServer();
    staticServer = local.server;
    baseUrl = local.url;
  }
  const browserPath = await findBrowser();
  profileDirectory = await mkdtemp(path.join(tmpdir(), 'osteo3d-e2e-'));
  browserProcess = spawn(browserPath, [
    '--headless=new',
    '--disable-background-networking',
    '--disable-breakpad',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-sync',
    '--enable-unsafe-swiftshader',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDirectory}`,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  browserProcess.stderr.setEncoding('utf8');
  browserProcess.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-8_000); });

  const devToolsPort = await waitForDevTools(profileDirectory, browserProcess);
  const target = await pageTarget(devToolsPort);
  cdp = await createCdpClient(target.webSocketDebuggerUrl);
  await Promise.all([
    cdp.send('Log.enable'),
    cdp.send('Network.enable'),
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable')
  ]);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});

  const runtimeErrors = [];
  cdp.on('Runtime.exceptionThrown', event => {
    const details = event.exceptionDetails || {};
    runtimeErrors.push(details.exception?.description || details.text || 'Excepción JavaScript sin detalle');
  });
  cdp.on('Runtime.consoleAPICalled', event => {
    if (event.type !== 'error') return;
    runtimeErrors.push(event.args?.map(argument => argument.value || argument.description || '').join(' ') || 'console.error');
  });
  cdp.on('Log.entryAdded', event => {
    if (event.entry?.level === 'error' && event.entry?.source === 'javascript') runtimeErrors.push(event.entry.text);
  });

  const testUrl = new URL(`?e2e=${Date.now()}`, baseUrl).href;
  await navigate(cdp, 'Page.navigate', { url: testUrl });
  await waitForValue(cdp, 'document.readyState', value => value === 'complete', 'La carga inicial');
  assert.equal(await evaluate(cdp, `document.title.startsWith('Osteo3D')`), true, 'La aplicación debe establecer su título.');
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector('#app') && document.querySelector('#viewer'))`), true, 'Deben existir la aplicación y el visor.');

  const manifest = await evaluate(cdp, `fetch('./manifest.json', { cache: 'no-store' }).then(response => response.json())`);
  assert.equal(manifest.name, 'Osteo3D');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.type === 'image/png'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.type === 'image/png'));

  const appManifest = await cdp.send('Page.getAppManifest');
  assert.ok(appManifest.url?.endsWith('/manifest.json'), 'Chrome debe detectar el manifiesto enlazado.');
  assert.equal((appManifest.errors || []).length, 0, `El manifiesto no debe producir errores: ${JSON.stringify(appManifest.errors)}`);

  const coverage = await waitForValue(
    cdp,
    `document.querySelector('#model-package-status')?.textContent || ''`,
    value => /179\s+(?:de|of)\s+192/.test(value),
    'La cobertura del perfil adulto'
  );
  assert.match(coverage, /179\s+(?:de|of)\s+192/);

  const serviceWorkerState = await waitForValue(
    cdp,
    `(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.state || registration.waiting?.state || registration.installing?.state || 'missing';
    })()`,
    value => value === 'activated',
    'La activación del Service Worker'
  );
  assert.equal(serviceWorkerState, 'activated');

  const controlledUrl = new URL(`?e2e-controlled=${Date.now()}`, baseUrl).href;
  await navigate(cdp, 'Page.navigate', { url: controlledUrl });
  await waitForValue(cdp, 'Boolean(navigator.serviceWorker.controller)', Boolean, 'El control del Service Worker');
  await waitForValue(
    cdp,
    `document.querySelector('#model-package-status')?.textContent || ''`,
    value => /179\s+(?:de|of)\s+192/.test(value),
    'La cobertura tras recargar'
  );
  await waitForValue(
    cdp,
    `[...document.querySelectorAll('#details > dl > dd')][7]?.textContent || ''`,
    value => /GLB (?:loaded|cargado)/i.test(value),
    'La carga de un modelo GLB',
    45_000
  );

  await evaluate(cdp, `document.querySelector('#save')?.click()`);
  const savedProject = await waitForValue(
    cdp,
    projectReadExpression(),
    value => value?.schemaVersion === 2 && value?.id === 'default',
    'La persistencia IndexedDB'
  );
  assert.equal(savedProject.profile, 'adult_male');

  const shellCache = await evaluate(cdp, `(async () => {
    const names = await caches.keys();
    return names.find(name => name.startsWith('osteo3d-shell-v')) || '';
  })()`);
  assert.match(shellCache, /^osteo3d-shell-v\d+\.\d+\.\d+-[a-f0-9]{12}$/);

  await testInspectorLayout(cdp,evaluate,waitForValue);
  await testDataIntegrity(cdp,evaluate,waitForValue,projectReadExpression);
  for (const [query, expected] of [['omóplato', 'escápula'], ['cúbito', 'ulna'], ['coxis', 'cóccix']]) {
    await evaluate(cdp, `(()=>{const input=document.querySelector('#search');input.value=${JSON.stringify(query)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert.equal(await evaluate(cdp, `document.querySelectorAll('#bone-list [data-bone]').length>0`), true, `Search synonym must return results: ${query}`);
    assert.equal(await evaluate(cdp, `document.querySelector('#bone-list [data-bone]')?.getAttribute('aria-label')?.toLowerCase().includes(${JSON.stringify(expected)})`), true, `Search synonym must identify expected bone: ${query}`);
  }
  await evaluate(cdp, `(()=>{const input=document.querySelector('#search');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(cdp, `document.querySelector('#tab-inventory').click();document.querySelector('#mark-remaining-absent').click()`);
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector('#confirm-action-accept'))`), true, 'Mass absent action must require confirmation');
  await evaluate(cdp, `document.querySelector('#confirm-action-accept').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>Object.values(value.status||{}).filter(status=>status==='absent').length>0,'Persist mass absent action');
  await evaluate(cdp, `document.querySelector('#undo').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>Object.values(value.status||{}).every(status=>status!=='absent'),'Undo mass absent action');
  await evaluate(cdp, `document.querySelector('#multi-select-toggle').click();document.querySelector('[data-bone="skull"]').click();document.querySelector('[data-bone="mandible"]').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('#apply-multi-selection').disabled`), false, 'Multi-selection action must enable after selecting bones');
  assert.match(await evaluate(cdp, `document.querySelector('#apply-multi-selection').textContent`), /2/);
  await evaluate(cdp, `document.querySelector('#apply-multi-selection').click()`);
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector('#confirm-action-accept'))`), true, 'Multi-selection action must require confirmation');
  await evaluate(cdp, `document.querySelector('#confirm-action-accept').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.status?.skull==='present'&&value.status?.mandible==='present','Persist multi-selection action');
  await evaluate(cdp, `document.querySelector('#undo').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>!value.status?.skull&&!value.status?.mandible,'Undo multi-selection action');
  await evaluate(cdp, `(()=>{const multi=document.querySelector('#multi-select-toggle');if(multi.getAttribute('aria-pressed')==='true')multi.click();document.querySelector('#quick-present').click();})()`);
  assert.equal(await evaluate(cdp, `document.querySelector('#quick-present').getAttribute('aria-pressed')`), 'true', 'Quick presence must activate');
  assert.equal(await evaluate(cdp, `document.querySelector('#quick-fragmentary').getAttribute('aria-pressed')`), 'false', 'Quick modes must not overlap');
  await evaluate(cdp, `document.querySelector('#quick-fragmentary').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('#quick-present').getAttribute('aria-pressed')`), 'false', 'Quick fragmentation must deactivate quick presence');
  assert.equal(await evaluate(cdp, `document.querySelector('#quick-fragmentary').getAttribute('aria-pressed')`), 'true', 'Quick fragmentation must activate');
  await evaluate(cdp, `document.querySelector('#quick-fragmentary').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('#quick-fragmentary').getAttribute('aria-pressed')`), 'false', 'Quick fragmentation must be reversible');
  await evaluate(cdp, `document.querySelector('#tab-stats').click();const side=document.querySelector('#filter-side');side.value='Izquierda';side.dispatchEvent(new Event('change'));const status=document.querySelector('#filter-status');status.value='not_recorded';status.dispatchEvent(new Event('change'));`);
  await waitForValue(cdp,projectReadExpression(),value=>value.filters?.side==='Izquierda'&&value.filters?.status==='not_recorded','Persist combined inventory filters');
  assert.equal(await evaluate(cdp, `document.querySelector('#stats-summary').textContent.includes('/')`), true, 'Combined filters must refresh statistics');
  await evaluate(cdp, `document.querySelector('#clear-filters').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.filters?.side==='all'&&value.filters?.status==='all','Clear inventory filters');
  await evaluate(cdp, `document.querySelector('#tab-report').click()`);
  assert.equal(await evaluate(cdp, `['sources','method','limits'].every(key=>document.querySelector('#report-'+key)?.tagName==='TEXTAREA')`), true, 'Long report fields must be multiline controls');
  await evaluate(cdp, `document.querySelector('#report-sources').value='DOI: E2E\\nReferencia de campo';document.querySelector('#report-method').value='Comparación osteológica';document.querySelector('#report-limits').value='Pendiente de revisión especializada';document.querySelector('#save-report').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.report?.sources?.includes('Referencia de campo')&&value.report?.method==='Comparación osteológica'&&value.report?.limits==='Pendiente de revisión especializada','Persist long report fields');
  await evaluate(cdp, `document.querySelector('#tab-dental').click()`);
  await evaluate(cdp, `document.querySelector('[data-dental="caries"]').click();document.querySelector('[data-tooth="11"]').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.dental?.['11']==='caries','Persist permanent tooth status');
  await evaluate(cdp, `document.querySelector('#tab-inventory').click();document.querySelector('#undo').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>!value.dental?.['11'],'Undo permanent tooth status');
  await evaluate(cdp, `document.querySelector('#tab-dental').click();document.querySelector('[data-dental="caries"]').click();document.querySelector('[data-tooth="11"]').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.dental?.['11']==='caries','Restore permanent tooth status');
  await evaluate(cdp, `(()=>{const select=document.querySelector('#dentition-type');select.value='deciduous';select.dispatchEvent(new Event('change'));document.querySelector('[data-dental="developing"]').click();document.querySelector('[data-tooth="51"]').click();})()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.deciduousDental?.['51']==='developing','Persist deciduous tooth status');
  await evaluate(cdp, `(()=>{const select=document.querySelector('#dentition-type');select.value='permanent';select.dispatchEvent(new Event('change'));})()`);
  for(const profile of ['adult_female','infant','neonate']){
    await evaluate(cdp,`(()=>{const mode=document.querySelector('#geometry-mode');mode.value='auto';mode.dispatchEvent(new Event('change'));const select=document.querySelector('#profile');select.value=${JSON.stringify(profile)};select.dispatchEvent(new Event('change'));})()`);
    await waitForValue(cdp,`({...document.querySelector('#viewer').dataset})`,value=>value.modelProfile===profile&&value.generatedCount==='179',`Load 179 original GLBs: ${profile}`,45000);
    await waitForValue(cdp,`document.querySelector('#details').textContent`,value=>/GLB propio|Original GLB/.test(value),`Original GLB provenance: ${profile}`);
    assert.equal(await evaluate(cdp,`document.querySelector('#model-package-action').disabled`),false,'Original profile must be downloadable');
  }
  // Actual WebGL profile switching, not only UI labels. Keep inventory intact.
  assert.equal(await evaluate(cdp, `Boolean(document.querySelector('#viewer canvas'))`),true);
  for(const profile of ['adult_female','infant','neonate','adult_male']) {
    await evaluate(cdp, `(()=>{const mode=document.querySelector('#geometry-mode');mode.value='schematic';mode.dispatchEvent(new Event('change'));const select=document.querySelector('#profile');select.value=${JSON.stringify(profile)};select.dispatchEvent(new Event('change'));})()`);
    await waitForValue(cdp, `({...document.querySelector('#viewer').dataset})`,value=>value.modelProfile===profile&&value.schematicCount==='179',`179 schematic meshes: ${profile}`);
    await waitForValue(cdp, `document.querySelector('#details')?.textContent||''`,value=>/3D esquemático|Schematic 3D/.test(value),`Schematic provenance: ${profile}`);
    if(process.env.OSTEO3D_CAPTURE_3D==='1') {
      await sleep(800);
      const screenshot=await cdp.send('Page.captureScreenshot',{format:'png'});
      await mkdir('.tmp-model-review',{recursive:true});
      await writeFile(`.tmp-model-review/${profile}.png`,Buffer.from(screenshot.data,'base64'));
    }
  }
  await evaluate(cdp, `(()=>{const slider=document.querySelector('#explosion');slider.value='100';slider.dispatchEvent(new Event('input'));})()`);
  await sleep(500);
  if(process.env.OSTEO3D_CAPTURE_3D==='1'){
    const screenshot=await cdp.send('Page.captureScreenshot',{format:'png'});
    await writeFile('.tmp-model-review/exploded.png',Buffer.from(screenshot.data,'base64'));
  }
  await evaluate(cdp, `document.querySelector('#save').click()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.geometryMode==='schematic','Persist schematic mode');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await sleep(500);
  assert.equal(await evaluate(cdp, `document.documentElement.scrollWidth<=window.innerWidth+1`),true,'Mobile layout must not overflow horizontally');
  assert.equal(await evaluate(cdp, `getComputedStyle(document.querySelector('#profile').closest('label')).display!=='none'`),true,'Profile picker must be available on mobile');
  await evaluate(cdp, `document.querySelector('#catalog-toggle').click()`);
  assert.equal(await evaluate(cdp, `getComputedStyle(document.querySelector('.sidebar')).display!=='none'`),true,'Mobile catalogue must open');
  await evaluate(cdp, `document.querySelector('#catalog-toggle').click()`);
  await evaluate(cdp, `document.querySelector('#inspector-toggle').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('#inspector').classList.contains('mobile-open')`),true,'Mobile inspector must open');
  assert.equal(await evaluate(cdp, `document.querySelector('#inspector-toggle').getAttribute('aria-expanded')`),'true','Mobile inspector exposes expanded state');
  assert.equal(await evaluate(cdp, `(()=>{const e=document.querySelector('#inspector-toggle');const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})()`),true,'Mobile inspector toggle must be touch-sized');
  await evaluate(cdp, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await evaluate(cdp, `document.querySelector('#inspector').classList.contains('mobile-open')`),false,'Escape must close mobile inspector');
  assert.equal(await evaluate(cdp, `document.activeElement?.id`),'inspector-toggle','Escape must return focus to inspector toggle');
  await evaluate(cdp, `document.querySelector('#inspector-toggle').click()`);
  await evaluate(cdp, `document.querySelector('#viewer').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}))`);
  assert.equal(await evaluate(cdp, `document.querySelector('#inspector').classList.contains('mobile-open')`),false,'Viewer touch must close mobile inspector');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate(cdp, `document.querySelector('#analysis-panel-button').click()`);
  await evaluate(cdp, `(()=>{document.querySelector('#review-mne').value='2';document.querySelector('#review-reason-mne').value='E2E: revisión justificada de prueba';document.querySelector('#save-analysis-review').click();})()`);
  await waitForValue(cdp,projectReadExpression(),value=>value.analysisReview?.mne?.value===2,'Persist manual analysis review');
  await waitForValue(cdp, `document.querySelector('#extended-panel').textContent`,value=>/Revisión manual/.test(value),'Refresh manual analysis result');
  let environmentSummary = 'despliegue en línea verificado';
  if (staticServer) {
    await stopStaticServer(staticServer);
    staticServer = null;
    const offlineMode = await setOfflineState(cdp, true);
    const offlineUrl = new URL(`?e2e-offline=${Date.now()}`, baseUrl).href;
    await navigate(cdp, 'Page.navigate', { url: offlineUrl });
    await waitForValue(cdp, `Boolean(document.querySelector('#app'))`, Boolean, 'El arranque offline');
    const offlineState = await waitForValue(
      cdp,
      `({ title: document.title, coverage: document.querySelector('#model-package-status')?.textContent || '' })`,
      value => value?.title.startsWith('Osteo3D') && /179\s+(?:de|of)\s+192/.test(value.coverage),
      'El estado offline'
    );
    assert.match(offlineState.coverage, /179\s+(?:de|of)\s+192/);
    await waitForValue(cdp, `({...document.querySelector('#viewer').dataset})`,value=>value.geometryMode==='schematic'&&value.schematicCount==='179','Offline procedural skeleton');
    const uncachedFetchBlocked = await evaluate(cdp, `fetch('./__offline_probe__?nonce=${Date.now()}', { cache: 'no-store' }).then(() => false).catch(() => true)`);
    assert.equal(uncachedFetchBlocked, true, 'El servidor detenido debe bloquear una petición inédita.');
    assert.equal((await evaluate(cdp, projectReadExpression())).schemaVersion, 2, 'El proyecto debe seguir disponible offline.');
    await setOfflineState(cdp, false);
    environmentSummary = `IndexedDB y arranque offline verificados (${offlineMode})`;
  }
  assert.deepEqual(runtimeErrors, [], `La consola del navegador contiene errores: ${runtimeErrors.join(' | ')}`);
  console.log(`PWA browser E2E: OK · ${coverage.trim()} · ${shellCache} · ${environmentSummary}.`);
} catch (error) {
  if (stderr.trim()) console.error(`Navegador (últimas líneas):\n${stderr.trim()}`);
  throw error;
} finally {
  cdp?.close();
  if (browserProcess && browserProcess.exitCode === null) {
    browserProcess.kill('SIGTERM');
    if (!(await waitForProcessExit(browserProcess))) {
      browserProcess.kill('SIGKILL');
      await waitForProcessExit(browserProcess);
    }
  }
  if (staticServer) await new Promise(resolve => staticServer.close(resolve));
  if (profileDirectory) {
    const temporaryRoot = path.resolve(tmpdir());
    const resolvedProfile = path.resolve(profileDirectory);
    if (resolvedProfile.startsWith(`${temporaryRoot}${path.sep}`)) {
      await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }
}
