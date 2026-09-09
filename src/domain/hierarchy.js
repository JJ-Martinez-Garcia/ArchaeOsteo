// Canonical project hierarchy. Legacy report fields remain supported, but these
// entities give imports, comparisons and future collection views stable IDs.
export const HIERARCHY_LEVELS = Object.freeze(['sites', 'campaigns', 'sectors', 'contexts', 'individuals']);

const levelPrefixes = { sites: 'site', campaigns: 'campaign', sectors: 'sector', contexts: 'context', individuals: 'individual' };

function entries(value) { return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []; }
function text(value) { return String(value ?? '').trim(); }
export function hierarchyId(level, name) {
  const normalized = text(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return normalized ? `${levelPrefixes[level] || level}:${normalized}` : '';
}

function normalizeEntity(entity, level) {
  const source = entity && typeof entity === 'object' && !Array.isArray(entity) ? entity : {};
  const name = text(source.name || source.label || source.value);
  const id = text(source.id) || hierarchyId(level, name);
  if (!id || !name) return null;
  return { id, name, parentId: text(source.parentId) || '', updatedAt: text(source.updatedAt) || '' };
}

export function normalizeHierarchy(value) {
  const result = Object.fromEntries(HIERARCHY_LEVELS.map(level => [level, []]));
  for (const level of HIERARCHY_LEVELS) {
    const source = Array.isArray(value?.[level]) ? value[level] : [];
    const seen = new Set();
    result[level] = source.map(item => normalizeEntity(item, level)).filter(item => item && !seen.has(item.id) && seen.add(item.id));
  }
  const validIds = new Set(HIERARCHY_LEVELS.flatMap(level => result[level].map(item => item.id)));
  for (const level of HIERARCHY_LEVELS) for (const entity of result[level]) if (entity.parentId && !validIds.has(entity.parentId)) entity.parentId = '';
  return result;
}

function addEntity(target, level, name, parentId = '') {
  const clean = text(name), id = hierarchyId(level, clean);
  if (!id || target[level].some(item => item.id === id)) return id;
  target[level].push({ id, name: clean, parentId: text(parentId), updatedAt: '' });
  return id;
}

export function deriveHierarchy(project) {
  const hierarchy = normalizeHierarchy(project?.hierarchy);
  const report = project?.report && typeof project.report === 'object' ? project.report : {};
  const siteId = addEntity(hierarchy, 'sites', report.site);
  const campaignId = addEntity(hierarchy, 'campaigns', report.campaign, siteId);
  const sectorId = addEntity(hierarchy, 'sectors', report.sector, campaignId);
  const contextId = addEntity(hierarchy, 'contexts', report.context, sectorId);
  addEntity(hierarchy, 'individuals', report.individual, contextId);
  for (const individual of Object.values(project?.individuals || {})) addEntity(hierarchy, 'individuals', individual, contextId);
  for (const context of Object.values(project?.ue || {})) addEntity(hierarchy, 'contexts', context, sectorId);
  return hierarchy;
}

export function hierarchyCounts(hierarchy) {
  const normalized = normalizeHierarchy(hierarchy);
  return Object.fromEntries(HIERARCHY_LEVELS.map(level => [level, normalized[level].length]));
}
