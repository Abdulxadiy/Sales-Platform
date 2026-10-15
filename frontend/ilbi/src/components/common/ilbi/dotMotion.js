import { logoDefinitions, logoMarkup } from './logo.js';
import { DotSoftBounce } from './dotBounce.js';
import { clamp } from './math.js';

const attr = (node, key, value) => node.setAttribute(key, typeof value === 'number' ? Number(value.toFixed(6)) : value);

// The approved studio geometry and timeline, with a compact responsive canvas.
// Keeping the SVG local to the frontend also supports isolated Docker builds.
export class DotMotion {
  constructor(container, id) {
    container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -50 458 466" aria-hidden="true" focusable="false"><defs>${logoDefinitions(id)}</defs>${logoMarkup(id)}</svg>`;
    this.nodes = Object.fromEntries([...container.querySelectorAll('[data-node]')].map(node => [node.dataset.node, node]));
    this.parts = [0, 1, 2, 3].map(i => container.querySelector(`[data-part="${i}"]`));
    this.glyphs = [...container.querySelectorAll('[data-glyph]')];
    // These two layers belong to the studio's other concepts.
    attr(this.nodes.line, 'opacity', 0);
    attr(this.nodes.sweep, 'opacity', 0);
    this.renderAt(0);
  }

  renderAt(seconds) {
    const s = DotSoftBounce.state(clamp(seconds, 0, DotSoftBounce.duration));
    const n = this.nodes;
    attr(n.lockup, 'transform', `translate(0 ${s.lift})`);
    [...this.parts, ...this.glyphs].forEach((node, index) => {
      const p = index < 4 ? s.parts[index] : s.glyphs[index - 4];
      attr(node, 'opacity', p.opacity);
      attr(node, 'transform', `translate(${p.x} ${p.y})`);
    });
    attr(n['draw-mask'], 'stroke-dashoffset', 1 - s.ribbonProgress);
    attr(n['draw-mask'], 'stroke-width', s.ribbonWidth);
    attr(n['ribbon-glint'], 'opacity', 0);
    attr(n.seed, 'opacity', s.seed.opacity);
    attr(n.seed, 'transform', `translate(114 ${s.seed.y}) scale(${s.seed.scaleX} ${s.seed.scaleY})`);
    attr(n.shadow, 'opacity', s.shadow);
    attr(n.shadow, 'rx', 22 * s.shadowScale);
    attr(n.trail, 'opacity', s.trail);
    attr(n['trail-1'], 'cy', s.seed.y + 42);
    attr(n['trail-2'], 'cy', s.seed.y + 82);
    attr(n.ripples, 'opacity', s.ripple);
    attr(n.ripples, 'transform', `translate(129 162) scale(${s.rippleScale}) translate(-129 -162)`);
  }
}

export const INTRO_DURATION = DotSoftBounce.duration;
