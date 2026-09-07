import { calculateOsteoAnalysis } from '../domain/analysis.js';
import { applyInventoryRows, createBackup, downloadJson, parseCsv, validateBackup } from '../domain/backup.js';
import { translate } from '../i18n/translations.js';
import { portionOptionsForBone, portionLabel } from '../domain/portions.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function initExtendedFeatures({ state, bones, saveLocal, selectBone, renderList, renderStats, downloadFile }) {
  state.fragments ||= {};
  state.portions ||= {};
  state.individuals ||= {};
  state.taphonomy ||= {};
  state.pathology ||= {};
  state.notes ||= {};
  state.language ||= 'es';

  const topActions = document.querySelector('.top-actions');
  topActions.insertAdjacentHTML('beforeend', `<label class="language-control">Idioma <select id="language"><option value="es">ES</option><option value="en">EN</option></select></label><button id="backup-project" class="secondary-action">Copia</button><button id="import-project" class="secondary-action">Importar</button><input id="import-file" type="file" accept=".json,.csv,.xlsx" hidden>`);

  const inspector = document.querySelector('.inspector');
  inspector.insertAdjacentHTML('beforeend', `<div class="extended-tools"><div class="paint-title">ANÁLISIS Y APRENDIZAJE</div><div class="extended-buttons"><button id="record-panel-button" class="secondary-action">Registro científico</button><button id="analysis-panel-button" class="secondary-action">NISP · MNE · MNI</button><button id="compare-panel-button" class="secondary-action">Comparar perfiles</button><button id="learning-panel-button" class="secondary-action">Aprendizaje</button></div><div id="extended-panel" hidden></div></div>`);

  const language = document.querySelector('#language');
  language.value = state.language;
  language.onchange = () => { state.language = language.value; document.documentElement.lang = state.language; updateLabels(); saveLocal(); };
  const updateLabels = () => {
    document.querySelector('#save').textContent = state.language === 'en' ? 'Save locally' : 'Guardar localmente';
    document.querySelector('#backup-project').textContent = translate(state.language, 'backup');
    document.querySelector('#import-project').textContent = translate(state.language, 'import');
    document.querySelector('#analysis-panel-button').textContent = state.language === 'en' ? 'NISP · MNE · MNI' : 'NISP · MNE · MNI';
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
    show(`<div class="record-editor"><strong>${escapeHtml(bone.es || id)}</strong><label>Número de fragmentos<input id="record-fragments" type="number" min="0" step="1" value="${state.fragments[id] || 0}"></label><label>Porción anatómica<select id="record-portion">${portionOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label><label>Individuo<input id="record-individual" value="${escapeHtml(state.individuals[id] || state.report?.individual || 'IND-LOCAL')}" placeholder="IND-01"></label><label>Tafonomía<input id="record-taphonomy" value="${escapeHtml(taphonomy)}" placeholder="erosión, raíces…"></label><label>Patología / trauma<input id="record-pathology" value="${escapeHtml(pathology)}" placeholder="fractura, caries…"></label><label>Nota científica<textarea id="record-note" rows="3">${escapeHtml(state.notes[id] || '')}</textarea></label><button id="save-record" class="secondary-action">Guardar registro</button></div>`);
    document.querySelector('#record-portion').value = state.portions[id] || 'whole';
    document.querySelector('#save-record').onclick = async () => {
      state.fragments[id] = Math.max(0, Number(document.querySelector('#record-fragments').value || 0));
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
    show(`<label>Perfil de comparación<select id="compare-profile"><option value="adult_male">Adulto masculino</option><option value="adult_female">Adulto femenino</option><option value="infant">Infante</option><option value="neonate">Neonato</option></select></label><div class="compare-card"><strong>Perfil actual:</strong> ${escapeHtml(document.querySelector('#profile').selectedOptions[0].textContent)}<br><strong>Perfil comparado:</strong> <span id="compare-label">Adulto masculino</span><p>La comparación conserva IDs osteológicos y separa escala visual de datos científicos. Los GLB documentados se podrán cargar por perfil cuando estén disponibles.</p></div>`);
    const select = document.querySelector('#compare-profile');
    select.onchange = () => { document.querySelector('#compare-label').textContent = select.selectedOptions[0].textContent; };
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
      renderList(); renderStats?.(); selectBone(state.selected); await saveLocal();
      document.querySelector('#toast').textContent = `Importación completada · ${imported.importedRows ?? 'copia completa'}`;
    } catch (error) { document.querySelector('#toast').textContent = `Importación rechazada: ${error.message}`; }
    event.target.value = '';
  };

  return { hidePanels };
}
