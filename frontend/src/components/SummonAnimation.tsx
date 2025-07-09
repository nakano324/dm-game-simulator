// src/components/SummonAnimation.tsx
import React from "react";
import type { CSSProperties } from "react";
import { getAuraGradient } from '../utils/gradients';

type SummonAnimationProps = {
  card: {
    name: string;
    cost: number;
    image_url: string;
    civilizations: string[];
  };
  position?: "self" | "opponent"; // 自分 or 相手
  onEnd?: () => void;
};

export const SummonAnimation: React.FC<SummonAnimationProps> = ({ card, position = "self", onEnd }) => {
  const topStyle = position === "self" ? "50%" : "20%";

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onEnd) onEnd();
    }, 1600);
    return () => {
      clearTimeout(timer);
      if (onEnd) onEnd(); // ★アンマウント時も呼ぶ
    };
  }, [onEnd]);

  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: topStyle,
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    width: 120,
    height: 180,
  };

  return (
    <div style={containerStyle} className="animate-summon">
      {/* 文明付きコスト○ */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: getCivilizationGradient(card.civilizations || []),
          color: 'white',
          fontSize: 12,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 1px white',
          zIndex: 10,
        }}
      >
        {card.cost}
      </div>

      {/* カード画像 */}
      <img
        src={card.image_url || "https://placehold.jp/120x180.png"}
        alt={card.name}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      />

      {/* 文明オーラ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: 8,
          pointerEvents: 'none',
          background: getAuraGradient(card.civilizations || []),
        }}
        className="animate-aura"
      />
    </div>
  );
};

// 既存の getCivilizationGradient を再利用可能なら import に切り出す
function getCivilizationGradient(civs: string[]): string {
  const colors = civs.map(getCivilizationColor);
  if (colors.length === 1) {
    return colors[0];
  } else if (colors.length === 2) {
    return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  } else if (colors.length >= 3) {
    return `conic-gradient(${colors[0]} 0deg 120deg, ${colors[1]} 120deg 240deg, ${colors[2]} 240deg 360deg)`;
  } else {
    return 'black';
  }
}

function getCivilizationColor(civ: string): string {
  switch (civ) {
    case "赤": return "#F5293B";
    case "青": return "#028CD1";
    case "緑": return "#388746";
    case "黒": return "#5E5C5E";
    case "白": return "#FAFF63";
    default: return "black";
  }
}
