import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from './useAuth';
import { useTenant } from '../context/TenantContext';
import { useToast } from '../context/ToastContext';
import { accountDraftKey, readAccountDraft, writeAccountDraft } from '../utils/accountDrafts';

function createDraftStore(kind, userId, tenantId, defaultValue) {
  const fallback = () => typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  let value = readAccountDraft(kind, userId, tenantId, fallback());
  const listeners = new Set();
  return {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    snapshot: () => value,
    update(update) {
      if (!accountDraftKey(kind, userId, tenantId)) return true;
      value = typeof update === 'function' ? update(value) : update;
      // Persist before navigation/logout can unmount the form.
      const saved = writeAccountDraft(kind, userId, tenantId, value);
      listeners.forEach(listener => listener());
      return saved;
    },
    fallback,
  };
}

export function useAccountDraft(kind, defaultValue) {
  const { user, isAuthenticated } = useAuth();
  const { activeTenant } = useTenant();
  const toast = useToast();
  const userId = isAuthenticated ? user?.id : null;
  const tenantId = activeTenant?.id;
  const store = useMemo(() => createDraftStore(kind, userId, tenantId, defaultValue), [kind, userId, tenantId, defaultValue]);
  const value = useSyncExternalStore(store.subscribe, store.snapshot);
  const setValue = useCallback(update => {
    if (!store.update(update)) toast.warning('Brauzer qoralamani saqlay olmadi. Sahifani yopishdan oldin ma’lumotlaringizni nusxalang.');
  }, [store, toast]);
  // Keep an empty record after completion; never resurrect the legacy backup.
  const reset = useCallback(() => setValue(store.fallback()), [setValue, store]);
  return [value, setValue, reset];
}
