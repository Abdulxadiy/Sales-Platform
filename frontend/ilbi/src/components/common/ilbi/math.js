export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const progress = (t, start, end) => clamp((t - start) / (end - start));
export const mix = (a, b, p) => a + (b - a) * p;
export const out = p => 1 - (1 - p) ** 3;
export const smooth = p => p * p * (3 - 2 * p);
export const ease = (t, start, end) => out(progress(t, start, end));
export const soft = (t, start, end) => smooth(progress(t, start, end));
export function back(p, strength = 1.7) {
  if (p === 0 || p === 1) return p;
  return 1 + (strength + 1) * (p - 1) ** 3 + strength * (p - 1) ** 2;
}
export const windowAt = (t, a, b, c, d) => soft(t, a, b) * (1 - soft(t, c, d));
export function hiddenState() {
  return {
    parts: Array.from({ length: 4 }, () => ({ opacity: 0, x: 0, y: 0, scale: 1 })),
    glyphs: Array.from({ length: 7 }, () => ({ opacity: 0, x: 0, y: 0, scale: 1 })),
    ribbonProgress: 1, ribbonWidth: 180, line: 0, lineOpacity: 0,
    seed: { opacity: 0, y: 325, scaleX: 1, scaleY: 1 },
    shadow: 0, shadowScale: 1, trail: 0, ripple: 0, rippleScale: 1,
    lift: 0, opacity: 1, saturation: 1, sweep: 0, sweepX: -170,
    ribbonGlint: 0,
  };
}
export function finalState() {
  const s = hiddenState();
  s.parts.forEach(p => { p.opacity = 1; });
  s.glyphs.forEach(p => { p.opacity = 1; });
  return s;
}
