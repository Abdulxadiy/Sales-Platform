import { clamp } from './math.js';
import { concepts } from './renderer.js';

// A timestamp is the complete source of truth. No CSS animation clocks,
// timers, randomness, or accumulated state can alter a captured frame.
export class MotionPlayer {
  constructor(renderer, onUpdate = () => {}, reducedMotion = false) {
    this.renderer = renderer;
    this.onUpdate = onUpdate;
    this.reducedMotion = reducedMotion;
    this.concept = concepts[0];
    this.time = 0;
    this.speed = 1;
    this.playing = false;
    this.frame = null;
  }
  select(id, autoplay = true) {
    this.pause();
    this.concept = concepts.find(c => c.id === id) || concepts[0];
    this.seek(this.reducedMotion ? this.concept.duration : 0);
    if (autoplay) this.play();
  }
  seek(time) {
    this.time = this.reducedMotion ? this.concept.duration : clamp(Number(time), 0, this.concept.duration);
    this.renderer.renderAt(this.concept.id, this.time);
    this.onUpdate(this);
    return this.time;
  }
  play() {
    if (this.reducedMotion || this.playing) return;
    if (this.time >= this.concept.duration) this.seek(0);
    this.playing = true;
    this.previous = performance.now();
    this.onUpdate(this);
    const tick = now => {
      if (!this.playing) return;
      const dt = (now - this.previous) / 1000;
      this.previous = now;
      this.seek(this.time + dt * this.speed);
      if (this.time >= this.concept.duration) this.pause();
      else this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  pause() {
    this.playing = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.onUpdate(this);
  }
  restart() {
    this.pause();
    this.seek(0);
    this.play();
  }
  dispose() { this.pause(); this.onUpdate = () => {}; }
}
