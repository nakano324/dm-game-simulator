// src/components/ShieldWithHitEffect.tsx
import React, { useState, useEffect } from 'react';
import ShieldHitEffect from './ShieldHitEffect';
import backImage from '../assets/back_of_card.png';

export type ShieldWithHitEffectProps = {
  id: string;
  isHit: boolean;
};

const ShieldWithHitEffect: React.FC<ShieldWithHitEffectProps> = ({ id, isHit }) => {
  const [effectKey, setEffectKey] = useState(0);

  // isHitがtrueの間は0.7秒ごとにeffectKeyを増やし続ける
  useEffect(() => {
    if (!isHit) return;
    const interval = setInterval(() => {
      setEffectKey(k => k + 1);
    }, 700); // 0.7秒ごとに波紋再生
    return () => clearInterval(interval);
  }, [isHit]);

  return (
    <div
      id={id}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 48,
        height: 72,
        margin: '0 1px',
        boxSizing: 'border-box'
      }}
    >
      <img
        src={backImage}
        alt="カード裏面"
        className="w-[48px] h-[72px] m-[0_2px] rounded shadow"
      />
      {isHit && <ShieldHitEffect key={effectKey} />}
    </div>
  );
};

export default ShieldWithHitEffect;
