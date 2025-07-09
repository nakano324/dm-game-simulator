// src/components/ManaAnimation.tsx
import React from "react";
import { getCivilizationGradient } from "../utils/gradients";
import { ManaParticles } from './ManaParticles';

type ManaAnimationProps = {
  card: {
    id: string;
    name: string;
    cost: number;
    image_url: string;
    civilizations: string[];
  };
  isOpponent?: boolean; // ★追加
};

export const ManaAnimation: React.FC<ManaAnimationProps> = ({ card, isOpponent = false }) => {
  // 位置とアニメーション名を切り替え
  const style: React.CSSProperties = isOpponent
    ? {
        position: 'fixed',
        right: 24,
        top: 10, // ←相手用は上から
        width: 110,
        height: 165,
        zIndex: 10001,
        pointerEvents: 'none',
        animation: 'mana-card-drop-opponent 0.45s cubic-bezier(0.17,0.67,0.7,1.3)',
        borderRadius: '12px',
        overflow: 'visible',
        boxShadow: '0 4px 20px 4px rgba(0,0,0,0.12)',
      }
    : {
        position: 'fixed',
        right: 24,
        bottom: 18,
        width: 110,
        height: 165,
        zIndex: 10001,
        pointerEvents: 'none',
        animation: 'mana-card-drop 0.45s cubic-bezier(0.17,0.67,0.7,1.3)',
        borderRadius: '12px',
        overflow: 'visible',
        boxShadow: '0 4px 20px 4px rgba(0,0,0,0.12)',
      };

  return (
    <div style={style}>
      {/* 文明コスト○ */}
      <div style={{
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
      }}>
        {card.cost}
      </div>

      <img
        src={card.image_url || 'https://placehold.jp/120x180.png'}
        alt={card.name}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      />

      <style>{`
        @keyframes mana-card-drop {
          0%   { opacity: 0; transform: translateY(80px) scale(0.8); }
          80%  { opacity: 1; transform: translateY(-6px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mana-card-drop-opponent {
          0%   { opacity: 0; transform: translateY(-80px) scale(0.8); }
          80%  { opacity: 1; transform: translateY(6px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {card.civilizations?.[0] && (
        <ManaParticles
          civilization={card.civilizations[0]}
          triggerKey={(card.name.length + card.cost).toString()} />
      )}
      <ManaParticles
        civilization={card.civilizations?.[0] || '白'}
        triggerKey={card.id}
      />
    </div>
  );
};
