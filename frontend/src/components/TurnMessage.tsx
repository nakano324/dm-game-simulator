import React, { useEffect, useState } from "react";

type TurnMessageProps = {
  message: string;
};

export const TurnMessage: React.FC<TurnMessageProps> = ({ message }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1200); // アニメと一致
    return () => clearTimeout(timer);
  }, [message]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '28%',
        left: '50%',
        transform: 'translate(-50%, 0)',
        zIndex: 99999,
        pointerEvents: 'none',
        padding: '40px 72px',
        background: 'rgba(32,36,40,0.87)',
        borderRadius: 28,
        color: '#fff',
        fontSize: 38,
        fontWeight: 700,
        textShadow: '0 4px 28px #000,0 0 18px #00e3ff77',
        boxShadow: '0 6px 64px 0 #222b',
        opacity: 0.96,
        animation: 'turn-fade-inout 1.2s cubic-bezier(0.55,0,0.3,1)',
        letterSpacing: 4,
        textAlign: 'center'
      }}
    >
      {message}
      <style>
        {`
          @keyframes turn-fade-inout {
            0%   { opacity: 0; transform: translate(-50%, 0) scale(0.96); }
            12%  { opacity: 1; transform: translate(-50%, -14px) scale(1.06); }
            80%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
            100% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};
