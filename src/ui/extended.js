import { calculateOsteoAnalysis } from '../domain/analysis.js';
import { applyInventoryRows, createBackup, downloadBlob, downloadJson, parseCsv, shareJson, validateBackup } from '../domain/backup.js';
import { createOsteoArchive, readOsteoArchive } from '../domain/backup-archive.js';
import { getCachedCustomModelFile, cacheCustomModelFile } from '../anatomy/package.js';
import { importDentalRows } from '../domain/dental-import.js';
import { translate } from '../i18n/translations.js';
import { portionOptionsForBone, portionLabel } from '../domain/portions.js';
import { normalizeWeightUnit } from '../domain/weights.js';
import { HIERARCHY_LEVELS, hierarchyId, normalizeHierarchy } from '../domain/hierarchy.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function formatChangeValue(value) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function mergeAuxiliaryXlsx(value, workbook, XLSX, bones) {
  const rows = name => workbook.Sheets[name] ? XLSX.utils.sheet_to_json(workbook.Sheets[name]) : [];
  const validIds = new Set(bones.map(bone => bone.id));
  const number = value => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; };
  const measurements = { ...(value.measurements || {}) };
  for (const row of rows('Osteometría')) if (validIds.has(row.Bone_ID)) {
    const next = { unit: row.unit === 'cm' ? 'cm' : 'mm' };
    for (const field of ['length', 'width', 'height', 'diameter']) next[field] = number(row[field]);
    measurements[row.Bone_ID] = next;
  }
  const landmarks = { ...(value.landmarks || {}) };
  for (const row of rows('Landmarks')) if (validIds.has(row.Bone_ID) && (row.Name ?? row.name) != null && ['X', 'Y', 'Z'].every(axis => number(row[axis] ?? row[axis.toLowerCase()]) != null)) {
    (landmarks[row.Bone_ID] ||= []).push({ name: String(row.Name ?? row.name), category: String(row.Category ?? row.category ?? 'osteometric'), x: number(row.X ?? row.x), y: number(row.Y ?? row.y), z: number(row.Z ?? row.z), source: String(row.Source ?? row.source ?? 'xlsx'), createdAt: String(row.CreatedAt ?? row.createdAt ?? '') });
  }
  const calibrations = { ...(value.calibrations || {}) };
  for (const row of rows('Calibraciones')) if (validIds.has(row.Bone_ID) && number(row.referenceMm ?? row.Reference_mm) != null && number(row.localDistance ?? row.Local_distance) != null) calibrations[row.Bone_ID] = { referenceMm: number(row.referenceMm ?? row.Reference_mm), localDistance: number(row.localDistance ?? row.Local_distance), updatedAt: String(row.updatedAt ?? row.Updated_at ?? '') };
  const landmarkModelRefs = { ...(value.landmarkModelRefs || {}) };
  for (const row of rows('Referencias landmarks')) if (validIds.has(row.Bone_ID)) {
    const { Bone_ID, ...reference } = row;
    landmarkModelRefs[Bone_ID] = { ...reference, needsReview: row.needsReview === true || row.needsReview === 'true' };
  }
  const analysisReview = { ...(value.analysisReview || {}) };
  for (const row of rows('Revisión análisis')) if (row.Metric) analysisReview[String(row.Metric).toLowerCase()] = { value: number(row.value), reason: String(row.reason || ''), signature: String(row.signature || '') };
  const changeRows = rows('Registro de cambios');
  const changeLog = changeRows.length ? changeRows.map(row => {
    const parse = raw => { try { return JSON.parse(raw); } catch { return raw; } };
    const { Previous, New, ...entry } = row;
    return { ...entry, previousValue: parse(Previous), newValue: parse(New) };
  }) : value.changeLog;
  const hierarchyRows = rows('Jerarquía');
  const hierarchy = hierarchyRows.length ? normalizeHierarchy(Object.fromEntries(HIERARCHY_LEVELS.map(level => [level, hierarchyRows.filter(row => row.Level === level).map(row => ({ id: row.ID, name: row.Name, parentId: row.Parent_ID, updatedAt: row.Updated_at }))]))) : normalizeHierarchy(value.hierarchy);
  return { ...value, measurements, landmarks, calibrations, landmarkModelRefs, analysisReview, changeLog, hierarchy };
}

const TAPHONOMY_OPTIONS = ['Erosión', 'Meteorización', 'Concreciones', 'Raíces', 'Actividad animal', 'Roedores', 'Carnívoros', 'Insectos', 'Alteración térmica', 'Fractura postmortem', 'Fractura perimortem', 'Marcas de corte', 'Coloración', 'Otros'];
const PATHOLOGY_TYPES = ['Normal', 'Patológico', 'Traumatizado', 'Alterado', 'Indeterminado'];

