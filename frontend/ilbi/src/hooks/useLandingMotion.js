import { useCallback, useEffect, useRef } from "react";

const clamp = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => value * value * (3 - 2 * value);

/** Scroll is the timeline: returning to a position restores the same frame. */
export function useLandingMotion(root, onStoryStep) {
  const storyPosition = useRef(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const story = node.querySelector("[data-scroll-story]");
    const stage = story?.querySelector("[data-story-stage]");
    const hero = node.querySelector(".lp-hero");
    const targets = [...node.querySelectorAll("[data-reveal]")].map(
      (element) => ({ element, lift: 0 }),
    );
    let frame = 0;
    let lastY = window.scrollY;
    let lastStep = -1;
    let animationObserver;

    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - viewport;
      const moving = !media.matches;
      // Read before writing. Subtract the previous translation so a reveal
      // never measures its own animation and drifts between forward/backward.
      const measurements = targets.map((target) => {
        const top = target.element.getBoundingClientRect().top - target.lift;
        return { target, top, bottom: top + target.element.offsetHeight };
      });
      const heroTop = hero.getBoundingClientRect().top + y;
      const heroProgress = clamp((y - heroTop) / (hero.offsetHeight * 0.95));
      const pinned = story?.classList.contains("lp-story-enabled");
      const storyStart = story
        ? story.getBoundingClientRect().top +
          y -
          node.querySelector(".lp-header").offsetHeight
        : 0;
      const travel = pinned
        ? Math.max(1, story.offsetHeight - stage.offsetHeight)
        : 1;
      const progress = clamp((y - storyStart) / travel);

      node.style.setProperty("--lp-progress", max > 0 ? String(y / max) : "0");
      node.style.setProperty(
        "--lp-hero-progress",
        moving ? heroProgress.toFixed(5) : "0",
      );
      if (Math.abs(y - lastY) > 1)
        node.classList.toggle("lp-scroll-back", y < lastY);
      lastY = y;

      for (const { target, top, bottom } of measurements) {
        const enter = moving
          ? ease(clamp((viewport * 0.97 - top) / (viewport * 0.31)))
          : 1;
        const leave = moving
          ? ease(clamp((bottom - viewport * 0.035) / (viewport * 0.16)))
          : 1;
        const visible = Math.min(enter, leave);
        target.lift = moving ? (1 - enter) * 38 - (1 - leave) * 22 : 0;
        target.element.style.setProperty("--lp-enter", enter.toFixed(5));
        target.element.style.setProperty("--lp-reveal", visible.toFixed(5));
        target.element.style.setProperty(
          "--lp-lift",
          `${target.lift.toFixed(3)}px`,
        );
        target.element.classList.toggle(
          "lp-in-viewport",
          top < viewport && bottom > 0,
        );
      }
      if (pinned) {
        storyPosition.current = { start: storyStart, travel };
        story.style.setProperty("--lp-story-progress", progress.toFixed(5));
        const step = Math.min(3, Math.floor(progress * 4));
        story.dataset.storyPhase = String(step);
        if (lastStep !== step) {
          lastStep = step;
          onStoryStep(step);
        }
      } else {
        storyPosition.current = null;
        lastStep = -1;
        story?.style.removeProperty("--lp-story-progress");
        if (story) delete story.dataset.storyPhase;
      }
    };
    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(update);
    };
    const setup = () => {
      const header = node.querySelector(".lp-header").offsetHeight;
      node.style.setProperty("--lp-header-height", `${header}px`);
      node.classList.toggle("lp-motion", !media.matches);
      // Short windows keep the complete, unpinned interface. No scroll trap.
      story?.classList.toggle(
        "lp-story-enabled",
        !media.matches &&
          window.innerHeight >= (window.innerWidth <= 900 ? 720 : 700),
      );
      schedule();
    };
    const visibility = () => {
      node.classList.toggle("lp-animation-paused", document.hidden);
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    };
    if ("IntersectionObserver" in window) {
      animationObserver = new IntersectionObserver((entries) =>
        entries.forEach((entry) =>
          entry.target.classList.toggle(
            "lp-out-of-view",
            !entry.isIntersecting,
          ),
        ),
      );
      node
        .querySelectorAll(".lp-scene, .lp-branch-map")
        .forEach((element) => animationObserver.observe(element));
    }
    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(node);
    setup();
    visibility();
    media.addEventListener("change", setup);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", setup, { passive: true });
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      animationObserver?.disconnect();
      resizeObserver?.disconnect();
      media.removeEventListener("change", setup);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", setup);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("visibilitychange", visibility);
      storyPosition.current = null;
    };
  }, [root, onStoryStep]);

  return useCallback((index) => {
    const position = storyPosition.current;
    if (!position) return;
    window.scrollTo({
      top: position.start + position.travel * ((index + 0.5) / 4),
      behavior: "smooth",
    });
  }, []);
}
