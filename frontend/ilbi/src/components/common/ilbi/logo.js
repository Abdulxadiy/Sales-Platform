// Hand-reconstructed from the supplied concept-01, panel-5 PNG.
// These are editable vectors, not an official recovered brand master.
// All four films use exactly these same paths and final transforms.
export const paths = {
  dot: 'M74 63 A27 27 0 1 1 20 63 A27 27 0 1 1 74 63 Z',
  stem: 'M37 99 H72 V255 C41 252 22 233 22 207 V116 C22 106 27 99 37 99 Z',
  bowl: 'M151 99 H171 C222 99 258 136 258 182 C258 232 221 270 173 270 C151 270 133 264 119 255 L150 219 C157 223 165 225 173 225 C197 225 214 206 214 182 C214 161 196 144 174 144 H151 Z',
  ribbon: 'M90 5 C120 5 138 25 138 48 V187 C138 212 154 228 177 228 C190 228 202 220 212 210 C193 238 166 258 142 266 C109 252 90 229 90 198 Z',
  ribbonFace: 'M90 5 C120 5 138 25 138 48 V235 C117 233 101 225 90 215 Z',
  ribbonTurn: 'M90 214 C111 233 151 243 177 228 C190 228 202 220 212 210 C193 238 166 258 142 266 C117 255 98 237 90 214 Z',
};

// Outlined, individually addressable wordmark glyphs. No font loading or
// platform-dependent text metrics are involved in the animation or capture.
export const glyphs = [
  { name: 'i-1', x: 0, d: 'M19 9 A9 9 0 1 1 1 9 A9 9 0 1 1 19 9 Z M2 25 H18 V73 H2 Z' },
  { name: 'l', x: 26, d: 'M0 0 H17 V73 H0 Z' },
  { name: 'b', x: 51, d: 'M0 0 H17 V29 C22 24 28 23 34 23 C49 23 59 34 59 49 C59 64 49 75 35 75 C27 75 21 72 17 67 V73 H0 Z M17 49 C17 57 22 62 29 62 C37 62 42 56 42 49 C42 41 37 36 29 36 C22 36 17 41 17 49 Z' },
  { name: 'i-2', x: 117, d: 'M19 9 A9 9 0 1 1 1 9 A9 9 0 1 1 19 9 Z M2 25 H18 V73 H2 Z' },
  { name: 'punctuation', x: 145, d: 'M19 65 A9.5 9.5 0 1 1 0 65 A9.5 9.5 0 1 1 19 65 Z', blue: true },
  { name: 'u', x: 170, d: 'M0 25 H16 V52 C16 59 19 62 25 62 C31 62 35 58 35 51 V25 H51 V73 H35 V67 C31 72 25 75 18 75 C6 75 0 67 0 54 Z' },
  { name: 'z', x: 228, d: 'M0 25 H44 V38 L20 59 H44 V73 H0 V60 L24 39 H0 Z' },
];

export const WORD_Y = 291;
export const WORD_X = -7;
export const LOGO_CENTER = { x: 129, y: 183 };

