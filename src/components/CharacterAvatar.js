import React, { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { catalog } from '../services/shopService';
import { DEFAULT_EQUIPMENT, STARTER_EQUIPMENT } from '../services/avatarEquipment';
import { getGarmentSvg } from './shopGarments';
import {
  RACE_HUMAN_SVG,
  RACE_GOBLIN_SVG,
  EYE1_SVG,
  HAIR1_SVG,
  HAIR2_BACK_SVG,
  HAIR2_FRONT_SVG,
  HAIR3_SVG,
  HAIR4_SVG,
  HAIR5_SVG,
  HAIR6_SVG,
  SHIRT1_SVG,
  LEG1_SVG,
  SHOE1_SVG,
} from './characterSvgAssets';
import {
  BODY_SVG,
  BOOTS_SVG,
  EYES_SVG,
  GOBLIN_BODY_SVG,
  GLOVES_SVG,
  HAIR_SVG,
  HELMET2_SVG,
  HELMET_SVG,
  MOUTH_SVG,
  PANTS_SVG,
  SHIRT_SVG,
} from './newAvatarSvgAssets';

const AVATAR_STORAGE_KEY = 'everquest_user_avatar_v2';

export const DEFAULT_AVATAR_CONFIG = {
  characterName: 'Johnn',
  race: 'human',
  skinColor: '#F1C8B2',
  hair: 'hair1',
  eyes: 'eye1',
  ...DEFAULT_EQUIPMENT,
  hairColor: '#F1A261',
  eyeColor: '#33C0E2',
  shirtColor: '#2D86C6',
  pantsColor: '#492D2E',
  shoesColor: '#492D2E',
};

let memoryAvatarConfig = { ...DEFAULT_AVATAR_CONFIG };

function normalizeHair(hair) {
  return hair === 'none' ? 'none' : 'hair1';
}

export function loadSavedAvatar() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryAvatarConfig = {
          ...DEFAULT_AVATAR_CONFIG,
          ...parsed,
          hair: normalizeHair(parsed.hair),
        };
        return memoryAvatarConfig;
      }
    }
  } catch (_) {}
  return memoryAvatarConfig;
}

export function saveAvatarConfig(nextConfig) {
  const merged = {
    ...DEFAULT_AVATAR_CONFIG,
    ...nextConfig,
    hair: normalizeHair(nextConfig.hair),
  };
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
    swatchColor: '#F1C8B2',
  },
  {
    id: 'goblin',
    name: 'Goblin',
    swatchColor: '#91D56B',
  },
];

export const HUMAN_SKIN_COLORS = [
  { id: '#F1C8B2', label: 'Pele Aventureira' },
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
    name: 'Tranças Aventureiras',
    swatchColor: '#F1A261',
  },
  {
    id: 'none',
    name: 'Sem Cabelo',
    swatchColor: '#4E4679',
  },
];

