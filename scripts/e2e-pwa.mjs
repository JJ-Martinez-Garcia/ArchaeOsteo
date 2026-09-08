import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
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

  await cdp.send('Network.emulateNetworkConditions', {
    connectionType: 'none',
    downloadThroughput: 0,
    latency: 0,
    offline: true,
    uploadThroughput: 0
  });
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
  const uncachedFetchBlocked = await evaluate(cdp, `fetch('./__offline_probe__?nonce=${Date.now()}', { cache: 'no-store' }).then(() => false).catch(() => true)`);
  assert.equal(uncachedFetchBlocked, true, 'La red simulada debe bloquear una petición inédita.');
  assert.equal((await evaluate(cdp, projectReadExpression())).schemaVersion, 2, 'El proyecto debe seguir disponible offline.');

  await cdp.send('Network.emulateNetworkConditions', {
    connectionType: 'wifi',
    downloadThroughput: -1,
    latency: 0,
    offline: false,
    uploadThroughput: -1
  });
  assert.deepEqual(runtimeErrors, [], `La consola del navegador contiene errores: ${runtimeErrors.join(' | ')}`);
  console.log(`PWA browser E2E: OK · ${coverage.trim()} · ${shellCache} · IndexedDB y arranque offline verificados.`);
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
