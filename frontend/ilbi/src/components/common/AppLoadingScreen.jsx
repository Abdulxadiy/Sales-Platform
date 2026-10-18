import React, { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import IlbiLoader from './IlbiLoader';

const LoadingContext = createContext(null);
const defaultMessage = 'Sahifa yuklanmoqda...';

function Overlay({ message = defaultMessage, leaving = false }) {
  return createPortal(
    <div className={`ilbi-loading${leaving ? ' ilbi-loading--leaving' : ''}`} role="status" aria-label={message} aria-live="polite" aria-busy={!leaving}>
      <IlbiLoader decorative />
    </div>,
    document.body,
  );
}

export function AppLoadingProvider({ children }) {
  const requests = useRef(new Map());
  const timers = useRef([]);
  const [overlay, setOverlay] = useState(() => ({ visible: Boolean(document.getElementById('ilbi-boot-loader')), leaving: false, message: defaultMessage }));
  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  const finish = useCallback(() => {
    clearTimers();
    // Bridge auth and lazy-route handoffs without restarting the SVG animation.
    timers.current.push(setTimeout(() => {
      setOverlay(previous => ({ ...previous, leaving: true }));
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      timers.current.push(setTimeout(() => setOverlay(previous => ({ ...previous, visible: false })), reduced ? 0 : 380));
    }, 80));
  }, [clearTimers]);
  const register = useCallback(message => {
    const token = Symbol();
    requests.current.set(token, message);
    clearTimers();
    setOverlay({ visible: true, leaving: false, message });
    return () => {
      requests.current.delete(token);
      if (!requests.current.size) finish();
    };
  }, [clearTimers, finish]);

  useLayoutEffect(() => {
    const boot = document.getElementById('ilbi-boot-loader');
    if (boot) {
      const phases = new Map(boot.getAnimations({ subtree: true }).map(animation => [animation.animationName, animation.currentTime]));
      document.querySelector('.ilbi-loading:not(#ilbi-boot-loader)')?.getAnimations({ subtree: true }).forEach(animation => {
        if (phases.has(animation.animationName)) animation.currentTime = phases.get(animation.animationName);
      });
      boot.remove();
    }
    if (!requests.current.size) finish();
    return clearTimers;
  }, [clearTimers, finish]);

  return <LoadingContext.Provider value={register}>
    {children}
    {overlay.visible && <Overlay message={overlay.message} leaving={overlay.leaving} />}
  </LoadingContext.Provider>;
}

export default function AppLoadingScreen({ message = 'Xavfsiz sessiya tekshirilmoqda...' }) {
  const register = useContext(LoadingContext);
  useLayoutEffect(() => register?.(message), [register, message]);
  return register ? null : <Overlay message={message} />;
}