export const HAIR_COLORS = [
  { id: '#F1A261', label: 'Ruivo Aventureiro' },
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

export const EYE_COLORS = [
  { id: '#33C0E2', label: 'Azul' },
  { id: '#4E311F', label: 'Castanho' },
  { id: '#2E7D32', label: 'Verde' },
  { id: '#7153FD', label: 'Roxo' },
  { id: '#B71C1C', label: 'Vermelho' },
  { id: '#E6B84D', label: 'Dourado' },
  { id: '#777777', label: 'Cinza' },
];

export const SHIRT_OPTIONS = [
  {
    id: 'shirt1',
    name: 'Túnica Azul',
    swatchColor: '#2D86C6',
  },
];

export const SHIRT_COLORS = [
  { id: '#2D86C6', label: 'Azul Aventureiro' },
  { id: '#7153FD', label: 'Roxo Everquest' },
  { id: '#1B3B8B', label: 'Azul Real' },
  { id: '#2E7D32', label: 'Verde Patrulheiro' },
  { id: '#B71C1C', label: 'Vermelho Rubi' },
  { id: '#FBA0FE', label: 'Rosa Místico' },
];

export const PANTS_OPTIONS = [
  {
    id: 'leg1',
    name: 'Bermuda de Couro',
    swatchColor: '#492D2E',
    beltColor: '#F1C8B2',
  },
];

export const PANTS_COLORS = [
  { id: '#492D2E', label: 'Couro Original' },
  { id: '#18181F', label: 'Preto Furtivo' },
  { id: '#4E311F', label: 'Couro Marrom' },
  { id: '#392682', label: 'Roxo Viajante' },
  { id: '#234930', label: 'Verde Musgo' },
];

export const SHOES_OPTIONS = [
  {
    id: 'shoe1',
    name: 'Botas de Aventureiro',
    swatchColor: '#492D2E',
  },
];

export const SHOES_COLORS = [
  { id: '#492D2E', label: 'Marrom Aventureiro' },
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
const INNER_HAIR2_BACK = extractInnerSvg(HAIR2_BACK_SVG);
const INNER_HAIR2_FRONT = extractInnerSvg(HAIR2_FRONT_SVG);
const INNER_HAIR3 = extractInnerSvg(HAIR3_SVG);
const INNER_HAIR4 = extractInnerSvg(HAIR4_SVG);
const INNER_HAIR5 = extractInnerSvg(HAIR5_SVG);
const INNER_HAIR6 = extractInnerSvg(HAIR6_SVG);
const INNER_SHIRT1 = extractInnerSvg(SHIRT1_SVG);
const INNER_LEG1 = extractInnerSvg(LEG1_SVG);
const INNER_SHOE1 = extractInnerSvg(SHOE1_SVG);
const equipmentLayers = new Map(
  [...catalog, ...STARTER_EQUIPMENT].map((item) => [item.id, extractInnerSvg(getGarmentSvg(item))])
);

// Deslocamento horizontal exato entre o corpo do raceHuman (284w) e o raceGoblin (427w)
const HUMAN_OFFSET_X = 70.824;

export default function CharacterAvatar({
  config = DEFAULT_AVATAR_CONFIG,
  width = 250,
  height = 250,
  cropToWaist = false,
}) {
  const merged = { ...DEFAULT_AVATAR_CONFIG, ...config };

  const newAvatarXml = useMemo(() => {
    const bodyColor = merged.race === 'goblin' ? '#91D56B' : merged.skinColor;
    // These offsets align the individual assets with the Group 96 reference canvas.
    const withFillColor = (svgString, sourceColor, color) =>
      extractInnerSvg(svgString).split(sourceColor).join(color);
    const layer = (svgString, x, y, scale = 1) =>
      `<g transform="translate(${x}, ${y}) scale(${scale})">${svgString}</g>`;
    const equipmentLayer = (id, x, y, scale = 1) => {
      const art = equipmentLayers.get(id);
      return art ? layer(art, x, y, scale) : '';
    };

    const bodyLayer = layer(
      merged.race === 'goblin'
        ? extractInnerSvg(GOBLIN_BODY_SVG)
        : withFillColor(BODY_SVG, '#F1C8B2', bodyColor),
      merged.race === 'goblin' ? 20.462 : 55.086,
      merged.race === 'goblin' ? 44.545 : 44.607
    );
    const hairLayer =
      merged.hair !== 'none'
        ? layer(withFillColor(HAIR_SVG, '#F1A261', merged.hairColor), 11.012, 42.877)
        : '';
    const shoesLayer =
      merged.shoes === 'none'
        ? ''
        : merged.shoes === 'shoe1'
          ? layer(
              withFillColor(BOOTS_SVG, '#492D2E', merged.shoesColor),
              54.371,
              414.726
            )
          : equipmentLayer(merged.shoes, 60.56, 439.46);
    const shirtLayer =
      merged.shirt === 'none'
        ? ''
        : merged.shirt === 'shirt1'
          ? layer(
              withFillColor(
                withFillColor(SHIRT_SVG, '#2D86C6', merged.shirtColor),
                '#F1C8B2',
                bodyColor
              ),
              65.111,
              211.609
            )
          : equipmentLayer(merged.shirt, 72.65, 229.27);
    const pantsLayer =
      merged.pants === 'none'
        ? ''
        : merged.pants === 'leg1'
          ? layer(withFillColor(PANTS_SVG, '#492D2E', merged.pantsColor), 97.147, 339.698)
          : equipmentLayer(merged.pants, 64.13, 322.9);
    const glovesLayer = layer(GLOVES_SVG, 32.619, 350.297);
    const helmetLayer =
      merged.head === 'none'
        ? layer(HELMET_SVG, 0, 0)
        : merged.head === 'helmet2'
          ? layer(HELMET2_SVG, 68.5, 0, 0.87)
          : equipmentLayer(merged.head, 36, 0, 1.48);
    const coloredEyes = EYES_SVG.replaceAll('#33C0E2', merged.eyeColor);
    const eyesSvg =
      merged.race === 'goblin'
        ? coloredEyes.replace(/(<path\b[^>]*\bfill=")white(")/gi, '$1#FFEF64$2')
        : coloredEyes;
    const eyesLayer =
      merged.eyes !== 'none' ? layer(eyesSvg, 84.141, 116.342) : '';
    const mouthLayer = layer(MOUTH_SVG, 97.5, 169.905);
    const weaponLayer = equipmentLayer(merged.weapon, 204, 341, 1.18);
    const viewBox = cropToWaist ? '0 0 337 350' : '0 0 337 566';

    return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${bodyLayer}
      ${pantsLayer}
      ${hairLayer}
      ${shirtLayer}
      ${glovesLayer}
      ${shoesLayer}
      ${helmetLayer}
      ${eyesLayer}
      ${mouthLayer}
      ${weaponLayer}
    </svg>`;
  }, [
    merged.race,
    merged.skinColor,
    merged.hair,
    merged.eyes,
    merged.eyeColor,
    merged.shirt,
    merged.pants,
    merged.shoes,
    merged.head,
    merged.weapon,
    merged.hairColor,
    merged.shirtColor,
    merged.pantsColor,
    merged.shoesColor,
    cropToWaist,
  ]);

  const composedXml = useMemo(() => {
    if (merged.avatarStyle !== 'classic') return '';

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
        ? `<g transform="translate(${HUMAN_OFFSET_X + 60.56}, 439.46)">${equipmentLayers.get(merged.shoes) || shoesColored}</g>`
        : '';

    const pantsColored = merged.pantsColor
      ? INNER_LEG1.replace(/#272E59/gi, merged.pantsColor)
      : INNER_LEG1;
    const pantsLayer =
      merged.pants !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X + 64.13}, 322.9)">${equipmentLayers.get(merged.pants) || pantsColored}</g>`
        : '';

    const shirtColored = merged.shirtColor
      ? INNER_SHIRT1.replace(/#222123/gi, merged.shirtColor)
      : INNER_SHIRT1;
    const shirtLayer =
      merged.shirt !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X + 72.65}, 229.27)">${equipmentLayers.get(merged.shirt) || shirtColored}</g>`
        : '';

    const eyesColored = isGoblin
      ? INNER_EYE1.replace(/fill="white"/gi, 'fill="#FFEF64"')
      : INNER_EYE1;
    const eyesLayer =
      merged.eyes !== 'none'
        ? `<g transform="translate(${HUMAN_OFFSET_X + 50.3}, 128.7)">${eyesColored}</g>`
        : '';

    const colorizeHair = (svgInner) =>
      merged.hairColor
        ? svgInner.replace(/#1B0700/gi, merged.hairColor)
        : svgInner;

    const isHair2 = merged.hair === 'hair2';
    const hair2BackColored = colorizeHair(INNER_HAIR2_BACK);
    const hair2FrontColored = colorizeHair(INNER_HAIR2_FRONT);

    // A parte longa de trás do hair2 fica atrás da cabeça/corpo/roupas
    const backHairLayer = isHair2
      ? `<g transform="translate(${HUMAN_OFFSET_X - 28.5}, -64.5)">${hair2BackColored}</g>`
      : '';

    // A franja e o topo do cabelo ficam na frente do rosto e dos olhos
    let hairLayer = '';
    if (merged.hair === 'hair2') {
      hairLayer = `<g transform="translate(${HUMAN_OFFSET_X - 28.5}, -64.5)">${hair2FrontColored}</g>`;
    } else if (merged.hair === 'hair3') {
      hairLayer = `<g transform="translate(${HUMAN_OFFSET_X - 40.5}, -62)">${colorizeHair(INNER_HAIR3)}</g>`;
    } else if (merged.hair === 'hair4') {
      hairLayer = `<g transform="translate(${HUMAN_OFFSET_X - 35.5}, -112)">${colorizeHair(INNER_HAIR4)}</g>`;
    } else if (merged.hair === 'hair5') {
      hairLayer = `<g transform="translate(${HUMAN_OFFSET_X - 45.5}, -56)">${colorizeHair(INNER_HAIR5)}</g>`;
    } else if (merged.hair === 'hair6') {
      hairLayer = `<g transform="translate(${HUMAN_OFFSET_X - 27.5}, -44)">${colorizeHair(INNER_HAIR6)}</g>`;
    } else if (merged.hair !== 'none') {
      hairLayer = `<g transform="translate(${HUMAN_OFFSET_X - 26.02}, -54.32)">${colorizeHair(INNER_HAIR1)}</g>`;
    }

    const headArt = equipmentLayers.get(merged.head);
    const headLayer = merged.head === 'helmet2'
      ? `<g transform="translate(113.5, -91) scale(0.87)">${extractInnerSvg(HELMET2_SVG)}</g>`
      : headArt ? `<g transform="translate(107, -91) scale(1.48)">${headArt}</g>` : '';
    const weaponArt = equipmentLayers.get(merged.weapon);
    const weaponLayer = weaponArt
      ? `<g transform="translate(275, 341) rotate(28) scale(1.18) translate(-37, -113)">${weaponArt}</g>`
      : '';

    // Quando cropToWaist=true (usado no banner da tela de Perfil), corta na altura da calça/bolsos igual ao print enviado
    const viewBox = cropToWaist ? '0 -115 427 483' : '0 -115 427 615';

    return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${backHairLayer}
      ${raceLayer}
      ${shoesLayer}
      ${shirtLayer}
      ${pantsLayer}
      ${eyesLayer}
      ${hairLayer}
      ${headLayer}
      ${weaponLayer}
    </svg>`;
  }, [
    merged.avatarStyle,
    merged.race,
    merged.skinColor,
    merged.hair,
    merged.eyes,
    merged.shirt,
    merged.pants,
    merged.shoes,
    merged.head,
    merged.weapon,
    merged.hairColor,
    merged.shirtColor,
    merged.pantsColor,
    merged.shoesColor,
    cropToWaist,
  ]);

  const avatarXml = merged.avatarStyle === 'classic' ? composedXml : newAvatarXml;
  return <SvgXml xml={avatarXml} width={width} height={height} />;
}
