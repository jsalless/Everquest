import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import {
  RACE_HUMAN_SVG,
  RACE_GOBLIN_SVG,
  EYE1_SVG,
  HAIR1_SVG,
  SHIRT1_SVG,
  LEG1_SVG,
  SHOE1_SVG,
} from './characterSvgAssets';

const AVATAR_STORAGE_KEY = 'everquest_user_avatar_v2';

export const DEFAULT_AVATAR_CONFIG = {
  characterName: 'Johnn',
  race: 'human',
  skinColor: '#D5896B',
  hair: 'hair1',
  eyes: 'eye1',
  shirt: 'shirt1',
  pants: 'leg1',
  shoes: 'shoe1',
  hairColor: '#1B0700',
  shirtColor: '#222123',
  pantsColor: '#272E59',
  shoesColor: '#487762',
};

let memoryAvatarConfig = { ...DEFAULT_AVATAR_CONFIG };

export function loadSavedAvatar() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...parsed };
        return memoryAvatarConfig;
      }
    }
  } catch (_) {}
  return memoryAvatarConfig;
}

export function saveAvatarConfig(nextConfig) {
  const merged = { ...DEFAULT_AVATAR_CONFIG, ...nextConfig };
  memoryAvatarConfig = merged;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(merged));
    }
  } catch (_) {}
  return merged;
}

export const RACE_OPTIONS = [
  {
    id: 'human',
    name: 'Humano',
    swatchColor: '#D5896B',
  },
  {
    id: 'goblin',
    name: 'Goblin',
    swatchColor: '#91D56B',
  },
];

export const HUMAN_SKIN_COLORS = [
  { id: '#F4C2A8', label: 'Pele Clara' },
  { id: '#E5A687', label: 'Pele Média Clara' },
  { id: '#D5896B', label: 'Pele Original' },
  { id: '#B86B4B', label: 'Pele Morena' },
  { id: '#8D4A32', label: 'Pele Escura' },
  { id: '#5C2E1E', label: 'Pele Retinta' },
];

export const HAIR_OPTIONS = [
  {
    id: 'hair1',
    name: 'Cabelo Aventureiro',
    swatchColor: '#1B0700',
  },
  {
    id: 'none',
    name: 'Sem Cabelo',
    swatchColor: '#4E4679',
  },
];

export const HAIR_COLORS = [
  { id: '#1B0700', label: 'Castanho Escuro' },
  { id: '#0F0F14', label: 'Preto Noite' },
  { id: '#8D3B1E', label: 'Ruivo Brasa' },
  { id: '#E6B84D', label: 'Loiro Solar' },
  { id: '#7153FD', label: 'Roxo Arcano' },
  { id: '#E2E8F0', label: 'Prateado' },
];

export const EYES_OPTIONS = [
  {
    id: 'eye1',
    name: 'Olhos Emocionados',
    swatchColor: '#FFFFFF',
  },
];

export const SHIRT_OPTIONS = [
  {
    id: 'shirt1',
    name: 'Camisa Clássica',
    swatchColor: '#222123',
  },
];

export const SHIRT_COLORS = [
  { id: '#222123', label: 'Preto Original' },
  { id: '#7153FD', label: 'Roxo Everquest' },
  { id: '#1B3B8B', label: 'Azul Real' },
  { id: '#2E7D32', label: 'Verde Patrulheiro' },
  { id: '#B71C1C', label: 'Vermelho Rubi' },
  { id: '#FBA0FE', label: 'Rosa Místico' },
];

export const PANTS_OPTIONS = [
  {
    id: 'leg1',
    name: 'Calça com Cinto',
    swatchColor: '#272E59',
    beltColor: '#FFEF64',
  },
];

export const PANTS_COLORS = [
  { id: '#272E59', label: 'Azul Original' },
  { id: '#18181F', label: 'Preto Furtivo' },
  { id: '#4E311F', label: 'Couro Marrom' },
  { id: '#392682', label: 'Roxo Viajante' },
  { id: '#234930', label: 'Verde Musgo' },
];

export const SHOES_OPTIONS = [
  {
    id: 'shoe1',
    name: 'Calçado Viajante',
    swatchColor: '#487762',
  },
];

