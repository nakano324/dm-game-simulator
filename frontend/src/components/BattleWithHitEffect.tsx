// src/components/BattleWithHitEffect.tsx
import React, { useState, useEffect } from 'react';
import { getCivilizationGradient } from '../utils/gradients';
import ShieldHitEffect from './ShieldHitEffect';  // ヒットエフェクト用コンポーネント

export type BattleWithHitEffectProps = {
  id: string;
  isHit: boolean;
  card: {
    id: string;
    cost?: number;
    civilizations?: string[];
    image_url?: string;
    name: string;
    power?: number;
  };
};

const BattleWithHitEffect: React.FC<BattleWithHitEffectProps> = ({
  id,
  isHit,
  card
}) => {
  const [effectKey, setEffectKey] = useState(0);

  useEffect(() => {
    if (!isHit) return;
    const interval = setInterval(() => {
      setEffectKey(k => k + 1);
    }, 700);
    return () => clearInterval(interval);
  }, [isHit]);

  return (
    <div
      id={id}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 80,
        height: 120,
        marginRight: '12px',
        boxSizing: 'border-box'
      }}
    >
      {/* コスト丸 */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: getCivilizationGradient(card.civilizations || []),
          color: 'white',
          fontSize: '12px',
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

      <img
        src={card.image_url || 'https://placehold.jp/120x180.png'}
        alt={card.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '0 0 6px 6px',
          pointerEvents: 'none',
        }}
      />

      {/* ヒット時は毎回キーを変えて再マウント */}
      {isHit && <ShieldHitEffect key={effectKey} />}
    </div>
  );
};

export default BattleWithHitEffect;
