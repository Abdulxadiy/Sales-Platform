import { MotionRenderer, concepts, formats } from './renderer.js';
import { MotionPlayer } from './player.js';

const query = new URLSearchParams(location.search);
const capture = query.get('capture') === '1';
const clean = capture || query.get('clean') === '1';
if (clean) document.body.classList.add('capture');
const $ = id => document.getElementById(id);
const events = new AbortController();
const listen = (target, name, fn) => target.addEventListener(name, fn, { signal: events.signal });
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const renderer = new MotionRenderer($('stage'), { id: 'main', format: query.get('format') || 'landscape' });
let beatButtons = [];
let lastActive = -1;

function sync(p) {
  $('time').textContent = p.time.toFixed(2).padStart(5, '0');
  $('timeline').value = p.time;
  $('timeline').style.setProperty('--progress', `${p.time / p.concept.duration * 100}%`);
  $('play-label').textContent = p.playing ? 'Pauza' : 'Ijro';
  $('play-icon').textContent = p.playing ? 'Ⅱ' : '▶';
  $('play').setAttribute('aria-label', p.playing ? 'Ijroni to‘xtatish' : 'Animatsiyani ijro etish');
  let active = 0;
  p.concept.labels.forEach((b, i) => { if (p.time >= b.at) active = i; });
  if (active !== lastActive) {
    beatButtons.forEach((b, i) => {
      b.classList.toggle('active', i === active);
      b.classList.toggle('done', i < active);
      if (i === active) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    lastActive = active;
  }
}

const player = new MotionPlayer(renderer, sync, !capture && preference.matches);

function selectConcept(id, autoplay = true, updateURL = true) {
  player.pause();
  const c = concepts.find(c => c.id === id) || concepts[0];
  $('current-label').textContent = `${c.id} / ${c.english.toUpperCase()}`;
  $('concept-select').value = c.id;
  $('concept-number').textContent = c.id;
  $('concept-name').textContent = c.name;
  $('concept-description').textContent = c.description;
  $('duration-badge').textContent = `${c.duration.toFixed(1)} s`;
  $('timeline').max = c.duration;
  $('duration').textContent = c.duration.toFixed(2).padStart(5, '0');
  $('download-video').href = `exports/ilbi-concept-${c.id}-${c.slug}.mp4`;
  $('reference-image').src = `assets/references/concept-${c.id}.png`;
  $('reference-image').alt = `${c.name} — asl besh bosqichli storyboard`;
  $('reference-title').textContent = `${c.id} / ${c.name}`;
  $('beats').innerHTML = c.labels.map((b, i) => `<li><button class="beat" data-beat="${i}" title="${b.at.toFixed(2)} soniyaga o‘tish"><span class="beat-indicator"></span><span class="beat-label">${b.name}</span><span class="beat-time">${b.at.toFixed(2)}</span></button></li>`).join('');
  beatButtons = [...$('beats').querySelectorAll('button')];
  beatButtons.forEach((button, i) => listen(button, 'click', () => { player.pause(); player.seek(c.labels[i].at); }));
  document.querySelectorAll('.concept-card').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.concept === c.id)));
  lastActive = -1;
  player.select(c.id, autoplay);
  if (updateURL && !capture) {
    const url = new URL(location.href);
    url.searchParams.set('concept', c.id);
    history.replaceState(null, '', url);
  }
}

function setFormat(key) {
  renderer.setFormat(key);
  renderer.svg.parentElement.parentElement.dataset.format = renderer.format;
  document.querySelectorAll('[data-format]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.format === renderer.format));
  });
  player.seek(player.time);
}

