import React from 'react';

const ShieldHitEffect: React.FC = () => {
    const arrowHeadHeight = 40;
  const pulseMaxRadius = arrowHeadHeight * 1.0;
  const pulseAlpha = 0.22;

  return (
    <svg
      width={48} height={72}
      style={{
        position: 'absolute', left: 0, top: 0, zIndex: 20, pointerEvents: 'none'
      }}>
      <circle
        cx={24} cy={36} r={arrowHeadHeight * 0.25}
        fill="none"
        stroke="#fff"
        strokeWidth={arrowHeadHeight * 0.20}
        opacity={pulseAlpha}
      >
        <animate attributeName="r" from={arrowHeadHeight * 0.25} to={pulseMaxRadius} dur="0.7s" fill="freeze"/>
        <animate attributeName="opacity" from={pulseAlpha} to="0" dur="0.7s" fill="freeze"/>
      </circle>
    </svg>
  );
}

export default ShieldHitEffect;
