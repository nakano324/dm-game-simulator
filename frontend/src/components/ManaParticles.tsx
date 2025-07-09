import React from 'react';

type ManaParticlesProps = {
  civilization?: string;
  triggerKey: string;
};

const colors: Record<string, string> = {
  '赤': '#F5293B',
  '青': '#028CD1',
  '緑': '#388746',
  '黒': '#5E5C5E',
  '白': '#FAFF63',
};

export const ManaParticles: React.FC<ManaParticlesProps> = ({
  civilization = '青',
  triggerKey,
}) => {
  const particles = Array.from({ length: 12 });
  return (
    <div style={{
      pointerEvents: 'none',
      position: 'absolute',
      left: 0, top: 0, width: '100%', height: '100%', zIndex: 30,
      overflow: 'visible',
    }}>
      {particles.map((_, i) => {
        const angle = (360 / particles.length) * i + Math.random() * 8;
        const r = 55 + Math.random() * 10;
        const x = Math.cos(angle * Math.PI / 180) * r + 60;
        const y = Math.sin(angle * Math.PI / 180) * r + 90;
        return (
          <div
            key={`${i}-${triggerKey}`}
            className="mana-particle"
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: 8, height: 8,
              borderRadius: '50%',
              background: colors[civilization] || '#028CD1',
              opacity: 0.9,
              animation: `mana-particle-fly 0.5s ease-out forwards`,
              animationDelay: `${i * 0.01}s`,
              boxShadow: `0 0 10px 2px ${colors[civilization] || '#028CD1'}`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes mana-particle-fly {
          0%   { opacity: 0.9; transform: translate(-50%, -50%) scale(0.6); }
          70%  { opacity: 0.7; }
          90%  { opacity: 0.2; }
          100% { opacity: 0; transform: translate(-50%, -100px) scale(1.2); }
        }
      `}</style>
    </div>
  );
};
