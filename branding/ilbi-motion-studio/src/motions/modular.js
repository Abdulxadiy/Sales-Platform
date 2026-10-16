import { hiddenState, ease, soft } from '../math.js';
export const ModularAssembly = {
  id: '02', name: 'Blokma-blok qurilish', english: 'Modular Assembly',
  short: 'Mustaqil qismlar. Yaxlit tizim.', duration: 5.1,
  slug: 'modular-assembly', feel: 'Tartibli · ishonchli · texnologik',
  description: 'Ajralgan nuqta, ustun, lenta va yoy aniq trayektoriyalar bilan yaqinlashadi. Harflar ixcham yozuvga yig‘iladi.',
  labels: [
    { at: 0, id: 'parts', name: 'Ajralgan elementlar' },
    { at: .55, id: 'approach', name: 'Markazga yaqinlashish' },
    { at: 1.65, id: 'monogramLocked', name: 'Monogram birlashishi' },
    { at: 2.25, id: 'wordmark', name: 'Harflar terilishi' },
    { at: 3.65, id: 'finalHold', name: 'Yakuniy logo' },
  ],
  state(t) {
    const s = hiddenState();
    const offsets = [[-39, -18], [-45, 9], [0, -15], [49, 14]];
    offsets.forEach(([x, y], i) => {
      const p = ease(t, .55 + i * .1, 1.65 + i * .1);
      s.parts[i] = { opacity: 1, x: x * (1 - p), y: y * (1 - p), scale: 1 };
    });
    s.glyphs.forEach((g, i) => {
      const p = ease(t, 2.25 + i * .095, 2.99 + i * .095);
      const ghost = .38 * (1 - soft(t, 1.45, 1.95));
      g.opacity = Math.max(ghost, p);
      g.x = (i - 3) * 5 * (1 - ease(t, .65, 1.75));
      g.y = 20 * (1 - p);
    });
    return s;
  },
};
