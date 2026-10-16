import { hiddenState, ease, soft, progress, windowAt } from '../math.js';
export const LineDrawReveal = {
  id: '01', name: 'Chiziq bo‘ylab ochilish', english: 'Line-Draw Reveal',
  short: 'Bir chiziqdan to‘liq brendgacha.', duration: 5.2,
  slug: 'line-draw-reveal', feel: 'Aniq · sokin · zamonaviy',
  description: 'Yupqa ko‘k chiziq egri lentaga aylanadi. Monogram qismlari va harflar birin-ketin o‘z o‘rnini topadi.',
  labels: [
    { at: 0, id: 'anticipation', name: 'Sokin boshlanish' },
    { at: .3, id: 'blueLine', name: 'Ko‘k chiziq' },
    { at: 1.08, id: 'ribbonForm', name: 'Lenta shakllanishi' },
    { at: 1.7, id: 'monogram', name: 'Monogram yig‘ilishi' },
    { at: 2.55, id: 'wordmark', name: 'Yozuv ochilishi' },
    { at: 3.65, id: 'finalHold', name: 'Yakuniy logo' },
  ],
  state(t) {
    const s = hiddenState();
    const form = soft(t, 1.08, 1.85);
    s.line = ease(t, .3, 1.08);
    s.lineOpacity = ease(t, .3, .43) * (1 - soft(t, 1.15, 1.65));
    s.parts[2].opacity = ease(t, 1.08, 1.3);
    s.ribbonProgress = .66 + .34 * form;
    s.ribbonWidth = 6 + 174 * form;
    [[0, 1.93, 0, -10], [1, 1.7, -12, 0], [3, 1.83, 13, 0]].forEach(([i, start, x, y]) => {
      const p = ease(t, start, start + .67);
      s.parts[i] = { opacity: p, x: x * (1 - p), y: y * (1 - p), scale: 1 };
    });
    s.glyphs.forEach((g, i) => {
      const p = ease(t, 2.55 + i * .075, 3.12 + i * .075);
      g.opacity = p; g.y = 18 * (1 - p);
      if (i === 4) g.scale = 1 - .14 * (1 - p);
    });
    s.ribbonGlint = .45 * windowAt(t, 1.25, 1.7, 2.1, 2.65);
    return s;
  },
};
