export const INSPECTOR_DEFAULT_WIDTH = 380;
export const INSPECTOR_STORAGE_KEY = 'osteo3d-inspector-width-v1';

export function inspectorWidthBounds(viewportWidth) {
  const sidebar = viewportWidth <= 1100 ? 210 : 260;
  return { min: 300, max: Math.max(300, Math.min(720, viewportWidth - sidebar - 320 - 10)) };
}

export function clampInspectorWidth(value, viewportWidth) {
  const { min, max } = inspectorWidthBounds(viewportWidth);
  return Math.round(Math.max(min, Math.min(max, Number.isFinite(value) ? value : INSPECTOR_DEFAULT_WIDTH)));
}

export function initInspectorLayout() {
  const layout = document.querySelector('.layout'), inspector = document.querySelector('#inspector');
  if (!layout || !inspector) return;
  const divider = document.createElement('div');
  divider.id = 'inspector-divider'; divider.className = 'inspector-divider';
  divider.tabIndex = 0;
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-orientation', 'vertical');
  divider.setAttribute('aria-controls', 'inspector');
  layout.insertBefore(divider, inspector);
  let preferred = INSPECTOR_DEFAULT_WIDTH, drag = null;
  try { const stored = localStorage.getItem(INSPECTOR_STORAGE_KEY); if (stored && Number.isFinite(Number(stored))) preferred = Number(stored); } catch { /* Private/storage-restricted browsing remains usable. */ }
  const desktop = matchMedia('(min-width: 901px)');
  const persist = () => { try { localStorage.setItem(INSPECTOR_STORAGE_KEY, String(preferred)); } catch {} };
  const apply = () => {
    const width = clampInspectorWidth(preferred, layout.clientWidth);
    const bounds = inspectorWidthBounds(layout.clientWidth);
    layout.style.setProperty('--inspector-width', `${width}px`);
    const sidebar = layout.clientWidth <= 1100 ? 210 : 260;
    layout.style.gridTemplateColumns = `${sidebar}px minmax(0, 1fr) 10px ${width}px`;
    layout.style.justifyContent = 'start';
    inspector.style.removeProperty('width');
    divider.setAttribute('aria-valuemin', String(bounds.min));
    divider.setAttribute('aria-valuemax', String(bounds.max));
    divider.setAttribute('aria-valuenow', String(width));
    const english = document.documentElement.lang === 'en';
    divider.setAttribute('aria-label', english ? 'Resize inspector' : 'Cambiar anchura del panel derecho');
    divider.setAttribute('aria-valuetext', `${width} px`);
    divider.title = english ? 'Drag or use arrow keys. Double-click to reset.' : 'Arrastra o usa las flechas. Doble clic para restablecer.';
  };
  const finish = (cancel = false) => {
    if (!drag) return;
    const previous = drag; drag = null;
    if (cancel) preferred = previous.preferred;
    if (divider.hasPointerCapture(previous.id)) divider.releasePointerCapture(previous.id);
    document.body.classList.remove('resizing-inspector'); apply(); persist();
  };
  divider.addEventListener('pointerdown', event => {
    if (!desktop.matches || event.button !== 0) return;
    event.preventDefault(); divider.focus();
    drag = { id: event.pointerId, x: event.clientX, width: inspector.getBoundingClientRect().width, preferred };
    divider.setPointerCapture(event.pointerId); document.body.classList.add('resizing-inspector');
  });
  divider.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    preferred = clampInspectorWidth(drag.width + drag.x - event.clientX, layout.clientWidth); apply();
  });
  divider.addEventListener('pointerup', () => finish());
  divider.addEventListener('pointercancel', () => finish(true));
  divider.addEventListener('lostpointercapture', () => finish(true));
  const resetPreferredWidth = () => { if (drag) finish(true); preferred = INSPECTOR_DEFAULT_WIDTH; apply(); persist(); };
  divider.addEventListener('dblclick', resetPreferredWidth);
  divider.ondblclick = resetPreferredWidth;
  document.addEventListener('dblclick', event => { if (event.target === divider) resetPreferredWidth(); }, true);
  divider.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) { event.preventDefault(); finish(true); return; }
    if (!desktop.matches || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const bounds = inspectorWidthBounds(layout.clientWidth), step = event.shiftKey ? 40 : 16;
    preferred = event.key === 'Home' ? bounds.min : event.key === 'End' ? bounds.max : clampInspectorWidth(preferred, layout.clientWidth) + (event.key === 'ArrowLeft' ? step : -step);
    preferred = clampInspectorWidth(preferred, layout.clientWidth); apply(); persist();
  });
  window.addEventListener('resize', () => { if (drag) finish(true); apply(); });
  document.querySelector('#language')?.addEventListener('change', apply);
  apply();
}
