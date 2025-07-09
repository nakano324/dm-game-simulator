// src/utils/gradients.ts

/** 文明ごとのベースカラー */
export function getCivilizationColor(civ: string): string {
  switch (civ) {
    case '赤': return '#F5293B';
    case '青': return '#028CD1';
    case '緑': return '#388746';
    case '黒': return '#5E5C5E';
    case '白': return '#FAFF63';
    default:  return 'black';
  }
}

/** 複数文明に対応したグラデーション生成 */
export function getCivilizationGradient(civs: string[]): string {
  const colors = civs.map(getCivilizationColor);
  if (colors.length === 1) {
    return colors[0];
  } else if (colors.length === 2) {
    return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  } else if (colors.length >= 3) {
    return `conic-gradient(${colors[0]} 0deg 120deg, ${colors[1]} 120deg 240deg, ${colors[2]} 240deg 360deg)`;
  }
  return 'black';
}

/** 文明ごとの発光エフェクト背景（召喚時オーラ用） */
export function getAuraGradient(civs: string[]): string {
  const mapColor = (c: string) => {
    switch (c) {
      case "青": return "rgba(0,150,255,0.5)";
      case "赤": return "rgba(255,50,0,0.5)";
      case "緑": return "rgba(0,200,0,0.5)";
      case "黒": return "rgba(124, 66, 152, 0.5)";
      case "白": return "rgba(255,215,0,0.5)";
      default: return "rgba(255,255,255,0.5)";
    }
  };

  if (civs.length === 1) {
    const color = mapColor(civs[0]);
    return `radial-gradient(circle, ${color} 0%, transparent 80%)`;
  } else if (civs.length === 2) {
    const [c1, c2] = civs.map(mapColor);
    return `radial-gradient(circle, ${c1} 0%, ${c2} 60%, transparent 100%)`;
  } else {
    const cols = civs.map(mapColor).join(", ");
    return `conic-gradient(${cols}, transparent)`;
  }
}
