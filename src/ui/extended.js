import { calculateOsteoAnalysis } from '../domain/analysis.js';
import { applyInventoryRows, createBackup, downloadJson, parseCsv, shareJson, validateBackup } from '../domain/backup.js';
import { translate } from '../i18n/translations.js';
import { portionOptionsForBone, portionLabel } from '../domain/portions.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function initExtendedFeatures({ state, bones, saveLocal, selectBone, renderList, renderStats, downloadFile, listProjects, loadProject }) {
  state.fragments ||= {};
  state.portions ||= {};
  state.individuals ||= {};
  state.taphonomy ||= {};
  state.pathology ||= {};
  state.notes ||= {};
  state.indeterminateFragments ||= [];
  state.language ||= 'es';

  const topActions = document.querySelector('.top-actions');
  topActions.insertAdjacentHTML('beforeend', `<label class="language-control">Idioma <select id="language"><option value="es">ES</option><option value="en">EN</option></select></label><button id="backup-project" class="secondary-action">Copia</button><button id="share-project" class="secondary-action">Compartir</button><button id="import-project" class="secondary-action">Importar</button><input id="import-file" type="file" accept=".json,.csv,.xlsx" hidden>`);

  const inspector = document.querySelector('.inspector');
  inspector.insertAdjacentHTML('beforeend', `<div class="extended-tools"><div class="paint-title">ANÁLISIS Y APRENDIZAJE</div><div class="extended-buttons"><button id="record-panel-button" class="secondary-action">Registro científico</button><button id="analysis-panel-button" class="secondary-action">NISP · MNE · MNI</button><button id="compare-panel-button" class="secondary-action">Comparar perfiles</button><button id="learning-panel-button" class="secondary-action">Aprendizaje</button><button id="sources-panel-button" class="secondary-action">Fuentes y licencias</button></div><div id="extended-panel" hidden></div></div>`);
  inspector.querySelector('.extended-buttons').insertAdjacentHTML('beforeend', '<button id="changes-panel-button" class="secondary-action">Registro de cambios</button><button id="indeterminate-fragments-button" class="secondary-action">Fragmentos indeterminados</button>');

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
    setText('#record-panel-button', 'scientificRecord');
    setText('#analysis-panel-button', 'analysis');
    setText('#compare-panel-button', 'compare');
    setText('#learning-panel-button', 'learning');
    setText('#changes-panel-button', 'changes');
    setText('#indeterminate-fragments-button', 'indeterminateFragments');
    setText('#sources-panel-button', 'sources');
    setText('#reset', 'reset');
    setText('#isolate', 'isolate');
    setText('#center', 'center');
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
    show(`<div class="record-editor"><strong>${escapeHtml(bone.es || id)}</strong><label>Número de fragmentos<input id="record-fragments" type="number" min="0" step="1" value="${state.fragments[id] || 0}"></label><label>Peso (g)<input id="record-weight" type="number" min="0" step="0.01" value="${state.weights[id] ?? ''}"></label><label>Porción anatómica<select id="record-portion">${portionOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label><label>Individuo<input id="record-individual" value="${escapeHtml(state.individuals[id] || state.report?.individual || 'IND-LOCAL')}" placeholder="IND-01"></label><label>Tafonomía<input id="record-taphonomy" value="${escapeHtml(taphonomy)}" placeholder="erosión, raíces…"></label><label>Patología / trauma<input id="record-pathology" value="${escapeHtml(pathology)}" placeholder="fractura, caries…"></label><label>Nota científica<textarea id="record-note" rows="3">${escapeHtml(state.notes[id] || '')}</textarea></label><button id="save-record" class="secondary-action">Guardar registro</button></div>`);
    document.querySelector('#record-portion').value = state.portions[id] || 'whole';
    document.querySelector('#save-record').onclick = async () => {
      state.fragments[id] = Math.max(0, Number(document.querySelector('#record-fragments').value || 0));
      const weight = Number(document.querySelector('#record-weight').value);
      if (Number.isFinite(weight) && weight >= 0) state.weights[id] = weight;
      else delete state.weights[id];
      state.portions[id] = document.querySelector('#record-portion').value;
      state.individuals[id] = document.querySelector('#record-individual').value.trim() || 'IND-LOCAL';
      state.taphonomy[id] = document.querySelector('#record-taphonomy').value.split(',').map(value => value.trim()).filter(Boolean);
      state.pathology[id] = document.querySelector('#record-pathology').value.split(',').map(value => value.trim()).filter(Boolean);
      state.notes[id] = document.querySelector('#record-note').value.trim();
      await saveLocal();
      document.querySelector('#toast').textContent = 'Registro científico guardado';
    };
  };

  document.querySelector('#analysis-panel-button').onclick = () => {
    const analysis = calculateOsteoAnalysis(bones, state);
    const individualRows = analysis.individuals.rows.length ? analysis.individuals.rows.map(row => `<tr><td>${escapeHtml(row.individual)}</td><td>${row.nisp}</td><td>${row.fragments}</td><td>${row.elements.length}</td></tr>`).join('') : '<tr><td colspan="4">Sin registros identificados</td></tr>';
    show(`<div class="analysis-summary"><div><strong>${analysis.nisp.value}</strong><small>NISP</small></div><div><strong>${analysis.mne.value}</strong><small>MNE</small></div><div><strong>${analysis.mni.value}</strong><small>MNI</small></div><div><strong>${analysis.individuals.value}</strong><small>Individuos</small></div></div><dl class="analysis-method"><dt>NISP</dt><dd>${escapeHtml(analysis.nisp.method)}</dd><dt>MNE</dt><dd>${escapeHtml(analysis.mne.method)}</dd><dt>MNI</dt><dd>${escapeHtml(analysis.mni.method)}</dd><dt>Individuos</dt><dd>${escapeHtml(analysis.individuals.method)}</dd></dl><table class="analysis-table"><thead><tr><th>Individuo</th><th>NISP</th><th>Fragmentos</th><th>Elementos</th></tr></thead><tbody>${individualRows}</tbody></table><button id="export-analysis" class="secondary-action">Exportar análisis JSON</button>`);
    document.querySelector('#export-analysis').onclick = () => downloadJson('osteo3d-analysis.json', analysis);
  };

  document.querySelector('#compare-panel-button').onclick = () => {
    show(`<label>Perfil anatómico de referencia<select id="compare-profile"><option value="adult_male">Adulto masculino</option><option value="adult_female">Adulto femenino</option><option value="infant">Infante</option><option value="neonate">Neonato</option></select></label><label>Inventario local a comparar<select id="compare-project"><option value="">Cargando proyectos…</option></select></label><div class="compare-card"><strong>Perfil actual:</strong> ${escapeHtml(document.querySelector('#profile').selectedOptions[0].textContent)}<br><strong>Perfil comparado:</strong> <span id="compare-label">Adulto masculino</span><p>La comparación conserva IDs osteológicos y separa los datos científicos de la visualización 3D.</p></div><div id="compare-inventory" class="compare-inventory" aria-live="polite"></div>`);
    const select = document.querySelector('#compare-profile');
    select.onchange = () => { document.querySelector('#compare-label').textContent = select.selectedOptions[0].textContent; };
    const projectSelect = document.querySelector('#compare-project');
    const comparison = document.querySelector('#compare-inventory');
    const renderComparison = project => {
      if (!project) { comparison.innerHTML = '<p class="small-copy">No hay otro proyecto local disponible para comparar.</p>'; return; }
      const differences = bones.map(bone => {
        const current = { status: state.status?.[bone.id] || 'not_recorded', preservation: state.preservation?.[bone.id] || 'not_evaluated', fragments: Number(state.fragments?.[bone.id] || 0), portion: state.portions?.[bone.id] || 'whole' };
        const other = { status: project.status?.[bone.id] || 'not_recorded', preservation: project.preservation?.[bone.id] || 'not_evaluated', fragments: Number(project.fragments?.[bone.id] || 0), portion: project.portions?.[bone.id] || 'whole' };
        const changed = Object.keys(current).some(key => current[key] !== other[key]);
        return changed ? { bone, current, other } : null;
      }).filter(Boolean);
      const rows = differences.map(({ bone, current, other }) => `<tr><th scope="row">${escapeHtml(bone.es)}</th><td>${escapeHtml(current.status)} · ${current.fragments} frag. · ${escapeHtml(current.portion)}</td><td>${escapeHtml(other.status)} · ${other.fragments} frag. · ${escapeHtml(other.portion)}</td></tr>`).join('');
      comparison.innerHTML = `<p><strong>${differences.length}</strong> de ${bones.length} elementos con diferencias frente a <strong>${escapeHtml(project.projectName || project.id)}</strong>.</p>${rows ? `<table class="analysis-table"><thead><tr><th>Elemento</th><th>Proyecto actual</th><th>Proyecto comparado</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="small-copy">No se han detectado diferencias en los campos comparados.</p>'}`;
    };
    if (!listProjects || !loadProject) { renderComparison(null); return; }
    listProjects().then(projects => {
      const candidates = projects.filter(project => project.id !== state.projectId);
      projectSelect.innerHTML = candidates.length ? candidates.map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.projectName || project.id)}</option>`).join('') : '<option value="">Sin otro proyecto</option>';
      const first = candidates[0];
      renderComparison(first);
      projectSelect.onchange = async () => renderComparison(await loadProject(projectSelect.value));
    }).catch(() => { projectSelect.innerHTML = '<option value="">No disponible</option>'; renderComparison(null); });
  };

  document.querySelector('#learning-panel-button').onclick = () => {
    const nextQuestion = () => {
      const bone = bones[Math.floor(Math.random() * bones.length)];
      const options = [bone, ...bones.filter(item => item.id !== bone.id).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
      show(`<div class="quiz-card"><strong>Identificar hueso</strong><p>Selecciona la respuesta para el elemento resaltado.</p><div class="quiz-options">${options.map(option => `<button data-answer="${escapeHtml(option.id)}">${escapeHtml(option.es)}</button>`).join('')}</div><p id="quiz-feedback" class="small-copy"></p><button id="next-question" class="secondary-action">Nueva pregunta</button></div>`);
      selectBone(bone.id);
      document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => { document.querySelector('#quiz-feedback').textContent = button.dataset.answer === bone.id ? 'Correcto' : `Respuesta correcta: ${bone.es}`; });
      document.querySelector('#next-question').onclick = nextQuestion;
    };
    nextQuestion();
  };

  document.querySelector('#backup-project').onclick = () => downloadJson(`osteo3d-backup-${new Date().toISOString().slice(0, 10)}.json`, createBackup(state));
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
      if (file.name.toLowerCase().endsWith('.csv')) {
        const rows = parseCsv(await file.text());
        imported = applyInventoryRows(state, rows, bones);
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer());
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        imported = applyInventoryRows(state, rows, bones);
      } else imported = validateBackup(JSON.parse(await file.text()));
      if (!window.confirm('La importación reemplazará los datos del proyecto actual. ¿Continuar?')) return;
      Object.assign(state, imported);
      if (imported.id) state.projectId = imported.id;
      if (imported.projectName) state.projectName = imported.projectName;
      language.value = state.language || 'es';
      document.documentElement.lang = state.language || 'es';
      updateLabels();
      renderList(); renderStats?.(); selectBone(state.selected); await saveLocal();
      document.querySelector('#toast').textContent = imported.importedRows == null ? 'Importación completada · copia completa' : `Importación completada · ${imported.importedRows} registros${imported.rejectedRows ? ` · ${imported.rejectedRows} ignorados` : ''}`;
    } catch (error) { document.querySelector('#toast').textContent = `Importación rechazada: ${error.message}`; }
    event.target.value = '';
  };

  document.querySelector('#changes-panel-button').onclick = () => {
    const entries = [...(state.changeLog || [])].reverse();
    const rows = entries.slice(0, 100).map(entry => `<tr><td>${escapeHtml(new Date(entry.changedAt).toLocaleString('es-ES'))}</td><td>${escapeHtml(entry.boneId)}</td><td>${escapeHtml(entry.previousStatus)} → ${escapeHtml(entry.newStatus)}</td><td>${escapeHtml(entry.individualId)}</td><td>${escapeHtml(entry.investigator || '—')}</td><td>${escapeHtml(entry.method)}</td></tr>`).join('');
    show(`<p class="small-copy">Se muestran las últimas ${Math.min(entries.length, 100)} acciones. El registro se conserva en IndexedDB y en las copias de seguridad.</p>${rows ? `<table class="analysis-table"><thead><tr><th>Fecha</th><th>Bone_ID</th><th>Cambio</th><th>Individuo</th><th>Investigador</th><th>Método</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="small-copy">Todavía no hay cambios registrados.</p>'}`);
  };
  document.querySelector('#sources-panel-button').onclick = () => show('<h3>Fuentes y licencias</h3><p>Los marcadores geométricos actuales son material de desarrollo y no representan modelos anatómicos aptos para medición o diagnóstico.</p><p>Los perfiles adulto masculino, adulto femenino, infante y neonato permanecen pendientes de incorporar como GLB independientes, con licencia y correspondencia verificada con cada <code>Bone_ID</code>.</p><p>La fuente candidata Z-Anatomy se mantiene documentada, pero no se redistribuye desde esta PWA hasta completar la conversión, la atribución y la cobertura requerida.</p><p class="small-copy">El registro completo está en <a href="https://github.com/JJ-Martinez-Garcia/ArchaeOsteo/blob/main/public/models/SOURCES.md" target="_blank" rel="noreferrer">public/models/SOURCES.md</a>.</p>');
  document.querySelector('#indeterminate-fragments-button').onclick = () => {
    const render = () => {
      const rows = state.indeterminateFragments.map((item, index) => `<li><strong>${escapeHtml(item.type || 'Sin tipo')}</strong> · ${escapeHtml(item.size || 'Tamaño no registrado')} · ${item.weight == null ? 'Peso no registrado' : `${item.weight} g`}<small>${escapeHtml(item.individual || 'Sin individuo')} · ${escapeHtml(item.context || 'Sin contexto')} · ${escapeHtml(item.observations || 'Sin observaciones')}</small><button class="secondary-action" data-remove-indeterminate="${index}">Eliminar</button></li>`).join('');
      show(`<h3>Fragmentos indeterminados</h3><p class="small-copy">Registra restos sin identificación anatómica definitiva. La información no se incorpora automáticamente al NISP/MNE/MNI.</p><div class="record-editor"><label>Tipo o descripción<input id="indeterminate-type" placeholder="fragmento cortical, astilla…"></label><label>Tamaño<input id="indeterminate-size" placeholder="pequeño, 35 × 18 mm…"></label><label>Peso (g)<input id="indeterminate-weight" type="number" min="0" step="0.01"></label><label>Individuo / lote<input id="indeterminate-individual" placeholder="IND-LOCAL"></label><label>Contexto<input id="indeterminate-context" placeholder="UE, tumba, nivel…"></label><label>Observaciones<textarea id="indeterminate-observations" rows="3"></textarea></label><button id="add-indeterminate" class="secondary-action">Guardar fragmento</button></div><ul class="indeterminate-list">${rows || '<li class="small-copy">Todavía no hay fragmentos registrados.</li>'}</ul>`);
      document.querySelector('#add-indeterminate').onclick = async () => { const weight = Number(document.querySelector('#indeterminate-weight').value); state.indeterminateFragments.push({ type: document.querySelector('#indeterminate-type').value.trim(), size: document.querySelector('#indeterminate-size').value.trim(), weight: Number.isFinite(weight) && weight >= 0 ? weight : null, individual: document.querySelector('#indeterminate-individual').value.trim(), context: document.querySelector('#indeterminate-context').value.trim(), observations: document.querySelector('#indeterminate-observations').value.trim(), createdAt: new Date().toISOString() }); await saveLocal({ notify: false }); render(); };
      document.querySelectorAll('[data-remove-indeterminate]').forEach(button => button.onclick = async () => { state.indeterminateFragments.splice(Number(button.dataset.removeIndeterminate), 1); await saveLocal({ notify: false }); render(); });
    };
    render();
  };
  return { hidePanels, updateLabels };
}