export function logoDefinitions(id) {
  return `
    <linearGradient id="${id}-ink" x1="0" y1="0" x2="0.7" y2="1">
      <stop stop-color="#272d38"/><stop offset="1" stop-color="#141820"/>
    </linearGradient>
    <linearGradient id="${id}-blue" x1="90" y1="5" x2="165" y2="266" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0095ff"/><stop offset=".43" stop-color="#006bff"/><stop offset="1" stop-color="#0049ff"/>
    </linearGradient>
    <linearGradient id="${id}-face" x1="90" y1="5" x2="138" y2="235" gradientUnits="userSpaceOnUse">
      <stop stop-color="#008dff"/><stop offset="1" stop-color="#0040ed"/>
    </linearGradient>
    <linearGradient id="${id}-specular"><stop stop-color="#80d8ff" stop-opacity="0"/>
      <stop offset=".36" stop-color="#67d6ff" stop-opacity=".13"/>
      <stop offset=".5" stop-color="#e7fbff" stop-opacity=".86"/>
      <stop offset=".57" stop-color="#8ae4ff" stop-opacity=".35"/>
      <stop offset="1" stop-color="#80d8ff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="${id}-aura"><stop stop-color="#6bcfff" stop-opacity=".24"/>
      <stop offset="1" stop-color="#85d8ff" stop-opacity="0"/></radialGradient>
    <filter id="${id}-blur" x="-70%" y="-300%" width="240%" height="700%"><feGaussianBlur stdDeviation="4"/></filter>
    <clipPath id="${id}-ribbon-clip"><path d="${paths.ribbon}"/></clipPath>
    <mask id="${id}-draw-mask" maskUnits="userSpaceOnUse" x="0" y="-50" width="300" height="370">
      <path data-node="draw-mask" d="M114 -30 V194 C114 240 154 265 218 204" fill="none" stroke="white" stroke-width="180" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/>
    </mask>
    <clipPath id="${id}-logo-clip">
      ${['dot', 'stem', 'bowl', 'ribbon'].map(k => `<path d="${paths[k]}"/>`).join('')}
      ${glyphs.map(g => `<path transform="translate(${g.x + WORD_X} ${WORD_Y})" d="${g.d}" fill-rule="evenodd"/>`).join('')}
    </clipPath>`;
}

export function logoMarkup(id) {
  const ink = `url(#${id}-ink)`;
  return `
    <g data-node="lockup">
      <g data-node="body">
        <g data-part="0"><path fill="${ink}" d="${paths.dot}"/></g>
        <g data-part="1"><path fill="${ink}" d="${paths.stem}"/></g>
        <g data-part="3"><path fill="${ink}" d="${paths.bowl}"/></g>
        <g data-part="2"><g mask="url(#${id}-draw-mask)">
          <path fill="url(#${id}-blue)" d="${paths.ribbon}"/>
          <path fill="url(#${id}-face)" d="${paths.ribbonFace}" clip-path="url(#${id}-ribbon-clip)"/>
          <path fill="#0055ff" d="${paths.ribbonTurn}"/>
          <path data-node="ribbon-glint" d="M93 8 V197 C93 234 132 265 170 247" stroke="#b8efff" stroke-width="1.5" fill="none" opacity="0"/>
        </g></g>
        ${glyphs.map((g, i) => `<g transform="translate(${g.x + WORD_X} ${WORD_Y})"><g data-glyph="${i}" data-glyph-name="${g.name}"><path d="${g.d}" fill-rule="evenodd" fill="${g.blue ? '#0064ff' : ink}"/></g></g>`).join('')}
      </g>
      <path data-node="line" d="M114 8 V198" pathLength="1" stroke="#006bff" stroke-width="6" stroke-linecap="round" fill="none" stroke-dasharray="1 1"/>
      <g data-node="sweep" opacity="0">
        <ellipse data-node="aura" cy="166" rx="140" ry="126" fill="url(#${id}-aura)"/>
        <g clip-path="url(#${id}-logo-clip)"><g data-node="specular">
          <rect x="-70" y="-25" width="140" height="420" fill="url(#${id}-specular)"/>
          <rect x="-1.5" y="-25" width="3" height="420" fill="#dbf8ff" opacity=".4"/>
        </g></g>
        <ellipse data-node="streak" cy="173" rx="97" ry="1.2" fill="#73d5ff" opacity=".4"/>
      </g>
      <g data-node="ripples" stroke="#55adff" fill="none" stroke-width="1" opacity="0">
        <path d="M0 142 Q-13 162 0 182 M-12 133 Q-32 162 -12 191 M277 142 Q290 162 277 182 M289 133 Q309 162 289 191"/>
      </g>
    </g>
    <ellipse data-node="shadow" cx="114" cy="350" rx="22" ry="3.5" fill="#0070ff" filter="url(#${id}-blur)" opacity="0"/>
    <g data-node="trail" fill="#0071ff" opacity="0"><circle data-node="trail-1" cx="114" r="10"/><circle data-node="trail-2" cx="114" r="8"/></g>
    <g data-node="seed" fill="url(#${id}-blue)"><circle cx="0" cy="0" r="14"/></g>`;
}