export function initExtendedFeatures({ state, bones, saveLocal, selectBone, renderList, renderStats, downloadFile, listProjects, loadProject, commitInventoryEdit, applyProjectData }) {
  state.fragments ||= {};
  state.portions ||= {};
  state.individuals ||= {};
  state.taphonomy ||= {};
  state.pathology ||= {};
  state.taphonomyDetails ||= {};
  state.pathologyDetails ||= {};
  state.notes ||= {};
  state.indeterminateFragments ||= [];
  state.language ||= 'es';

  const topActions = document.querySelector('.top-actions');
  topActions.insertAdjacentHTML('beforeend', `<label class="language-control">Idioma <select id="language"><option value="es">ES</option><option value="en">EN</option></select></label><button id="backup-project" class="secondary-action">Copia completa</button><button id="share-project" class="secondary-action">Compartir JSON</button><button id="import-project" class="secondary-action">Importar</button><input id="import-file" type="file" accept=".osteo3d,.json,.csv,.xlsx" hidden>`);

  const inspector = document.querySelector('.inspector');
  inspector.insertAdjacentHTML('beforeend', `<div class="extended-tools"><div class="paint-title">ANÁLISIS Y APRENDIZAJE</div><div class="extended-buttons"><button id="record-panel-button" class="secondary-action">Registro científico</button><button id="analysis-panel-button" class="secondary-action">NISP · MNE · MNI</button><button id="compare-panel-button" class="secondary-action">Comparar perfiles</button><button id="learning-panel-button" class="secondary-action">Aprendizaje</button><button id="sources-panel-button" class="secondary-action">Fuentes y licencias</button></div><div id="extended-panel" hidden></div></div>`);
  inspector.querySelector('.extended-buttons').insertAdjacentHTML('beforeend', '<button id="hierarchy-panel-button" class="secondary-action">Jerarquía del proyecto</button><button id="changes-panel-button" class="secondary-action">Registro de cambios</button><button id="indeterminate-fragments-button" class="secondary-action">Fragmentos indeterminados</button>');

  const language = document.querySelector('#language');
  language.value = state.language;
  language.onchange = () => { state.language = language.value; document.documentElement.lang = state.language; updateLabels(); selectBone(state.selected); const selected=bones.find(bone=>bone.id===state.selected); const heading=document.querySelector('#details h2'); if(selected&&heading)heading.textContent=state.language==='en'?selected.en:selected.es; renderList(); renderStats(); const table=document.querySelector('#inventory-table'); if(table && !table.hidden){ document.querySelector('#show-table')?.click(); document.querySelector('#show-table')?.click(); const labels=state.language==='en'?{present:'Present',absent:'Absent',fragmentary:'Fragmentary',indeterminate:'Indeterminate',not_observable:'Not observable',not_recorded:'Not recorded'}:{present:'Presente',absent:'Ausente',fragmentary:'Fragmentario',indeterminate:'Indeterminado',not_observable:'No observable',not_recorded:'No registrado'}; table.querySelectorAll('[data-row-status] option').forEach(option=>{option.textContent=labels[option.value]||option.textContent;}); } saveLocal(); };
  const updateLabels = () => {
    const label = key => translate(state.language, key);
    const setText = (selector, key) => { const element = document.querySelector(selector); if (element) element.textContent = label(key); };
    setText('#save', 'save');
    setText('#backup-project', 'backup');
    setText('#share-project', 'share');
    setText('#import-project', 'import');
    const tabs = [['#tab-sheet', 'sheet'], ['#tab-inventory', 'inventory'], ['#tab-dental', 'dental'], ['#tab-metrics', 'metrics'], ['#tab-stats', 'stats'], ['#tab-report', 'report']];
    tabs.forEach(([selector, key]) => setText(selector, key));
    const dentalLabels = state.language === 'en' ? { present: '✓ Present', absent_am: 'Absent AM', absent_pm: 'Absent PM', unerupted: 'Unerupted', developing: 'Developing', caries: 'Caries', wear: 'Wear', fragmented: 'Fragmented', pathology: 'Pathology', not_observable: 'Not observable' } : { present: '✓ Presente', absent_am: 'Ausente AM', absent_pm: 'Ausente PM', unerupted: 'No erupcionado', developing: 'En formación', caries: 'Caries', wear: 'Desgaste', fragmented: 'Fragmentado', pathology: 'Patología', not_observable: 'No observable' };
    document.querySelectorAll('[data-dental]').forEach(button => { button.textContent = dentalLabels[button.dataset.dental] || button.textContent; });
    setText('#record-panel-button', 'scientificRecord');
    setText('#analysis-panel-button', 'analysis');
    setText('#compare-panel-button', 'compare');
    setText('#learning-panel-button', 'learning');
    setText('#changes-panel-button', 'changes');
    setText('#indeterminate-fragments-button', 'indeterminateFragments');
    setText('#sources-panel-button', 'sources');
    setText('#hierarchy-panel-button', state.language === 'en' ? 'Project hierarchy' : 'Jerarquía del proyecto');
    setText('#reset', 'reset');
    setText('#isolate', 'isolate');
    setText('#center', 'center');
    [['#new-project', 'newProject'], ['#model-package-remove', 'removePackage'], ['#pwa-diagnostics-refresh', 'refreshPwa'], ['#mark-remaining-absent', 'markAbsent'], ['#show-table', 'showTable'], ['#export-json', 'exportJson'], ['#export-csv', 'exportCsv'], ['#save-metrics', 'saveMetrics'], ['#add-landmark', 'addLandmark'], ['#clear-filters', 'clearFilters'], ['#save-report', 'saveReport'], ['#print-report', 'printReport']].forEach(([selector, key]) => setText(selector, key));
    [['#install-app', 'installPwa'], ['.pwa-update-label', 'newVersion'], ['#update-app', 'updateNow'], ['#dismiss-update', 'later']].forEach(([selector, key]) => setText(selector, key));
    [['[data-view="front"]', 'previous'], ['[data-view="back"]', 'next'], ['[data-view="left"]', 'left'], ['[data-view="right"]', 'right']].forEach(([selector, key]) => setText(selector, key));
  };
  updateLabels();

  const panel = document.querySelector('#extended-panel');
  const hidePanels = () => { panel.hidden = true; document.querySelectorAll('.tabs button').forEach(button => button.classList.remove('active')); };
  document.querySelectorAll('.tabs button').forEach(button => button.addEventListener('click', () => { panel.hidden = true; }));
  const show = html => { panel.hidden = false; panel.innerHTML = html; panel.scrollIntoView({ block: 'nearest' }); };

  document.querySelector('#record-panel-button').onclick = () => {
    const id = state.selected;
    const bone = bones.find(item => item.id === id) || {};
    const portionOptions = portionOptionsForBone(bone);
    const taphonomy = (state.taphonomy[id] || []).join(', ');
    const pathology = (state.pathology[id] || []).join(', ');
    show(`<div class="record-editor"><strong>${escapeHtml(bone.es || id)}</strong><label>Número de fragmentos<input id="record-fragments" type="number" min="0" step="1" value="${state.fragments[id] ?? ''}"></label><label>Peso (g)<input id="record-weight" type="number" min="0" step="0.01" value="${state.weights[id] ?? ''}"></label><label>Porción anatómica<select id="record-portion">${portionOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label><label>Individuo<input id="record-individual" value="${escapeHtml(state.individuals[id] || state.report?.individual || 'IND-LOCAL')}" placeholder="IND-01"></label><label>Tafonomía<input id="record-taphonomy" list="taphonomy-options" value="${escapeHtml(taphonomy)}" placeholder="erosión, raíces…"><datalist id="taphonomy-options">${TAPHONOMY_OPTIONS.map(value => `<option value="${value}">`).join('')}</datalist></label><label>Patología / trauma<input id="record-pathology" value="${escapeHtml(pathology)}" placeholder="fractura, caries…"></label><label>Nota científica<textarea id="record-note" rows="3">${escapeHtml(state.notes[id] || '')}</textarea></label><button id="save-record" class="secondary-action">Guardar registro</button></div>`);
    document.querySelector('#record-weight').insertAdjacentHTML('afterend', `<select id="record-weight-unit" aria-label="Unidad del peso"><option value="g">g</option><option value="kg">kg</option></select>`);
    document.querySelector('#record-weight-unit').value = state.weightUnits?.[id] === 'kg' ? 'kg' : 'g';
    document.querySelector('#record-weight').value = state.weights[id] == null ? '' : state.weights[id] / (state.weightUnits?.[id] === 'kg' ? 1000 : 1);
    const pathologyDetails = state.pathologyDetails[id] || {};
    const taphonomyDetails = state.taphonomyDetails[id] || {};
    document.querySelector('#record-taphonomy').insertAdjacentHTML('afterend', `<fieldset class="structured-observation"><legend>Detalle tafonómico</legend><label>Tipo<select id="record-taphonomy-type">${TAPHONOMY_OPTIONS.map(value => `<option value="${value}">${value}</option>`).join('')}</select></label><label>Descripción<textarea id="record-taphonomy-description" rows="2">${escapeHtml(taphonomyDetails.description || '')}</textarea></label><label>Posición<input id="record-taphonomy-position" value="${escapeHtml(taphonomyDetails.position || '')}" placeholder="proximal, cara anterior…"></label><label>Extensión<input id="record-taphonomy-extent" value="${escapeHtml(taphonomyDetails.extent || '')}" placeholder="localizada, 20 mm…"></label><label>Observaciones<textarea id="record-taphonomy-observations" rows="2">${escapeHtml(taphonomyDetails.observations || '')}</textarea></label></fieldset>`);
    document.querySelector('#record-taphonomy-type').value = taphonomyDetails.type || TAPHONOMY_OPTIONS[0];
    document.querySelector('#record-pathology').insertAdjacentHTML('afterend', `<fieldset class="structured-observation"><legend>Detalle patología / trauma</legend><label>Estado<select id="record-pathology-type">${PATHOLOGY_TYPES.map(value => `<option value="${value}">${value}</option>`).join('')}</select></label><label>Descripción<textarea id="record-pathology-description" rows="2">${escapeHtml(pathologyDetails.description || '')}</textarea></label><label>Posición<input id="record-pathology-position" value="${escapeHtml(pathologyDetails.position || '')}" placeholder="proximal, cara anterior…"></label><label>Extensión<input id="record-pathology-extent" value="${escapeHtml(pathologyDetails.extent || '')}" placeholder="localizada, 20 mm…"></label><label>Observaciones<textarea id="record-pathology-observations" rows="2">${escapeHtml(pathologyDetails.observations || '')}</textarea></label></fieldset>`);
    document.querySelector('#record-pathology-type').value = pathologyDetails.type || 'Indeterminado';
    document.querySelector('#record-portion').value = state.portions[id] || 'whole';
    if (state.locked?.[id]) {
      document.querySelectorAll('.record-editor input, .record-editor select, .record-editor textarea, #save-record').forEach(control => { control.disabled = true; });
      document.querySelector('.record-editor').insertAdjacentHTML('afterbegin', '<p role="status">Registro bloqueado. Desbloquéalo desde Inventario para editarlo.</p>');
    }
    document.querySelector('#save-record').onclick = async () => {
      if (state.locked?.[id]) { document.querySelector('#toast').textContent = 'Registro bloqueado'; return; }
      for (const input of document.querySelectorAll('.record-editor input')) if (!input.reportValidity()) return;
      commitInventoryEdit('scientific_record', () => {
      const fragmentText = document.querySelector('#record-fragments').value.trim();
      if (fragmentText) state.fragments[id] = Number(fragmentText); else delete state.fragments[id];
      const weightText = document.querySelector('#record-weight').value.trim();
      const weight = weightText === '' ? NaN : Number(weightText);
      if (Number.isFinite(weight) && weight >= 0) { const unit = normalizeWeightUnit(document.querySelector('#record-weight-unit').value); state.weights[id] = weight * (unit === 'kg' ? 1000 : 1); state.weightUnits[id] = unit; }
      else { delete state.weights[id]; delete state.weightUnits[id]; }
      state.portions[id] = document.querySelector('#record-portion').value;
      state.individuals[id] = document.querySelector('#record-individual').value.trim() || 'IND-LOCAL';
      state.taphonomy[id] = document.querySelector('#record-taphonomy').value.split(',').map(value => value.trim()).filter(Boolean);
      state.pathology[id] = document.querySelector('#record-pathology').value.split(',').map(value => value.trim()).filter(Boolean);
      const taphonomyDetail = { type: document.querySelector('#record-taphonomy-type')?.value || TAPHONOMY_OPTIONS[0], description: document.querySelector('#record-taphonomy-description')?.value.trim() || '', position: document.querySelector('#record-taphonomy-position')?.value.trim() || '', extent: document.querySelector('#record-taphonomy-extent')?.value.trim() || '', observations: document.querySelector('#record-taphonomy-observations')?.value.trim() || '' };
      const pathologyDetail = { type: document.querySelector('#record-pathology-type')?.value || 'Indeterminado', description: document.querySelector('#record-pathology-description')?.value.trim() || '', position: document.querySelector('#record-pathology-position')?.value.trim() || '', extent: document.querySelector('#record-pathology-extent')?.value.trim() || '', observations: document.querySelector('#record-pathology-observations')?.value.trim() || '' };
      const hasTaphonomyDetail = taphonomyDetail.type !== TAPHONOMY_OPTIONS[0] || Object.values(taphonomyDetail).some(value => value && value !== TAPHONOMY_OPTIONS[0]);
      const hasPathologyDetail = pathologyDetail.type !== 'Indeterminado' || Object.values(pathologyDetail).some(value => value && value !== 'Indeterminado');
      if (hasTaphonomyDetail) state.taphonomyDetails[id] = taphonomyDetail; else delete state.taphonomyDetails[id];
      if (hasPathologyDetail) state.pathologyDetails[id] = pathologyDetail; else delete state.pathologyDetails[id];
      state.notes[id] = document.querySelector('#record-note').value.trim();
      });
      renderStats?.(); selectBone(state.selected);
      const saved = await saveLocal();
      if (saved.ok) document.querySelector('#toast').textContent = 'Registro científico guardado';
    };
  };

  document.querySelector('#analysis-panel-button').onclick = () => {
    const analysis = calculateOsteoAnalysis(bones, state);
    const individualRows = analysis.individuals.rows.length ? analysis.individuals.rows.map(row => `<tr><td>${escapeHtml(row.individual)}</td><td>${row.nisp}</td><td>${row.fragments}</td><td>${row.elements.length}</td></tr>`).join('') : '<tr><td colspan="4">Sin registros identificados</td></tr>';
    show(`<div class="analysis-summary"><div><strong>${analysis.nisp.value}</strong><small>NISP</small></div><div><strong>${analysis.mne.value}</strong><small>MNE</small></div><div><strong>${analysis.mni.value}</strong><small>MNI</small></div><div><strong>${analysis.individuals.value}</strong><small>Individuos</small></div></div><dl class="analysis-method"><dt>NISP</dt><dd>${escapeHtml(analysis.nisp.method)}</dd><dt>MNE</dt><dd>${escapeHtml(analysis.mne.method)}</dd><dt>MNI</dt><dd>${escapeHtml(analysis.mni.method)}</dd><dt>Individuos</dt><dd>${escapeHtml(analysis.individuals.method)}</dd></dl><table class="analysis-table"><thead><tr><th>Individuo</th><th>NISP</th><th>Fragmentos</th><th>Elementos</th></tr></thead><tbody>${individualRows}</tbody></table><button id="export-analysis" class="secondary-action">Exportar análisis JSON</button>`);
    document.querySelector('#export-analysis').onclick = () => downloadJson('osteo3d-analysis.json', analysis);
    const contextRows = Object.entries(analysis.nisp.byContext).map(([context, count]) => `<tr><td>${escapeHtml(context)}</td><td>${count}</td></tr>`).join('') || '<tr><td colspan="2">Sin registros identificados</td></tr>';
    document.querySelector('#export-analysis').insertAdjacentHTML('beforebegin', `<p class="info-box">Cálculos automáticos provisionales: NISP cuenta registros, no todos los especímenes de una ficha agrupada. MNE/MNI no se obtienen del número de fragmentos. Requieren revisión especializada.</p><details><summary>Revisar valores con justificación</summary>${['nisp','mne','mni'].map(key=>`<label>${key.toUpperCase()}<input id="review-${key}" type="number" min="0" step="1" value="${escapeHtml(state.analysisReview?.[key]?.value??'')}"/><textarea id="review-reason-${key}" placeholder="Método, solapamiento/remontaje, evidencia y responsable">${escapeHtml(state.analysisReview?.[key]?.reason||'')}</textarea></label>`).join('')}<button id="save-analysis-review" type="button">Guardar revisión</button><p id="review-message" role="status"></p></details><h4>NISP por contexto</h4><table class="analysis-table"><thead><tr><th>Contexto / UE</th><th>NISP</th></tr></thead><tbody>${contextRows}</tbody></table>`);
    document.querySelector('#save-analysis-review').onclick=async()=>{
      const next={};
      for(const key of ['nisp','mne','mni']){
        const raw=document.querySelector(`#review-${key}`).value.trim(),reason=document.querySelector(`#review-reason-${key}`).value.trim();
        if(!raw)continue;
        const value=Number(raw);
        if(!Number.isInteger(value)||value<0||!reason){document.querySelector('#review-message').textContent='Cada valor requiere un entero no negativo y una justificación.';return;}
        next[key]={value,reason,updatedAt:new Date().toISOString(),signature:JSON.stringify(calculateOsteoAnalysis(bones,state).rows)};
      }
       commitInventoryEdit('manual_analysis_review',()=>{ state.analysisReview=next; });
       await saveLocal();document.querySelector('#analysis-panel-button').click();
    };
  };

  document.querySelector('#compare-panel-button').onclick = () => {
    show(`<label>Perfil anatómico de referencia<select id="compare-profile"><option value="adult_male">Adulto masculino</option><option value="adult_female">Adulto femenino</option><option value="infant">Infante</option><option value="neonate">Neonato</option></select></label><button id="compare-3d-toggle" class="secondary-action" aria-pressed="false">Mostrar comparación 3D</button><label>Inventario local a comparar<select id="compare-project"><option value="">Cargando proyectos…</option></select></label><label>Filtrar comparación por individuo/contexto/UE/campaña<select id="compare-scope"><option value="">Todos los registros</option></select></label><div class="compare-card"><strong>Perfil actual:</strong> ${escapeHtml(document.querySelector('#profile').selectedOptions[0].textContent)}<br><strong>Perfil comparado:</strong> <span id="compare-label">Adulto masculino</span><p>La referencia 3D es geométrica hasta incorporar GLB anatómicos documentados. La comparación conserva IDs osteológicos y separa los datos científicos de la visualización.</p></div><div id="compare-inventory" class="compare-inventory" aria-live="polite"></div>`);
    const select = document.querySelector('#compare-profile');
    const compare3d=document.querySelector('#compare-3d-toggle');
    compare3d.onclick=()=>{const active=compare3d.getAttribute('aria-pressed')!=='true';compare3d.setAttribute('aria-pressed',String(active));compare3d.textContent=active?'Ocultar comparación 3D':'Mostrar comparación 3D';window.dispatchEvent(new CustomEvent('oste3d:compare-profile',{detail:{profileId:active?select.value:''}}));};
    select.onchange = () => { document.querySelector('#compare-label').textContent = select.selectedOptions[0].textContent; if(compare3d.getAttribute('aria-pressed')==='true')window.dispatchEvent(new CustomEvent('oste3d:compare-profile',{detail:{profileId:select.value}})); };
    const projectSelect = document.querySelector('#compare-project');
    const scopeSelect = document.querySelector('#compare-scope');
    const comparison = document.querySelector('#compare-inventory');
    const comparisonIdentity = project => {
      const report = project?.report || {};
      return {
        individual: report.individual || 'IND-LOCAL',
        context: report.context || '—',
        ue: report.ue || '—',
        campaign: report.campaign || '—'
      };
    };
    const portionSummary = records => Object.entries(records || {}).map(([key, record]) => {
      const details = [key, record?.status || 'not_recorded'];
      if (record?.completeness != null) details.push(`${record.completeness}%`);
      if (record?.fragments != null) details.push(`${record.fragments} frag.`);
      return details.join(' · ');
    }).join('; ');
    const comparisonScopeMatches = (scope, current, other, currentIdentity, otherIdentity) => {
      if (!scope) return true;
      let parsed;
      try { parsed = JSON.parse(scope); } catch { return true; }
      const [field, value] = parsed;
      if (field === 'individual' || field === 'ue') return current[field] === value || other[field] === value;
      if (field === 'context' || field === 'campaign') return currentIdentity[field] === value || otherIdentity[field] === value;
      return true;
    };
    const populateComparisonScopes = project => {
      const values = new Map();
      const add = (field, value) => { const normalized = String(value || '').trim(); if (normalized && normalized !== '—') values.set(JSON.stringify([field, normalized]), `${field === 'individual' ? 'Individuo' : field === 'ue' ? 'UE' : field === 'context' ? 'Contexto' : 'Campaña'}: ${normalized}`); };
      const currentIdentity = comparisonIdentity(state), otherIdentity = comparisonIdentity(project);
      add('individual', currentIdentity.individual); add('individual', otherIdentity.individual); add('context', currentIdentity.context); add('context', otherIdentity.context); add('campaign', currentIdentity.campaign); add('campaign', otherIdentity.campaign); add('ue', currentIdentity.ue); add('ue', otherIdentity.ue);
      bones.forEach(bone => { add('individual', state.individuals?.[bone.id]); add('individual', project?.individuals?.[bone.id]); add('ue', state.ue?.[bone.id]); add('ue', project?.ue?.[bone.id]); });
      const selected = scopeSelect.value;
      scopeSelect.innerHTML = '<option value="">Todos los registros</option>' + [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
      if ([...scopeSelect.options].some(option => option.value === selected)) scopeSelect.value = selected;
    };
    const renderComparison = project => {
      if (!project) { comparison.innerHTML = '<p class="small-copy">No hay otro proyecto local disponible para comparar.</p>'; return; }
      const currentIdentity = comparisonIdentity(state);
      const otherIdentity = comparisonIdentity(project);
      const numericRecord = (records, id) => records?.[id] == null || !Number.isFinite(Number(records[id])) ? null : Number(records[id]);
      const displayNumeric = (value, suffix = '') => value == null ? '—' : `${value}${suffix}`;
      const scopedBones = bones.filter(bone => {
        const current = { individual: state.individuals?.[bone.id] || currentIdentity.individual, ue: state.ue?.[bone.id] || currentIdentity.ue };
        const other = { individual: project.individuals?.[bone.id] || otherIdentity.individual, ue: project.ue?.[bone.id] || otherIdentity.ue };
        return comparisonScopeMatches(scopeSelect.value, current, other, currentIdentity, otherIdentity);
      });
      const differences = scopedBones.map(bone => {
        const current = { status: state.status?.[bone.id] || 'not_recorded', completeness: numericRecord(state.completeness, bone.id), preservation: state.preservation?.[bone.id] || 'not_evaluated', fragments: numericRecord(state.fragments, bone.id), taphonomy: (state.taphonomy?.[bone.id] || []).join(', '), pathology: (state.pathology?.[bone.id] || []).join(', '), portion: state.portions?.[bone.id] || 'whole', portionRecords: portionSummary(state.portionRecords?.[bone.id]), individual: state.individuals?.[bone.id] || currentIdentity.individual, ue: state.ue?.[bone.id] || currentIdentity.ue };
        const other = { status: project.status?.[bone.id] || 'not_recorded', completeness: numericRecord(project.completeness, bone.id), preservation: project.preservation?.[bone.id] || 'not_evaluated', fragments: numericRecord(project.fragments, bone.id), taphonomy: (project.taphonomy?.[bone.id] || []).join(', '), pathology: (project.pathology?.[bone.id] || []).join(', '), portion: project.portions?.[bone.id] || 'whole', portionRecords: portionSummary(project.portionRecords?.[bone.id]), individual: project.individuals?.[bone.id] || otherIdentity.individual, ue: project.ue?.[bone.id] || otherIdentity.ue };
        const changed = Object.keys(current).some(key => current[key] !== other[key]);
        return changed ? { bone, current, other } : null;
      }).filter(Boolean);
      const identityLabel = identity => `Individuo: ${escapeHtml(identity.individual)} · Contexto: ${escapeHtml(identity.context)} · UE: ${escapeHtml(identity.ue)} · Campaña: ${escapeHtml(identity.campaign)}`;
      const rows = differences.map(({ bone, current, other }) => `<tr><th scope="row">${escapeHtml(bone.es)}</th><td><strong>Individuo:</strong> ${escapeHtml(current.individual)}<br><strong>UE:</strong> ${escapeHtml(current.ue)}<br>Estado: ${escapeHtml(current.status)} · ${escapeHtml(displayNumeric(current.completeness, '%'))} · ${escapeHtml(current.preservation)} · ${escapeHtml(displayNumeric(current.fragments, ' frag.'))}<br>Porción: ${escapeHtml(current.portion)}${current.portionRecords ? `<br>Porciones independientes: ${escapeHtml(current.portionRecords)}` : ''}<br>Tafonomía: ${escapeHtml(current.taphonomy || '—')}<br>Patología: ${escapeHtml(current.pathology || '—')}</td><td><strong>Individuo:</strong> ${escapeHtml(other.individual)}<br><strong>UE:</strong> ${escapeHtml(other.ue)}<br>Estado: ${escapeHtml(other.status)} · ${escapeHtml(displayNumeric(other.completeness, '%'))} · ${escapeHtml(other.preservation)} · ${escapeHtml(displayNumeric(other.fragments, ' frag.'))}<br>Porción: ${escapeHtml(other.portion)}${other.portionRecords ? `<br>Porciones independientes: ${escapeHtml(other.portionRecords)}` : ''}<br>Tafonomía: ${escapeHtml(other.taphonomy || '—')}<br>Patología: ${escapeHtml(other.pathology || '—')}</td></tr>`).join('');
      comparison.innerHTML = `<p><strong>${differences.length}</strong> de ${scopedBones.length} elementos filtrados con diferencias frente a <strong>${escapeHtml(project.projectName || project.id)}</strong>.</p><div class="compare-card"><strong>Proyecto actual:</strong> ${identityLabel(currentIdentity)}<br><strong>Proyecto comparado:</strong> ${identityLabel(otherIdentity)}</div><p class="small-copy">Campos comparados: individuo, contexto/UE/campaña, representación (estado y porcentaje), conservación, fragmentación, porción, porciones independientes, tafonomía y patología/trauma.</p>${rows ? `<table class="analysis-table"><thead><tr><th>Elemento</th><th>Proyecto actual · individuo/UE</th><th>Proyecto comparado · individuo/UE</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="small-copy">No se han detectado diferencias en los campos comparados.</p>'}`;
    };
    if (!listProjects || !loadProject) { renderComparison(null); return; }
    listProjects().then(projects => {
      const candidates = projects.filter(project => project.id !== state.projectId);
      projectSelect.innerHTML = candidates.length ? candidates.map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.projectName || project.id)}</option>`).join('') : '<option value="">Sin otro proyecto</option>';
      const first = candidates[0];
      populateComparisonScopes(first);
      renderComparison(first);
      scopeSelect.onchange = () => renderComparison(candidates.find(project => project.id === projectSelect.value) || null);
      projectSelect.onchange = async () => { const project = await loadProject(projectSelect.value); populateComparisonScopes(project); renderComparison(project); };
    }).catch(() => { projectSelect.innerHTML = '<option value="">No disponible</option>'; renderComparison(null); });
  };

  let learningSession = { mode: 'identify', targetBoneId: '' };
  window.addEventListener('oste3d:bone-selected', event => {
    if (learningSession.mode !== 'locate' || !learningSession.targetBoneId) return;
    const feedback = document.querySelector('#quiz-feedback');
    const target = bones.find(item => item.id === learningSession.targetBoneId);
    if (!feedback || !target) return;
    const en = state.language === 'en';
    feedback.textContent = event.detail?.boneId === learningSession.targetBoneId ? (en ? 'Correct' : 'Correcto') : (en ? `Try again: locate ${target.en}` : `Inténtalo de nuevo: localiza ${target.es}`);
  });
  document.querySelector('#learning-panel-button').onclick = () => {
    let level = 'basic';
    let mode = 'identify';
    const nextQuestion = () => {
      const en = state.language === 'en';
      const bone = bones[Math.floor(Math.random() * bones.length)];
      const optionCount = level === 'advanced' ? 5 : level === 'intermediate' ? 4 : 3;
      const options = [bone, ...bones.filter(item => item.id !== bone.id).sort(() => Math.random() - 0.5).slice(0, optionCount - 1)].sort(() => Math.random() - 0.5);
      learningSession = { mode, targetBoneId: bone.id };
      const modeLabel = mode === 'locate' ? (en ? 'Locate bone' : 'Localizar hueso') : (en ? 'Identify bone' : 'Identificar hueso');
      const prompt = mode === 'locate' ? (en ? `Touch ${bone.en} in the 3D viewer.` : `Toca ${bone.es} en el visor 3D.`) : (en ? 'Select the answer for the highlighted element.' : 'Selecciona la respuesta para el elemento resaltado.');
      const answerOptions = mode === 'locate' ? '' : `<div class="quiz-options">${options.map(option => `<button data-answer="${escapeHtml(option.id)}">${escapeHtml(en ? option.en : option.es)}</button>`).join('')}</div>`;
      show(`<div class="quiz-card"><strong>${modeLabel}</strong><label>${en ? 'Mode' : 'Modo'}<select id="quiz-mode"><option value="identify">${en ? 'Identify bone' : 'Identificar hueso'}</option><option value="locate">${en ? 'Locate bone' : 'Localizar hueso'}</option><option value="quiz">Quiz</option></select></label><label>${en ? 'Level' : 'Nivel'}<select id="quiz-level"><option value="basic">${en ? 'Basic' : 'Básico'}</option><option value="intermediate">${en ? 'Intermediate' : 'Intermedio'}</option><option value="advanced">${en ? 'Advanced' : 'Avanzado'}</option></select></label><p>${prompt}</p>${answerOptions}<p id="quiz-feedback" class="small-copy" aria-live="polite"></p><button id="next-question" class="secondary-action">${en ? 'New question' : 'Nueva pregunta'}</button><button id="close-learning" class="secondary-action">${en ? 'Exit learning' : 'Salir del aprendizaje'}</button></div>`);
      document.querySelector('#quiz-mode').value = mode;
      document.querySelector('#quiz-level').value = level;
      document.querySelector('#quiz-mode').onchange = event => { mode = event.target.value; nextQuestion(); };
      document.querySelector('#quiz-level').onchange = event => { level = event.target.value; nextQuestion(); };
      if (mode !== 'locate') selectBone(bone.id);
      document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => { document.querySelector('#quiz-feedback').textContent = button.dataset.answer === bone.id ? (en ? 'Correct' : 'Correcto') : `${en ? 'Correct answer' : 'Respuesta correcta'}: ${en ? bone.en : bone.es}`; });
      document.querySelector('#next-question').onclick = nextQuestion;
      document.querySelector('#close-learning').onclick = () => { learningSession = { mode: 'identify', targetBoneId: '' }; panel.hidden = true; document.querySelector('#details').hidden = false; };
    };
    document.querySelector('#details').hidden = true;
    nextQuestion();
  };
  document.querySelectorAll('.tabs button').forEach(button => button.addEventListener('click', () => { learningSession = { mode: 'identify', targetBoneId: '' }; document.querySelector('#details').hidden = false; }));

  document.querySelector('#backup-project').onclick = async () => {
    try {
      const models = [];
      for (const [profileId, profileModels] of Object.entries(state.customModels || {})) for (const [boneId, metadata] of Object.entries(profileModels || {})) {
        if (metadata?.cached === false) continue;
        const response = await getCachedCustomModelFile(profileId, boneId, metadata.format);
        if (response) models.push({ name: `models/custom/${encodeURIComponent(profileId)}/${encodeURIComponent(boneId)}.${metadata.format}`, data: new Uint8Array(await response.arrayBuffer()) });
      }
      const bytes = await createOsteoArchive(createBackup(state), models);
      downloadBlob(`osteo3d-backup-${new Date().toISOString().slice(0, 10)}.osteo3d`, bytes, 'application/zip');
      document.querySelector('#toast').textContent = models.length ? `Copia completa descargada · ${models.length} modelos personalizados` : 'Copia de datos descargada · sin modelos personalizados en caché';
    } catch (error) { document.querySelector('#toast').textContent = `No se pudo crear la copia: ${error.message}`; }
  };
  document.querySelector('#share-project').onclick = async () => {
    const result = await shareJson(`osteo3d-backup-${new Date().toISOString().slice(0, 10)}.json`, createBackup(state), { title: 'Osteo3D', text: state.language === 'en' ? 'Osteo3D project backup' : 'Copia de proyecto Osteo3D' });
    if (result === 'downloaded') document.querySelector('#toast').textContent = state.language === 'en' ? 'Sharing unavailable · backup downloaded' : 'Compartir no disponible · copia descargada';
  };
  document.querySelector('#import-project').onclick = () => document.querySelector('#import-file').click();
  document.querySelector('#import-file').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let imported;
      let mergeRows = null, mergeExtra = value => value, archiveModels = [];
      const targetProjectId = state.projectId;
      let previewRows = [];
      if (file.name.toLowerCase().endsWith('.osteo3d')) {
        const archive = await readOsteoArchive(await file.arrayBuffer());
        imported = validateBackup(archive.project); archiveModels = archive.models; previewRows = Object.entries(imported.status || {}).map(([boneId, status]) => ({ Bone_ID: boneId, Presence: status, Preservation: imported.preservation?.[boneId] || '', Fragments: imported.fragments?.[boneId] ?? '' }));
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        const rows = parseCsv(await file.text());
        previewRows = rows; mergeRows = rows;
        imported = applyInventoryRows(state, rows, bones);
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer());
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        previewRows = rows; mergeRows = rows;
        imported = applyInventoryRows(state, rows, bones);
        const contextRows = workbook.Sheets['Ficha contexto'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Ficha contexto']) : [];
        const fragmentRows = workbook.Sheets['Fragmentos indeterminados'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Fragmentos indeterminados']) : [];
        const dentalRows = workbook.Sheets['Odontograma permanente'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Odontograma permanente']) : [];
        const hierarchyRows = workbook.Sheets['Jerarquía'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Jerarquía']) : [];
        const deciduousRows = workbook.Sheets['Odontograma deciduo'] ? XLSX.utils.sheet_to_json(workbook.Sheets['Odontograma deciduo']) : [];
        mergeExtra = value => ({
          ...value,
          report: { ...(value.report || {}), ...(contextRows[0] || {}) },
          indeterminateFragments: fragmentRows.length ? fragmentRows : value.indeterminateFragments,
          dental: importDentalRows(value.dental, dentalRows, { locked: value.locked }),
          deciduousDental: importDentalRows(value.deciduousDental, deciduousRows, { deciduous: true, locked: value.locked }),
          hierarchy: hierarchyRows.length ? normalizeHierarchy(Object.fromEntries(HIERARCHY_LEVELS.map(level => [level, hierarchyRows.filter(row => row.Level === level).map(row => ({ id: row.ID, name: row.Name, parentId: row.Parent_ID, updatedAt: row.Updated_at }))])) ) : value.hierarchy
        });
        imported = mergeAuxiliaryXlsx(mergeExtra(imported), workbook, XLSX, bones);
      } else {
        imported = validateBackup(JSON.parse(await file.text()));
        previewRows = Object.entries(imported.status || {}).map(([boneId, status]) => ({ Bone_ID: boneId, Presence: status, Preservation: imported.preservation?.[boneId] || 'not_evaluated', Fragments: imported.fragments?.[boneId] ?? '' }));
      }
      const totalRows = imported.importedRows == null ? previewRows.length : imported.importedRows + (imported.rejectedRows || 0);
      const validationSummary = imported.validationErrors?.length ? `<ul class="small-copy import-validation-errors">${imported.validationErrors.slice(0, 5).map(item => `<li>Fila ${item.row}: ${escapeHtml(item.errors.join('; '))}</li>`).join('')}</ul>` : '';
      const sample = previewRows.slice(0, 5).map(row => `<tr>${['Bone_ID', 'Presence', 'Preservation', 'Fragments'].map(field => `<td>${escapeHtml(row[field] ?? '')}</td>`).join('')}</tr>`).join('');
      show(`<h3>Vista previa de importación</h3><p class="small-copy"><strong>${escapeHtml(file.name)}</strong> · ${totalRows} registros${archiveModels.length ? ` · ${archiveModels.length} modelos personalizados` : ''}${imported.rejectedRows ? ` · ${imported.rejectedRows} se ignorarán por errores, duplicados o IDs desconocidos` : ''}.</p>${validationSummary}${sample ? `<table class="analysis-table"><thead><tr><th>Bone_ID</th><th>Presencia</th><th>Conservación</th><th>Fragmentos</th></tr></thead><tbody>${sample}</tbody></table>` : '<p class="small-copy">La copia no contiene registros de inventario visibles en la previsualización.</p>'}<div class="actions"><button id="confirm-import" class="secondary-action">Confirmar importación</button><button id="cancel-import" class="secondary-action">Cancelar</button></div>`);
      document.querySelector('#confirm-import').closest('.actions').insertAdjacentHTML('beforebegin', `<p class="info-box">${mergeRows ? 'Fusión: solo se aplican celdas no vacías. Los campos vacíos o las columnas omitidas conservan el valor anterior; los registros bloqueados no cambian. Puedes deshacer la importación desde Inventario. Las hojas auxiliares XLSX de contexto y fragmentos reemplazan esos apartados si contienen datos.' : 'Restauración: se sustituirán los datos de la ficha indicada por la copia, incluidos sus bloqueos. Primero se intentará guardar el proyecto abierto. Los archivos 3D personalizados no están incluidos en esta copia JSON.'}</p>`);
      document.querySelector('#cancel-import').onclick = () => { document.querySelector('#extended-panel').hidden = true; };
      document.querySelector('#confirm-import').onclick = async () => {
        try {
          if (targetProjectId !== state.projectId) throw new Error('El proyecto abierto ha cambiado. Vuelve a abrir el archivo para revisar la importación.');
          document.querySelector('#confirm-import').disabled = true;
          if (mergeRows) {
            // Re-evaluate against current data/locks, never a stale preview snapshot.
            imported = mergeExtra(applyInventoryRows(state, mergeRows, bones));
            const { importedRows, rejectedRows, validationErrors, ...projectData } = imported;
            commitInventoryEdit('spreadsheet_import', () => Object.assign(state, projectData));
          } else {
            if (!(await saveLocal({ notify: false })).ok) { document.querySelector('#confirm-import').disabled = false; return; }
            applyProjectData(imported);
            for (const model of archiveModels) {
              const match = model.name.match(/^models\/custom\/([^/]+)\/([^/.]+)\.([a-z0-9]+)$/i);
              if (!match) continue;
              const [, profileId, boneId, format] = match;
              const metadata = state.customModels?.[profileId]?.[boneId];
              if (!metadata) continue;
              const fileModel = new File([model.data], metadata.fileName || `${boneId}.${format}`, { type: 'application/octet-stream' });
              try { await cacheCustomModelFile(profileId, boneId, fileModel); } catch { /* la copia de datos sí se restaura aunque la caché no admita el binario */ }
            }
          }
          if (imported.id) state.projectId = imported.id;
          if (imported.projectName) state.projectName = imported.projectName;
          language.value = state.language || 'es';
          document.documentElement.lang = state.language || 'es';
          updateLabels();
          renderList(); renderStats?.(); selectBone(state.selected);
          const saved = await saveLocal();
          document.querySelector('#extended-panel').hidden = true;
          if (saved.ok) document.querySelector('#toast').textContent = imported.importedRows == null ? 'Importación completada · copia JSON' : `Importación completada · ${imported.importedRows} registros${imported.rejectedRows ? ` · ${imported.rejectedRows} ignorados` : ''} · disponible Deshacer`;
        } catch (error) {
          document.querySelector('#toast').textContent = `Importación rechazada: ${error.message}`;
          const confirm = document.querySelector('#confirm-import'); if (confirm) confirm.disabled = false;
        }
      };
    } catch (error) { document.querySelector('#toast').textContent = `Importación rechazada: ${error.message}`; }
    event.target.value = '';
  };

  document.querySelector('#changes-panel-button').onclick = () => {
    const entries = [...(state.changeLog || [])].reverse();
    const rows = entries.slice(0, 100).map(entry => { const change = entry.field ? `${entry.field}: ${formatChangeValue(entry.previousValue)} → ${formatChangeValue(entry.newValue)}` : `${formatChangeValue(entry.previousStatus)} → ${formatChangeValue(entry.newStatus)}`; return `<tr><td>${escapeHtml(new Date(entry.changedAt).toLocaleString('es-ES'))}</td><td>${escapeHtml(entry.boneId)}</td><td>${escapeHtml(change)}</td><td>${escapeHtml(entry.individualId)}</td><td>${escapeHtml(entry.investigator || '—')}</td><td>${escapeHtml(entry.method)}</td></tr>`; }).join('');
    show(`<p class="small-copy">Se muestran las últimas ${Math.min(entries.length, 100)} acciones. El registro se conserva en IndexedDB y en las copias de seguridad.</p>${rows ? `<table class="analysis-table"><thead><tr><th>Fecha</th><th>Bone_ID</th><th>Cambio</th><th>Individuo</th><th>Investigador</th><th>Método</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="small-copy">Todavía no hay cambios registrados.</p>'}`);
  };
  document.querySelector('#hierarchy-panel-button').onclick = () => {
    const levelLabels = state.language === 'en' ? { sites: 'Sites', campaigns: 'Campaigns', sectors: 'Sectors', contexts: 'Contexts', individuals: 'Individuals' } : { sites: 'Yacimientos', campaigns: 'Campañas', sectors: 'Sectores', contexts: 'Contextos', individuals: 'Individuos' };
    const hierarchy = normalizeHierarchy(state.hierarchy);
    const options = HIERARCHY_LEVELS.map(level => `<option value="${level}">${levelLabels[level]}</option>`).join('');
    const rows = HIERARCHY_LEVELS.map(level => `<section><h4>${levelLabels[level]} <span class="muted">${hierarchy[level].length}</span></h4>${hierarchy[level].length ? `<ul>${hierarchy[level].map(entity => `<li><strong>${escapeHtml(entity.name)}</strong><small>${escapeHtml(entity.id)}${entity.parentId ? ` · ${escapeHtml(entity.parentId)}` : ''}</small></li>`).join('')}</ul>` : `<p class="small-copy">${state.language === 'en' ? 'No entities registered.' : 'Sin entidades registradas.'}</p>`}</section>`).join('');
    show(`<h3>${state.language === 'en' ? 'Project hierarchy' : 'Jerarquía del proyecto'}</h3><p class="small-copy">${state.language === 'en' ? 'Add entities without deleting existing observations. IDs are stable and can be used by imports and comparisons.' : 'Añade entidades sin borrar observaciones existentes. Los IDs son estables y sirven para importaciones y comparaciones.'}</p><div class="record-editor"><label>${state.language === 'en' ? 'Level' : 'Nivel'}<select id="hierarchy-level">${options}</select></label><label>${state.language === 'en' ? 'Name' : 'Nombre'}<input id="hierarchy-name" placeholder="${state.language === 'en' ? 'e.g. Site North' : 'p. ej. Yacimiento Norte'}"></label><label>${state.language === 'en' ? 'Parent ID (optional)' : 'ID padre (opcional)'}<input id="hierarchy-parent" placeholder="site:yacimiento-norte"></label><button id="add-hierarchy-entity" class="secondary-action">${state.language === 'en' ? 'Add entity' : 'Añadir entidad'}</button><p id="hierarchy-message" role="status"></p></div><div class="hierarchy-grid">${rows}</div>`);
    document.querySelector('#add-hierarchy-entity').onclick = async () => {
      const level = document.querySelector('#hierarchy-level').value, name = document.querySelector('#hierarchy-name').value.trim(), parentId = document.querySelector('#hierarchy-parent').value.trim(), id = hierarchyId(level, name), message = document.querySelector('#hierarchy-message');
      if (!id) { message.textContent = state.language === 'en' ? 'Enter a name.' : 'Introduce un nombre.'; return; }
      if (parentId && !HIERARCHY_LEVELS.some(candidate => hierarchy[candidate].some(entity => entity.id === parentId))) { message.textContent = state.language === 'en' ? 'The parent ID does not exist.' : 'El ID padre no existe.'; return; }
      if (hierarchy[level].some(entity => entity.id === id)) { message.textContent = state.language === 'en' ? 'That entity already exists.' : 'Esa entidad ya existe.'; return; }
      commitInventoryEdit('hierarchy_entity_add', () => { hierarchy[level].push({ id, name, parentId, updatedAt: new Date().toISOString() }); state.hierarchy = normalizeHierarchy(hierarchy); }); await saveLocal({ notify: false }); document.querySelector('#hierarchy-panel-button').click();
    };
  };
  document.querySelector('#sources-panel-button').onclick = () => show('<h3>Fuentes y licencias</h3><p>El perfil adulto masculino publica 179 de 192 elementos GLB. Los 13 marcadores restantes son categorías agregadas o indeterminadas y no representan modelos anatómicos aptos para medición o diagnóstico.</p><p><code>skull.glb</code>: Vladimir Petkovic, Khronos glTF Sample Assets, CC0 1.0 Universal.</p><p>Otros 178 elementos: Open3Dmodel contributors / Open Anatomy lineage, Open3Dmodel / AnatomyTOOL; preparación web por yamz8. Las adaptaciones se distribuyen bajo <a href="./licenses/CC-BY-SA-4.0.txt" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p><p>Adulto femenino, infante y neonato: 179 GLB propios por perfil (537 archivos), Osteo3D contributors, MIT, procedural-1.1.0. Modelos didácticos originales, sin escala métrica ni validación anatómica; no son escaneos.</p><p class="small-copy">Registro completo: <a href="./models/SOURCES.md" target="_blank" rel="noreferrer">Fuentes de modelos</a> · <a href="./LICENSE" target="_blank" rel="noreferrer">Licencia del código</a> · <a href="./THIRD_PARTY_LICENSES.md" target="_blank" rel="noreferrer">Licencias de terceros</a>.</p>');
  document.querySelector('#indeterminate-fragments-button').onclick = () => {
    const render = () => {
      const rows = state.indeterminateFragments.map((item, index) => { const unit=item.weightUnit==='kg'?'kg':'g'; const value=item.weight == null ? null : item.weight/(unit==='kg'?1000:1); return `<li><strong>${escapeHtml(item.type || 'Sin tipo')}</strong> · ${escapeHtml(item.size || 'Tamaño no registrado')} · ${item.quantity || 1} ud. · ${value == null ? 'Peso no registrado' : `${value} ${unit}`}<small>${item.length == null ? 'Longitud —' : `L ${item.length} mm`} · ${item.width == null ? 'Anchura —' : `A ${item.width} mm`} · ${item.thickness == null ? 'Espesor —' : `E ${item.thickness} mm`}<br>${escapeHtml(item.individual || 'Sin individuo')} · ${escapeHtml(item.context || 'Sin contexto')} · ${escapeHtml(item.observations || 'Sin observaciones')}</small><button class="secondary-action" data-remove-indeterminate="${index}">Eliminar</button></li>`; }).join('');
      show(`<h3>Fragmentos indeterminados</h3><p class="small-copy">Registra restos sin identificación anatómica definitiva. La información no se incorpora automáticamente al NISP/MNE/MNI.</p><div class="record-editor"><label>Tipo o descripción<input id="indeterminate-type" placeholder="fragmento cortical, astilla…"></label><label>Tamaño<input id="indeterminate-size" placeholder="pequeño, 35 × 18 mm…"></label><label>Peso (g)<input id="indeterminate-weight" type="number" min="0" step="0.01"></label><label>Individuo / lote<input id="indeterminate-individual" placeholder="IND-LOCAL"></label><label>Contexto<input id="indeterminate-context" placeholder="UE, tumba, nivel…"></label><label>Observaciones<textarea id="indeterminate-observations" rows="3"></textarea></label><button id="add-indeterminate" class="secondary-action">Guardar fragmento</button></div><ul class="indeterminate-list">${rows || '<li class="small-copy">Todavía no hay fragmentos registrados.</li>'}</ul>`);
      document.querySelector('#add-indeterminate').insertAdjacentHTML('beforebegin', '<label>Cantidad<input id="indeterminate-quantity" type="number" min="1" step="1" value="1"></label><label>Longitud (mm)<input id="indeterminate-length" type="number" min="0" step="0.1"></label><label>Anchura (mm)<input id="indeterminate-width" type="number" min="0" step="0.1"></label><label>Espesor (mm)<input id="indeterminate-thickness" type="number" min="0" step="0.1"></label>');
      document.querySelector('#indeterminate-weight').insertAdjacentHTML('afterend', '<select id="indeterminate-weight-unit" aria-label="Unidad del peso"><option value="g">g</option><option value="kg">kg</option></select>');
      document.querySelector('#add-indeterminate').onclick = async () => { const weight = Number(document.querySelector('#indeterminate-weight').value); const weightUnit = normalizeWeightUnit(document.querySelector('#indeterminate-weight-unit').value); const quantity = Number(document.querySelector('#indeterminate-quantity').value); const length = Number(document.querySelector('#indeterminate-length').value); const width = Number(document.querySelector('#indeterminate-width').value); const thickness = Number(document.querySelector('#indeterminate-thickness').value); commitInventoryEdit('indeterminate_fragment_add', () => state.indeterminateFragments.push({ type: document.querySelector('#indeterminate-type').value.trim(), size: document.querySelector('#indeterminate-size').value.trim(), quantity: Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1, weight: Number.isFinite(weight) && weight >= 0 ? weight * (weightUnit === 'kg' ? 1000 : 1) : null, weightUnit, length: Number.isFinite(length) && length >= 0 ? length : null, width: Number.isFinite(width) && width >= 0 ? width : null, thickness: Number.isFinite(thickness) && thickness >= 0 ? thickness : null, individual: document.querySelector('#indeterminate-individual').value.trim(), context: document.querySelector('#indeterminate-context').value.trim(), observations: document.querySelector('#indeterminate-observations').value.trim(), createdAt: new Date().toISOString() })); await saveLocal({ notify: false }); render(); };
      document.querySelectorAll('[data-remove-indeterminate]').forEach(button => button.onclick = async () => { const index = Number(button.dataset.removeIndeterminate); commitInventoryEdit('indeterminate_fragment_remove', () => state.indeterminateFragments.splice(index, 1)); await saveLocal({ notify: false }); render(); });
    };
    render();
  };
  return { hidePanels, updateLabels };
}
