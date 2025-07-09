import React from 'react';
import manaCircle from '../assets/Mana_zone.png';

type ManaRingProps = {
  /** マナゾーンのカード配列 */
  manaZone: { civilizations?: string[] }[];
  /** 使用可能なマナ数 */
  available: number;
  /** マナゾーン内の合計カード数 */
  total: number;
  /** SVG のサイズ(px) */
  size?: number;
  /** リングの太さ(px) */
  strokeWidth?: number;
  /** 使用済み部分に重ねるオーバーレイ色 */
  overlayColor?: string;
  /** 背景色(不要なら使わない) */
  bgColor?: string;
};

/**
 * マナゾーンのカードから文明情報をユニーク抽出
 */
function getManaZoneCivilizations(
  manaZone: { civilizations?: string[] }[]
): string[] {
  const set = new Set<string>();
  manaZone.forEach(card => {
    (card.civilizations || []).forEach(c => set.add(c));
  });
  return Array.from(set);
}

/**
 * 文明ごとの色マッピング
 */
function getCivilizationColor(civ: string): string {
  switch (civ) {
    case '赤': return '#F5293B';
    case '青': return '#028CD1';
    case '緑': return '#388746';
    case '黒': return '#5E5C5E';
    case '白': return '#FAFF63';
    default:  return '#888';
  }
}

/**
 * 複数文明に対応したグラデーション生成
 */
function getCivilizationGradient(civs: string[]): string {
  const colors = civs.map(getCivilizationColor);
  if (colors.length === 1) {
    return colors[0];
  } else if (colors.length === 2) {
    return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  } else if (colors.length >= 3) {
    return `conic-gradient(${colors.map((c, i) => `${c} ${i * (360 / colors.length)}deg ${(i + 1) * (360 / colors.length)}deg`).join(', ')})`;
  }
  return '#888';
}

/**
 * マナリングを描画するコンポーネント
 */
const ManaRing: React.FC<ManaRingProps> = ({
  manaZone,
  available,
  total,
  size = 160,
  strokeWidth = 10,
  overlayColor = 'rgba(0,0,0,0.6)',
}) => {
  const civs       = getManaZoneCivilizations(manaZone);
  const colors     = civs.map(getCivilizationColor);
  const radius     = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio      = total > 0 ? available / total : 0;

  return (
    <svg width={size} height={size}>
      <defs>
        <clipPath id="coreClip">
          <circle cx={size/2} cy={size/2} r={radius} />
        </clipPath>
      </defs>

      {/* 背景画像 */}
      <image
        href={manaCircle}
        x={strokeWidth/2}
        y={strokeWidth/2}
        width={size - strokeWidth}
        height={size - strokeWidth}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#coreClip)"
      />

      {/* 文明色リング */}
      {colors.length <= 1
        ? <circle
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke={ total === 0 ? '#fff' : colors[0] }
            strokeWidth={strokeWidth}
          />
        : colors.map((col, i) => {
            const segment = circumference / colors.length;
            return (
              <circle
                key={i}
                cx={size/2}
                cy={size/2}
                r={radius}
                fill="none"
                stroke={col}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segment} ${circumference - segment}`}
                strokeDashoffset={-segment * i}
                transform={`rotate(-90 ${size/2} ${size/2})`}
              />
            );
          })
      }

      {/* 使用不可部分のオーバーレイ */}
      {total > 0 && available < total && (
        <circle
          cx={size/2}
          cy={size/2}
          r={radius}
          fill="none"
          stroke={overlayColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * (1 - ratio)} ${circumference * ratio}`}
          strokeDashoffset={-circumference * ratio}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.2s, stroke-dashoffset 0.2s' }}
        />
      )}

      {/* 数字表示 */}
      <text
        x="50%" y="50%"
        fill="#fff"
        fontSize={size * 0.25}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {available}/{total}
      </text>
    </svg>
  );
};

export default ManaRing;
