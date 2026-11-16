import React, { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';

export function buildProfileLink(user) {
  if (!user?.id) return null;
  return `everquest://add-friend?id=${encodeURIComponent(String(user.id))}`;
}

export function parseProfileLink(value) {
  const match = /^everquest:\/\/add-friend\?([^#]+)$/i.exec(String(value || '').trim());
  if (!match) return null;
  const id = new URLSearchParams(match[1]).get('id');
  return id ? { friendId: id } : null;
}

export default function ProfileQrCode({ value, size = 140 }) {
  const code = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    return qr;
  }, [value]);
  const count = code.getModuleCount();
  const quietZone = 4;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count + quietZone * 2} ${count + quietZone * 2}`}>
      <Rect width="100%" height="100%" fill="#FFFFFF" />
      {Array.from({ length: count }, (_, row) =>
        Array.from({ length: count }, (_, column) =>
          code.isDark(row, column) ? (
            <Rect key={`${row}-${column}`} x={column + quietZone} y={row + quietZone} width={1} height={1} fill="#111111" />
          ) : null
        )
      )}
    </Svg>
  );
}
