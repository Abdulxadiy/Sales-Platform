import { paths } from './logo.js';

// Shared by React and the initial HTML, so refreshing never switches designs.
export function loaderMarkup(id) {
  return `<svg class="ilbi-loader__art" viewBox="0 0 600 600" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${id}-blue" x1="90" y1="5" x2="165" y2="266" gradientUnits="userSpaceOnUse"><stop stop-color="#0084ff"/><stop offset=".55" stop-color="#006bff"/><stop offset="1" stop-color="#0051ff"/></linearGradient>
      <linearGradient id="${id}-shine"><stop stop-color="white" stop-opacity="0"/><stop offset=".5" stop-color="white" stop-opacity=".65"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
      <clipPath id="${id}-ribbon"><path d="${paths.ribbon}"/></clipPath>
    </defs>
    <g class="ilbi-loader__orbit">
      <circle class="ilbi-loader__arc" cx="300" cy="300" r="238" pathLength="360" transform="rotate(-137 300 300)"/>
      <circle class="ilbi-loader__arc" cx="300" cy="300" r="238" pathLength="360" transform="rotate(-17 300 300)"/>
      <circle class="ilbi-loader__arc ilbi-loader__arc--blue" cx="300" cy="300" r="238" pathLength="360" transform="rotate(103 300 300)"/>
    </g>
    <g transform="translate(156.8 158.4) scale(1.04)">
      <g fill="currentColor"><path d="${paths.dot}"/><path d="${paths.stem}"/><path d="${paths.bowl}"/></g>
      <path d="${paths.ribbon}" fill="url(#${id}-blue)"/>
      <path d="${paths.ribbonFace}" fill="#0072ff" clip-path="url(#${id}-ribbon)"/>
      <path d="${paths.ribbonTurn}" fill="#0059ff"/>
      <g clip-path="url(#${id}-ribbon)"><rect class="ilbi-loader__shine" x="-50" y="-20" width="110" height="350" fill="url(#${id}-shine)"/></g>
    </g>
  </svg>`;
}
