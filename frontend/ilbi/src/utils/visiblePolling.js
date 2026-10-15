// One request at a time. Hidden tabs abort work and stop the timer; becoming
// visible refreshes immediately. Events coalesce into one pending refresh.
export function createVisiblePoller(fetchData, { intervalMs = 10000, events = [], doc = document, target = window } = {}) {
  let stopped = false, running = false, queued = false, timer, controller;
  const visible = () => doc.visibilityState !== 'hidden';
  const refresh = async () => {
    clearTimeout(timer);
    if (stopped || !visible()) return;
    if (running) { queued = true; return; }
    running = true;
    queued = false;
    controller = new AbortController();
    try { await fetchData(controller.signal); }
    catch (error) { if (!controller.signal.aborted) target.dispatchEvent(new CustomEvent('poll:error', { detail: error })); }
    finally {
      running = false;
      if (!stopped && visible()) timer = setTimeout(refresh, queued ? 0 : intervalMs);
    }
  };
  const onVisibility = () => {
    clearTimeout(timer);
    if (visible()) refresh();
    else { queued = false; controller?.abort(); }
  };
  doc.addEventListener('visibilitychange', onVisibility);
  events.forEach(event => target.addEventListener(event, refresh));
  refresh();
  return { refresh, stop() {
    stopped = true; clearTimeout(timer); controller?.abort();
    doc.removeEventListener('visibilitychange', onVisibility);
    events.forEach(event => target.removeEventListener(event, refresh));
  } };
}
