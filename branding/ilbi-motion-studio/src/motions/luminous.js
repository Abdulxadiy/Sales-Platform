import { finalState, ease, soft, windowAt } from '../math.js';
export const LuminousSweep = {
  id: '04', name: 'Yorug‘lik va premium yakun', english: 'Luminous Sweep & Premium Finish',
  short: 'Bitta nur. Mukammal yakun.', duration: 5,
  slug: 'luminous-sweep-premium-finish', feel: 'Nafis · vazmin · premium',
  description: 'Xira logodan bitta ko‘k-oq nur o‘tadi. Yorug‘lik vektor konturlariga tushib, ko‘k lentani ochadi va tiniq logoni qoldiradi.',
  labels: [
    { at: 0, id: 'dimStart', name: 'Xira boshlanish' },
    { at: .6, id: 'sweepEnter', name: 'Nur kirishi' },
    { at: 1.4, id: 'crossLogo', name: 'Logo bo‘ylab nur' },
    { at: 2.45, id: 'sweepExit', name: 'Nur chiqishi' },
    { at: 3.35, id: 'premiumHold', name: 'Tiniq yakun' },
  ],
  state(t) {
    const s = finalState();
    s.opacity = .78 + .22 * soft(t, 1.1, 3.1);
    s.saturation = .72 + .28 * soft(t, 1.1, 3.1);
    s.sweepX = -145 + 565 * soft(t, .6, 3.05);
    s.sweep = windowAt(t, .6, .95, 2.7, 3.3);
    return s;
  },
};