export const SHOES_COLORS = [
  { id: '#487762', label: 'Verde Original' },
  { id: '#272E59', label: 'Azul Marinho' },
  { id: '#222123', label: 'Preto Sombrio' },
  { id: '#7153FD', label: 'Roxo Arcano' },
  { id: '#6D4C41', label: 'Marrom Couro' },
];

function extractInnerSvg(svgString) {
  return svgString
    .replace(/^<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
    .trim();
}

const INNER_RACE_HUMAN = extractInnerSvg(RACE_HUMAN_SVG);
const INNER_RACE_GOBLIN = extractInnerSvg(RACE_GOBLIN_SVG);
const INNER_EYE1 = extractInnerSvg(EYE1_SVG);
const INNER_HAIR1 = extractInnerSvg(HAIR1_SVG);
const INNER_SHIRT1 = extractInnerSvg(SHIRT1_SVG);
const INNER_LEG1 = extractInnerSvg(LEG1_SVG);
const INNER_SHOE1 = extractInnerSvg(SHOE1_SVG);

// Deslocamento horizontal exato entre o corpo do raceHuman (284w) e o raceGoblin (427w)
const HUMAN_OFFSET_X = 70.824;

export default function CharacterAvatar({
  config = DEFAULT_AVATAR_CONFIG,
  width = 250,
  height = 250,
  cropToWaist = false,
}) {
  const merged = { ...DEFAULT_AVATAR_CONFIG, ...config };

  const composedXml = useMemo(() => {
    const isGoblin = merged.race === 'goblin';
    const humanColored = merged.skinColor
      ? INNER_RACE_HUMAN.replace(/#D5896B/gi, merged.skinColor)
      : INNER_RACE_HUMAN;
    const raceLayer = isGoblin
      ? `<g transform="translate(0, 0)">${INNER_RACE_GOBLIN}</g>`
      : `<g transform="translate(${HUMAN_OFFSET_X}, 0)">${humanColored}</g>`;

    const shoesColored = merged.shoesColor
      ? INNER_SHOE1.replace(/#487762/gi, merged.shoesColor)
      : INNER_SHOE1;
    const shoesLayer =
      merged.shoes !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X + 60.56}, 439.46)">${shoesColored}</g>`
        : '';

    const pantsColored = merged.pantsColor
      ? INNER_LEG1.replace(/#272E59/gi, merged.pantsColor)
      : INNER_LEG1;
    const pantsLayer =
      merged.pants !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X + 64.13}, 322.9)">${pantsColored}</g>`
        : '';

    const shirtColored = merged.shirtColor
      ? INNER_SHIRT1.replace(/#222123/gi, merged.shirtColor)
      : INNER_SHIRT1;
    const shirtLayer =
      merged.shirt !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X + 72.65}, 229.27)">${shirtColored}</g>`
        : '';

    const eyesColored = isGoblin
      ? INNER_EYE1.replace(/fill="white"/gi, 'fill="#FFEF64"')
      : INNER_EYE1;
    const eyesLayer =
      merged.eyes !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X + 50.3}, 128.7)">${eyesColored}</g>`
        : '';

    const hairColored = merged.hairColor
      ? INNER_HAIR1.replace(/#1B0700/gi, merged.hairColor)
      : INNER_HAIR1;
    const hairLayer =
      merged.hair !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X - 26.02}, -54.32)">${hairColored}</g>`
        : '';

    // Quando cropToWaist=true (usado no banner da tela de Perfil), corta na altura da calça/bolsos igual ao print enviado
    const viewBox = cropToWaist ? '0 -62 427 430' : '0 -62 427 562';

    return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${raceLayer}
      ${shoesLayer}
      ${shirtLayer}
      ${pantsLayer}
      ${eyesLayer}
      ${hairLayer}
    </svg>`;
  }, [
    merged.race,
    merged.skinColor,
    merged.hair,
    merged.eyes,
    merged.shirt,
    merged.pants,
    merged.shoes,
    merged.hairColor,
    merged.shirtColor,
    merged.pantsColor,
    merged.shoesColor,
    cropToWaist,
  ]);

  return <SvgXml xml={composedXml} width={width} height={height} />;
}
