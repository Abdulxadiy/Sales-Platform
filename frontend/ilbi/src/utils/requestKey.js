import { localStore } from './brandStorage.js';
// Keep a failed financial request replayable across modal closes and reloads.
export function getOrCreateRequestKey(storageKey, payload, storage = localStore) {
  const fingerprint = JSON.stringify(payload);
  let previous;
  try { previous = JSON.parse(storage.getItem(storageKey)); } catch { previous = null; }
  if (previous?.fingerprint === fingerprint && previous?.key) return previous.key;
  const key = crypto.randomUUID();
  storage.setItem(storageKey, JSON.stringify({ key, fingerprint }));
  return key;
}
