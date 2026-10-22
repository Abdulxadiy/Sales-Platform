import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { usePersistedState } from '../hooks/usePersistedState';
import { useTenant } from './TenantContext';
import { createVisiblePoller } from '../utils/visiblePolling';
import { workspaceApi } from '../api/workspace';

const WorkspaceContext = createContext({ mode: 'classic', toggleMode: null });

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const [savedMode, setSavedMode] = usePersistedState(`ilbi_workspace_mode:${user?.id || 'guest'}`, 'classic');
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const transition = useRef(null);
  const mode = desktop && savedMode === 'fast' ? 'fast' : 'classic';
  const [reminderState, setReminderState] = useState(null);
  const reminderPoller = useRef(null);
  const reminderCache = useRef(null);
  useEffect(() => {
    if (!activeTenant?.id || user?.role === 'platform_admin') return;
    const tenantId = activeTenant.id;
    let initial = true;
    const poller = createVisiblePoller(async signal => {
      if (initial) {
        initial = false;
        if (reminderCache.current?.tenantId === tenantId && Date.now() - reminderCache.current.fetchedAt < 60000) return;
      }
      try {
        const data = await workspaceApi.reminders('false', signal);
        if (!signal.aborted) {
          reminderCache.current = { tenantId, fetchedAt: Date.now() };
          setReminderState({ tenantId, ...data, error: null });
        }
      } catch (error) {
        if (!signal.aborted) setReminderState(previous => ({
          ...(previous?.tenantId === tenantId ? previous : {}), tenantId, error: error.message,
        }));
      }
    }, { intervalMs: 60000, events: ['workspace_reminders_changed'] });
    reminderPoller.current = poller;
    return () => { poller.stop(); reminderPoller.current = null; };
  }, [mode, activeTenant?.id, user?.role]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const toggleMode = useCallback(() => {
    const update = () => setSavedMode(current => current === 'fast' ? 'classic' : 'fast');
    transition.current?.skipTransition?.();
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update();
      return;
    }
    transition.current = document.startViewTransition(() => flushSync(update));
    transition.current.finished.catch(() => {});
  }, [setSavedMode]);
  const reminders = reminderState?.tenantId === activeTenant?.id ? reminderState : null;
  return <WorkspaceContext.Provider value={{ mode, toggleMode, reminders,
    refreshReminders: () => { reminderCache.current = null; return reminderPoller.current?.refresh(); } }}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);
