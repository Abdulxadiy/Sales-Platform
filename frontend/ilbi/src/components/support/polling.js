export function supportPollDelay(intervalMs, failures, retryAfterMs = 0) {
  const delay = failures ? Math.max(15000, intervalMs * 2) * (2 ** Math.min(failures - 1, 4)) : intervalMs;
  return Math.max(retryAfterMs, Math.min(delay, 120000));
}

// Schedule the next read after the previous one finishes. A slow or unavailable
// server must not accumulate overlapping requests from several setIntervals.
export function startSupportPolling(task, {
  intervalMs,
  onError = () => {},
  shouldRun = () => !document.hidden,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let stopped = false;
  let running = false;
  let timer;
  let failures = 0;
  let retryAfterMs = 0;
  let retryPending = false;

  const run = async () => {
    if (stopped || running) return;
    if (!shouldRun()) {
      timer = setTimer(run, intervalMs);
      return;
    }
    running = true;
    retryPending = false;
    try {
      await task();
      failures = 0;
      retryAfterMs = 0;
    } catch (error) {
      failures += 1;
      retryAfterMs = Math.max(0, Number(error.retryAfterMs) || 0);
      if (!stopped) onError(error);
    } finally {
      running = false;
      if (!stopped) {
        timer = setTimer(run, retryPending ? 0 : supportPollDelay(intervalMs, failures, retryAfterMs));
      }
    }
  };

  void run();
  return {
    retry() {
      if (stopped) return;
      if (running) {
        retryPending = true;
        return;
      }
      clearTimer(timer);
      failures = 0;
      retryAfterMs = 0;
      void run();
    },
    stop() {
      stopped = true;
      clearTimer(timer);
    },
  };
}
