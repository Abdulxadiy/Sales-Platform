import { hiddenState, ease, soft, progress, back, windowAt } from './math.js';
export const DotSoftBounce = {
  id: '03', name: 'Nuqta va yumshoq sakrash', english: 'Dot Pop-Up & Soft Bounce',
  short: 'Kichik nuqta. Katta taassurot.', duration: 5.1,
  slug: 'dot-pop-up-soft-bounce', feel: 'Jonli · yengil · esda qolarli',
  description: 'Bitta ko‘k nuqta yuqoriga sakrab, monogramni uyg‘otadi. Yozuv yengil ko‘tariladi va butun logo yumshoq o‘rnashadi.',
  labels: [
    { at: 0, id: 'dotAppear', name: 'Nuqta paydo bo‘lishi' },
    { at: .55, id: 'jump', name: 'Yuqoriga sakrash' },
    { at: 1.35, id: 'brandReveal', name: 'Monogram uyg‘onishi' },
    { at: 2.45, id: 'wordmarkLift', name: 'Yozuv ko‘tarilishi' },
    { at: 3.4, id: 'softLockup', name: 'Yumshoq yakun' },
  ],
  state(t) {
    const s = hiddenState();
    const appear = ease(t, .05, .33);
    const jump = progress(t, .64, 1.42);
    const height = 260 * (1 - (1 - jump) ** 2);
    const anticipate = windowAt(t, .42, .55, .6, .71);
    const stretch = windowAt(t, .66, .77, 1.05, 1.38);
    const dissolve = 1 - soft(t, 1.4, 1.83);
    s.seed = {
      opacity: appear * dissolve, y: 325 - height,
      scaleX: (.55 + .45 * appear) * (1 + .15 * anticipate - .08 * stretch) * (.25 + .75 * dissolve),
      scaleY: (.55 + .45 * appear) * (1 - .15 * anticipate + .12 * stretch) * (.25 + .75 * dissolve),
    };
    s.shadow = appear * (.2 - .12 * jump) * (1 - soft(t, 1.42, 1.9));
    s.shadowScale = 1 - .4 * jump;
    s.trail = .13 * windowAt(t, .76, .88, 1.16, 1.48);
    s.ribbonProgress = ease(t, 1.35, 2.12);
    s.parts[2].opacity = ease(t, 1.35, 1.65);
    [[0, 1.69, 0, -9], [1, 1.57, -7, 3], [3, 1.78, 9, 4]].forEach(([i, start, x, y]) => {
      const p = ease(t, start, start + .65);
      s.parts[i] = { opacity: p, x: x * (1 - p), y: y * (1 - p), scale: 1 };
    });
    s.glyphs.forEach((g, i) => {
      const p = progress(t, 2.45 + i * .035, 3.14 + i * .035);
      g.opacity = ease(t, 2.45 + i * .035, 2.9 + i * .035);
      g.y = 26 * (1 - back(p, 2));
    });
    const settle = progress(t, 3.4, 4.05);
    s.lift = settle === 0 || settle === 1 ? 0 : 3.6 * Math.sin(settle * Math.PI * 3) * (1 - settle) ** 2;
    s.ripple = .3 * windowAt(t, 3.4, 3.48, 3.62, 3.83);
    s.rippleScale = 1 + .12 * progress(t, 3.4, 3.83);
    return s;
  },
};
