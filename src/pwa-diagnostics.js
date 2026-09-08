function capabilityRows() {
  const indexedDbAvailable = 'indexedDB' in globalThis;
  let webglAvailable = false;
  try {
    const canvas = document.createElement('canvas');
    webglAvailable = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {}
  const row = (label, ok, detail) => `<li data-pwa-capability class="${ok ? 'ok' : 'pending'}"><span aria-hidden="true">${ok ? '✓' : '○'}</span> ${label}: ${detail}</li>`;
  return row('IndexedDB', indexedDbAvailable, indexedDbAvailable ? 'disponible para proyectos locales' : 'no disponible · se usará respaldo')
    + row('WebGL', webglAvailable, webglAvailable ? 'visor 3D disponible' : 'se usará atlas de respaldo');
}

export function installCapabilityDiagnostics() {
  const install = () => {
    const list = document.querySelector('#pwa-diagnostics-status');
    if (!list || list.dataset.capabilityObserver) return;
    list.dataset.capabilityObserver = 'true';
    const render = () => {
      list.querySelectorAll('[data-pwa-capability]').forEach(row => row.remove());
      list.insertAdjacentHTML('beforeend', capabilityRows());
    };
    new MutationObserver(() => {
      if (!list.querySelector('[data-pwa-capability]')) render();
    }).observe(list, { childList: true });
    render();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else queueMicrotask(install);
}