$('concepts').innerHTML = concepts.map(c => `<button class="concept-card" data-concept="${c.id}" aria-pressed="false" aria-label="${c.id}. ${c.name} animatsiyasini tanlash"><div class="card-preview"><div id="thumbnail-${c.id}" style="width:100%;height:100%"></div><span class="card-index">${c.id}</span><span class="card-selection" aria-hidden="true">✓</span></div><div class="card-info"><span class="card-name">${c.name}</span><span class="card-short">${c.short}</span><div class="card-foot"><span>${c.english}</span><span>${c.duration.toFixed(1)} s ↗</span></div></div></button>`).join('');
concepts.forEach((c, i) => {
  const thumb = new MotionRenderer($(`thumbnail-${c.id}`));
  thumb.svg.setAttribute('viewBox', '540 210 840 650');
  thumb.svg.setAttribute('aria-hidden', 'true');
  thumb.renderAt(c.id, [2.2, .2, 2.3, 1.8][i]);
});
document.querySelectorAll('.concept-card').forEach(button => listen(button, 'click', () => {
  if (!clean) document.querySelector('.workspace').scrollIntoView({ block: 'start', behavior: 'instant' });
  selectConcept(button.dataset.concept);
}));
listen($('concept-select'), 'change', e => selectConcept(e.target.value));
document.querySelectorAll('button[data-format]').forEach(button => listen(button, 'click', () => setFormat(button.dataset.format)));
listen($('play'), 'click', () => player.playing ? player.pause() : player.play());
listen($('restart'), 'click', () => player.restart());
listen($('timeline'), 'input', e => {
  const seconds = Number(e.target.value);
  player.pause();
  player.seek(seconds);
});
listen($('speed'), 'change', e => { player.speed = Number(e.target.value); });
listen($('fullscreen'), 'click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('stage').requestFullscreen();
  } catch { $('fullscreen').title = 'Brauzerda to‘liq ekran ruxsati mavjud emas'; }
});
listen($('clean'), 'click', () => {
  const url = new URL(location.href);
  url.search = new URLSearchParams({ clean: '1', concept: player.concept.id, format: renderer.format });
  window.open(url.href, '_blank', 'noopener');
});
listen($('reference'), 'click', () => $('reference-dialog').showModal());
listen($('close-reference'), 'click', () => $('reference-dialog').close());
listen($('reference-dialog'), 'click', e => { if (e.target === $('reference-dialog')) $('reference-dialog').close(); });
listen(document, 'keydown', e => {
  if (e.target.closest('input,select,textarea,button,a,[contenteditable]') || $('reference-dialog').open) return;
  if (e.code === 'Space') { e.preventDefault(); player.playing ? player.pause() : player.play(); }
  if (e.key.toLowerCase() === 'r') { e.preventDefault(); player.restart(); }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault(); player.pause(); player.seek(player.time + (e.key === 'ArrowRight' ? 1 : -1) / 60);
  }
  if (/^[1-4]$/.test(e.key)) selectConcept(`0${e.key}`);
});
function applyPreference() {
  player.reducedMotion = !capture && preference.matches;
  $('motion-notice').hidden = !player.reducedMotion;
  $('play').disabled = player.reducedMotion;
  $('restart').disabled = player.reducedMotion;
  $('timeline').disabled = player.reducedMotion;
  if (player.reducedMotion) { player.pause(); player.seek(player.concept.duration); }
}
listen(preference, 'change', applyPreference);
listen(window, 'pagehide', () => { player.dispose(); events.abort(); });

selectConcept(query.get('concept') || '01', !capture, false);
setFormat(renderer.format);
applyPreference();

// Frame-exact public interface for captures and integration in a future app.
// Selecting or seeking explicitly never starts an independent animation clock.
window.ilbi = {
  ready: true,
  concepts: concepts.map(({ id, name, duration, slug, labels }) => ({ id, name, duration, slug, labels })),
  formats,
  select: id => selectConcept(id, false, false),
  seek: seconds => { player.pause(); return player.seek(seconds); },
  play: () => player.play(), pause: () => player.pause(), restart: () => player.restart(),
  format: key => setFormat(key),
  snapshot: () => ({ concept: player.concept.id, time: player.time, playing: player.playing, format: renderer.format, state: renderer.current.state }),
};
