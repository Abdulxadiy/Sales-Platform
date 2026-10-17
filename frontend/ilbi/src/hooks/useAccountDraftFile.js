import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useTenant } from '../context/TenantContext';
import { useToast } from '../context/ToastContext';
import { accountDraftKey } from '../utils/accountDrafts';
import { draftFile } from '../utils/draftFiles';

export function useAccountDraftFile(kind) {
  const { user, isAuthenticated } = useAuth();
  const { activeTenant } = useTenant();
  const toast = useToast();
  const key = accountDraftKey(kind, isAuthenticated ? user?.id : null, activeTenant?.id);
  const [record, setRecord] = useState({ key: null, file: null });
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    const version = revision.current;
    draftFile(key).then(file => {
      if (active && version === revision.current) setRecord({ key, file });
    }).catch(() => { if (active) toast.warning('Qoralama rasmini brauzerdan tiklab bo‘lmadi.'); });
    return () => { active = false; };
  }, [key, toast]);
  const setFile = useCallback(file => {
    if (!key) return;
    revision.current += 1;
    setRecord({ key, file });
    void draftFile(key, file).catch(() => toast.warning('Rasm qoralamaga saqlanmadi. Qayta kirgach rasmni yana tanlash kerak bo‘ladi.'));
  }, [key, toast]);
  return [record.key === key ? record.file : null, setFile];
}
