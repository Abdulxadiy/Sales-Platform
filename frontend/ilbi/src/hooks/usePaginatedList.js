import { useCallback, useEffect, useState } from 'react';

export function useDebouncedValue(value, delay = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

// A filter or tenant change starts at page one. Cancel obsolete requests so a
// slow response cannot overwrite a newer search or another tenant's results.
export function usePaginatedList(fetchPage, params, { tenantId, pageSize = 20, enabled = true } = {}) {
  const key = JSON.stringify([tenantId, params]);
  const [selection, setSelection] = useState({ key, page: 1 });
  const page = selection.key === key ? selection.page : 1;
  if (selection.key !== key) setSelection({ key, page: 1 });
  const [revision, setRevision] = useState(0);
  const requestKey = JSON.stringify([key, page, pageSize, revision]);
  const [result, setResult] = useState({ items: [], total: 0, key: null, requestKey: null, error: null });
  const setPage = useCallback(next => setSelection({ key, page: next }), [key, setSelection]);
  const refresh = useCallback(() => setRevision(value => value + 1), [setRevision]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const [, filters] = JSON.parse(key);
    fetchPage({ ...filters, page, page_size: pageSize }, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setResult({ items: data.results, total: data.count, key, requestKey, summary: data.summary, error: null });
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        // The last page may disappear after deleting or archiving its last row.
        if (err.status === 404 && page > 1) setSelection({ key, page: page - 1 });
        else {
          setResult({ items: [], total: 0, key, requestKey, error: err });
        }
      });
    return () => controller.abort();
  }, [fetchPage, key, page, pageSize, requestKey, enabled]);

  return {
    items: result.key === key ? result.items : [],
    total: result.key === key ? result.total : 0,
    summary: result.key === key ? result.summary : undefined,
    page, setPage, refresh, loading: enabled && result.requestKey !== requestKey,
    error: result.requestKey === requestKey ? result.error : null,
  };
}
