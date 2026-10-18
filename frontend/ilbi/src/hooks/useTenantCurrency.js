import { useEffect, useState } from 'react';
import { tenantApi } from '../api/client';
import { createVisiblePoller } from '../utils/visiblePolling';

// Refresh long-lived calculator screens and discard replies from a previous shop.
export function useTenantCurrency(tenantId) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const poller = createVisiblePoller(async signal => {
      try {
        const settings = await tenantApi.getCurrentTenant({ tenant_id: tenantId }, { signal });
        if (active && !signal.aborted) setSnapshot({ tenantId, settings });
      } catch {
        if (active && !signal.aborted) setSnapshot({ tenantId, settings: null });
      }
    }, { intervalMs: 60_000, events: ['focus', 'tenant:currency-updated'] });
    return () => {
      active = false;
      poller.stop();
    };
  }, [tenantId]);
  return { settings: String(snapshot?.tenantId) === String(tenantId) ? snapshot?.settings : null };
}
