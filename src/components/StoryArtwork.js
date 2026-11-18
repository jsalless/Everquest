import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function ForestArtwork() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 180" preserveAspectRatio="xMaxYMid slice">
      <Circle cx="317" cy="50" r="32" fill="#D9F3A5" opacity=".8" />
      <Path d="M75 180L240 50l46 55 31-29 83 63v41Z" fill="#32635B" />
      <Path d="M168 180l97-91 45 53 24-21 66 39v20Z" fill="#43866A" />
      <Path d="M160 180c65-20 114-24 154-15 33 8 52-1 86-7v22Z" fill="#80B877" />
      <Path d="M274 180c38-10 45-15 50-26h14c-6 10-1 16 17 26Z" fill="#D8DE9B" />
      <Path d="M310 154v-28a17 17 0 0 1 34 0v28Z" fill="#315458" stroke="#C1E394" strokeWidth="4" />
      <Path d="M318 154v-28a9 9 0 0 1 18 0v28Z" fill="#B5F1BB" />
      <Path d="M360 167V110m-14 40 14-29 15 29Zm-3-18 17-28 17 28ZM385 172v-85m-17 63 17-37 18 37Zm-4-25 21-40 20 40ZM250 166v-52m-13 39 13-27 13 27Zm-3-17 16-28 16 28Z" fill="#123E37" stroke="#123E37" strokeWidth="2" />
      <Path d="M270 76v12m-6-6h12m75 5v8m-4-4h8m-72 39v8m-4-4h8" stroke="#CFEE9E" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function StoryIcon({ kind, color, size = 28 }) {
  const shapes = {
    spark: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z',
    leaf: 'M5 18C2 9 9 4 20 4c0 11-5 18-14 15m-3 3L15 10',
    bridge: 'M2 17h20M4 17v-6m16 6v-6M4 12c4 0 4-5 8-5s4 5 8 5m-8 0v5',
    chest: 'M3 9h18v11H3Zm0 0V6l3-3h12l3 3v3m-9 3v4',
    rune: 'M12 2l8 7-8 13-8-13 8-7Zm-3 9 3-4 3 4-3 5Z',
    portal: 'M4 21V10a8 8 0 1 1 16 0v11Zm4 0V10a4 4 0 1 1 8 0v11',
    lock: 'M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5Zm7 4v2',
    check: 'M4 12l5 5L20 6',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={shapes[kind]} stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TrailLandmark({ kind, color }) {
  return (
    <Svg width={46} height={44} viewBox="0 0 46 44" fill="none">
      {kind === 'trees' ? (
        <Path d="M14 39V13m-8 18 8-14 8 14Zm2-10 6-12 6 12ZM30 38V9m-10 23 10-17 11 17Zm3-11 7-14 7 14Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <>
          <Path d="M6 36h34M12 34l5-20 11 3 5 17ZM27 17l5-8 8 14-3 8" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <Rect x="19" y="21" width="6" height="6" rx="1" transform="rotate(-15 22 24)" fill={color} />
        </>
      )}
    </Svg>
  );
}
