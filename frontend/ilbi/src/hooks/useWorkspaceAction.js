import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

// Consume an explicit navbar action once, including when already on this page.
export function useWorkspaceAction(handler) {
  const [params, setParams] = useSearchParams();
  const current = useRef(handler);
  const controller = useRef(null);
  useEffect(() => { current.current = handler; });
  useEffect(() => () => controller.current?.abort(), []);
  const signature = params.toString();
  useEffect(() => {
    const incoming = new URLSearchParams(signature);
    const action = incoming.get('workspace_action');
    const search = incoming.get('workspace_search');
    const id = incoming.get('workspace_id');
    if (!action && search === null && !id) return;
    controller.current?.abort();
    controller.current = new AbortController();
    current.current({ action, search, id, signal: controller.current.signal });
    ['workspace_action', 'workspace_search', 'workspace_id'].forEach(key => incoming.delete(key));
    setParams(incoming, { replace: true });
  }, [signature, setParams]);
}
