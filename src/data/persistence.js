import { normalizeProject, saveProject, fallbackProjectKey } from './store.js';

// Immutable snapshots are saved in invocation order, even when IndexedDB is slow.
// Never report success unless a complete project reached a durable browser store.
export function createProjectWriter({ primary = saveProject, storage = () => globalThis.localStorage } = {}) {
  let pending = Promise.resolve();
  return project => {
    let snapshot;
    try {
      snapshot = structuredClone(normalizeProject(project));
      if (!snapshot) throw new Error('Proyecto no válido');
    } catch (error) { return Promise.resolve({ ok: false, backend: null, error }); }
    const run = async () => {
      let backend = 'indexedDB';
      try {
        await primary(snapshot);
        // A previously recovered fallback must not shadow a newer successful save.
        try { storage().removeItem(fallbackProjectKey(snapshot.id)); } catch {}
      } catch (primaryError) {
        try {
          storage().setItem(fallbackProjectKey(snapshot.id), JSON.stringify(snapshot));
          backend = 'localStorage';
        } catch (error) { return { ok: false, backend: null, error, primaryError }; }
      }
      try { storage().setItem('osteo3d-active-project', snapshot.id); } catch {}
      return { ok: true, backend, id: snapshot.id, updatedAt: snapshot.updatedAt };
    };
    const result = pending.then(run, run);
    pending = result.catch(() => {});
    return result;
  };
}
