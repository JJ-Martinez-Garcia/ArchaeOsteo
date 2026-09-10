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

// Build a read-only relational view without changing the canonical flat data.
// Entities whose parent is missing are retained as roots so the view never
// hides imported records merely because a collection was incomplete.
export function hierarchyTree(value) {
  const normalized = normalizeHierarchy(value);
  const byLevel = Object.fromEntries(HIERARCHY_LEVELS.map(level => [level, normalized[level]]));
  const allIds = new Set(HIERARCHY_LEVELS.flatMap(level => byLevel[level].map(entity => entity.id)));
  const childrenOf = (levelIndex, parentId) => {
    const level = HIERARCHY_LEVELS[levelIndex];
    return (byLevel[level] || [])
      .filter(entity => entity.parentId === parentId)
      .map(entity => ({ ...entity, level, children: childrenOf(levelIndex + 1, entity.id) }));
  };
  const roots = [];
  HIERARCHY_LEVELS.forEach((level, levelIndex) => {
    const levelRoots = (byLevel[level] || []).filter(entity => !entity.parentId || !allIds.has(entity.parentId));
    levelRoots.forEach(entity => roots.push({ ...entity, level, children: childrenOf(levelIndex + 1, entity.id) }));
  });
  return roots;
}

export function hierarchyRecordCounts(hierarchy, hierarchyRefs) {
  const normalized = normalizeHierarchy(hierarchy);
  const validIds = new Set(HIERARCHY_LEVELS.flatMap(level => normalized[level].map(entity => entity.id)));
  const fields = { sites: 'siteId', campaigns: 'campaignId', sectors: 'sectorId', contexts: 'contextId', individuals: 'individualId' };
  const counts = Object.fromEntries(HIERARCHY_LEVELS.map(level => [level, Object.fromEntries(normalized[level].map(entity => [entity.id, 0]))]));
  for (const refs of Object.values(hierarchyRefs || {})) for (const level of HIERARCHY_LEVELS) {
    const id = String(refs?.[fields[level]] || '').trim();
    if (validIds.has(id)) counts[level][id] += 1;
  }
  return counts;
}

export function hierarchyInventoryMetrics(hierarchy, hierarchyRefs, status) {
  const normalized = normalizeHierarchy(hierarchy);
  const validIds = new Set(HIERARCHY_LEVELS.flatMap(level => normalized[level].map(entity => entity.id)));
  const fields = { sites: 'siteId', campaigns: 'campaignId', sectors: 'sectorId', contexts: 'contextId', individuals: 'individualId' };
  const metrics = Object.fromEntries(HIERARCHY_LEVELS.map(level => [level, Object.fromEntries(normalized[level].map(entity => [entity.id, { records: 0, reviewed: 0, present: 0 }]))]));
  for (const [boneId, refs] of Object.entries(hierarchyRefs || {})) for (const level of HIERARCHY_LEVELS) {
    const id = String(refs?.[fields[level]] || '').trim();
    if (!validIds.has(id)) continue;
    const metric = metrics[level][id];
    metric.records += 1;
    const value = status?.[boneId] || 'not_recorded';
    if (value !== 'not_recorded') metric.reviewed += 1;
    if (value === 'present') metric.present += 1;
  }
  return metrics;
}
