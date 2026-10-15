import { logoDefinitions, logoMarkup, LOGO_CENTER } from './logo.js';
import { LineDrawReveal } from './motions/line-draw.js';
import { ModularAssembly } from './motions/modular.js';
import { DotSoftBounce } from './motions/dot-bounce.js';
import { LuminousSweep } from './motions/luminous.js';
import { clamp } from './math.js';

export const concepts = [LineDrawReveal, ModularAssembly, DotSoftBounce, LuminousSweep];
export const formats = {
  landscape: { width: 1920, height: 1080, label: '16:9' },
  square: { width: 1080, height: 1080, label: '1:1' },
  portrait: { width: 1080, height: 1920, label: '9:16' },
};
let sequence = 0;
const attr = (el, name, value) => el.setAttribute(name, typeof value === 'number' ? Number(value.toFixed(6)) : value);

export class MotionRenderer {
  constructor(container, { id = `ilbi-${++sequence}`, format = 'landscape' } = {}) {
    container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" aria-label="ilbi.uz logo animatsiyasi" role="img" viewBox="0 0 1920 1080"><defs>${logoDefinitions(id)}</defs><rect width="100%" height="100%" fill="#ffffff"/><g data-node="composition">${logoMarkup(id)}</g></svg>`;
    this.svg = container.querySelector('svg');
    this.nodes = Object.fromEntries([...this.svg.querySelectorAll('[data-node]')].map(n => [n.dataset.node, n]));
    this.parts = [0, 1, 2, 3].map(i => this.svg.querySelector(`[data-part="${i}"]`));
    this.glyphs = [...this.svg.querySelectorAll('[data-glyph]')];
    this.setFormat(format);
    this.renderAt('01', 0);
  }
  setFormat(key) {
    this.format = formats[key] ? key : 'landscape';
    const { width, height } = formats[this.format];
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const scale = this.format === 'landscape' ? 1.35 : 1.52;
    attr(this.nodes.composition, 'transform', `translate(${width / 2 - LOGO_CENTER.x * scale} ${height / 2 - LOGO_CENTER.y * scale}) scale(${scale})`);
  }
  renderAt(conceptId, time) {
    const concept = concepts.find(c => c.id === conceptId) || concepts[0];
    const t = clamp(time, 0, concept.duration);
    const s = concept.state(t);
    this.current = { concept: concept.id, time: t, duration: concept.duration, state: s };
    const n = this.nodes;
    attr(n.lockup, 'transform', `translate(0 ${s.lift})`);
    attr(n.body, 'opacity', s.opacity);
    n.body.style.filter = `saturate(${s.saturation})`;
    [...this.parts, ...this.glyphs].forEach((el, i) => {
      const p = i < 4 ? s.parts[i] : s.glyphs[i - 4];
      const center = i < 4 ? [129, 135] : [10, 40];
      attr(el, 'opacity', p.opacity);
      attr(el, 'transform', `translate(${p.x} ${p.y}) translate(${center[0]} ${center[1]}) scale(${p.scale}) translate(${-center[0]} ${-center[1]})`);
    });
    attr(n['draw-mask'], 'stroke-dashoffset', 1 - s.ribbonProgress);
    attr(n['draw-mask'], 'stroke-width', s.ribbonWidth);
    attr(n.line, 'stroke-dashoffset', 1 - s.line);
    attr(n.line, 'opacity', s.lineOpacity);
    attr(n['ribbon-glint'], 'opacity', s.ribbonGlint);
    attr(n.seed, 'opacity', s.seed.opacity);
    attr(n.seed, 'transform', `translate(114 ${s.seed.y}) scale(${s.seed.scaleX} ${s.seed.scaleY})`);
    attr(n.shadow, 'opacity', s.shadow);
    attr(n.shadow, 'rx', 22 * s.shadowScale);
    attr(n.trail, 'opacity', s.trail);
    attr(n['trail-1'], 'cy', s.seed.y + 42);
    attr(n['trail-2'], 'cy', s.seed.y + 82);
    attr(n.ripples, 'opacity', s.ripple);
    attr(n.ripples, 'transform', `translate(129 162) scale(${s.rippleScale}) translate(-129 -162)`);
    attr(n.sweep, 'opacity', s.sweep);
    attr(n.specular, 'transform', `translate(${s.sweepX} 0)`);
    attr(n.aura, 'cx', s.sweepX);
    attr(n.streak, 'cx', s.sweepX);
    return this.current;
  }
}
