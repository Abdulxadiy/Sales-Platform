import React, { useId, useLayoutEffect, useRef } from 'react';
import { DotMotion, INTRO_DURATION } from './ilbi/dotMotion';
import './IlbiIntroAnimation.css';

const FADE_SECONDS = 0.4;

function clampFade(value) {
  return Math.min(1, Math.max(0, value));
}

export default function IlbiIntroAnimation({ onComplete }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const dialogRef = useRef(null);
  const stageRef = useRef(null);
  const callbackRef = useRef(onComplete);
  const finishRef = useRef(null);

  // Parent rerenders must update the callback without restarting the opening.
  useLayoutEffect(() => { callbackRef.current = onComplete; }, [onComplete]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const motion = new DotMotion(stageRef.current, `ilbi-intro-${id}`);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let reducedTimer;
    let finished = false;
    const started = performance.now();

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      clearTimeout(reducedTimer);
      dialog.close();
      callbackRef.current?.();
    };
    finishRef.current = finish;

    const reduceMotion = () => {
      cancelAnimationFrame(frame);
      motion.renderAt(INTRO_DURATION);
      dialog.style.opacity = '1';
      // Show the final identity without a reveal, bounce, or extended wait.
      reducedTimer = setTimeout(finish, 150);
    };
    const tick = now => {
      if (finished) return;
      const seconds = (now - started) / 1000;
      motion.renderAt(seconds);
      dialog.style.opacity = String(1 - clampFade((seconds - INTRO_DURATION) / FADE_SECONDS));
      if (seconds >= INTRO_DURATION + FADE_SECONDS) finish();
      else frame = requestAnimationFrame(tick);
    };
    const handlePreference = () => {
      if (preference.matches && !finished) reduceMotion();
    };

    dialog.style.opacity = '1';
    dialog.showModal();
    if (preference.matches) reduceMotion();
    else frame = requestAnimationFrame(tick);
    preference.addEventListener('change', handlePreference);

    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      clearTimeout(reducedTimer);
      preference.removeEventListener('change', handlePreference);
      finishRef.current = null;
      dialog.close();
    };
  }, [id]);

  return (
    <dialog
      ref={dialogRef}
      className="ilbi-intro"
      aria-label="ilbi.uz — kirish animatsiyasi"
      onCancel={event => { event.preventDefault(); finishRef.current?.(); }}
    >
      <div ref={stageRef} className="ilbi-intro__stage" />
      <button type="button" className="ilbi-intro__skip" onClick={() => finishRef.current?.()}>
        O‘tkazib yuborish <span aria-hidden="true">→</span>
      </button>
    </dialog>
  );
}
