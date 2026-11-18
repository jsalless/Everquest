import { SHIRT1_SVG, LEG1_SVG, SHOE1_SVG } from './characterSvgAssets';

const bases = {
  shirt: [SHIRT1_SVG, /#222123/gi],
  pants: [LEG1_SVG, /#272E59|#FFEF64/gi],
  shoes: [SHOE1_SVG, /#487762/gi],
};

const details = {
  'shirt-astral': '<path d="M71 27l4 14 14 4-14 4-4 14-4-14-14-4 14-4z" fill="ACCENT"/><path d="M86 29h8m-4-4v8M40 89h60" stroke="ACCENT" stroke-width="2" stroke-linecap="round"/>',
  'shirt-forest': '<path d="M63 56c0-15 9-24 23-25 0 15-8 26-23 25z" fill="ACCENT"/><path d="M57 63l20-22M44 76h55" stroke="ACCENT" stroke-width="2" stroke-linecap="round"/>',
  'pants-guardian': '<path d="M31 53l-3 32m78-32 3 32" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/>',
  'pants-dusk': '<path d="M32 63l10 7 11-7m39 0 10 7 11-7m-81 5 10 7 11-7m39 0 10 7 11-7" fill="none" stroke="ACCENT" stroke-width="2"/>',
  'shoes-ember': '<path d="M22 18l7 6 8-7m60 1 7 6 8-7" fill="none" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/>',
  'shoes-frost': '<path d="M28 12v15m-7-11 14 7m0-7-14 7m84-11v15m-7-11 14 7m0-7-14 7" stroke="ACCENT" stroke-width="2" stroke-linecap="round"/>',
};

const standaloneArt = {
  'head-traveler': '<svg viewBox="0 0 144 96" xmlns="http://www.w3.org/2000/svg"><path d="M22 61 39 15Q69 0 104 15l16 46m-97 0c-21 0-23 13-9 19 29 12 86 13 117 0 14-6 10-19-11-19Z" fill="COLOR" stroke="#181128" stroke-width="5" stroke-linejoin="round"/><path d="M33 51q37 14 78 0l4 14q-45 16-88 0Z" fill="#302146"/><path d="M64 54h17v15H64z" fill="none" stroke="ACCENT" stroke-width="4" stroke-linejoin="round"/></svg>',
  'weapon-wood': '<svg viewBox="0 0 74 138" xmlns="http://www.w3.org/2000/svg"><path d="M28 86V24L37 5l9 19v62m-14 8v33h10V94M14 85h46v10H14z" fill="COLOR" stroke="#392321" stroke-width="5" stroke-linejoin="round"/><path d="M37 24v54m-17 11h34m-21 24 8-7m-8 15 8-7" fill="none" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/></svg>',
};

export function getGarmentSvg(item) {
  const art = standaloneArt[item.id];
  if (art) return art.replaceAll('COLOR', item.color).replaceAll('ACCENT', item.accent);
  const [base, palette] = bases[item.slot];
  return base
    .replace(palette, (color) => color.toUpperCase() === '#FFEF64' ? item.accent : item.color)
    .replace('</svg>', `${details[item.id].replaceAll('ACCENT', item.accent)}</svg>`);
}
