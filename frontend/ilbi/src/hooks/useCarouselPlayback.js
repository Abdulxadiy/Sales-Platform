import { useEffect, useRef, useState } from "react";

export function useCarouselPlayback({
  root,
  viewport,
  index,
  ready,
  blocked,
  advance,
}) {
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const elapsed = useRef(0);
  const running =
    playing &&
    visible &&
    pageVisible &&
    !hovered &&
    !focused &&
    !blocked &&
    ready;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      if (media.matches) setPlaying(false);
    };
    const visibility = () => setPageVisible(!document.hidden);
    let alive = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (alive) setVisible(entries[0].intersectionRatio >= 0.5);
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(viewport.current);
    media.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive = false;
      observer.disconnect();
      media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [viewport]);

  useEffect(() => {
    elapsed.current = 0;
    root.current?.style.setProperty("--pc-time", "0");
  }, [index, root]);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const previous = elapsed.current;
    let frame;
    let completed = false;
    const tick = (now) => {
      const value = previous + now - start;
      root.current?.style.setProperty(
        "--pc-time",
        String(Math.min(1, value / 6500)),
      );
      if (value >= 6500) {
        completed = true;
        elapsed.current = 0;
        advance();
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (!completed)
        elapsed.current = Math.min(6500, previous + performance.now() - start);
    };
  }, [index, running, advance, root]);

  return { playing, running, setPlaying, setHovered, setFocused };
}
