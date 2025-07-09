// src/components/EndTurnButton.tsx
import React from 'react';
import endButtonImage from '../assets/END_bottun2.png';

export type EndTurnButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

const EndTurnButton: React.FC<EndTurnButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // ↓ここで固定位置を指定
      style={{
        position: 'fixed',         // ビューポート基準で固定
        right: '16px',             // 画面右から16px
        top: '50%',                // 画面上端から50%
        transform: 'translateY(-50%)', // 自身の高さの50%上に移動して垂直センター
        zIndex: 10000,             // 他要素より前面
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <img
        src={endButtonImage}
        alt="End Turn"
        draggable={false}
        style={{ width: '100px', height: '100px', objectFit: 'contain' }}
      />
    </button>
  );
};

export default EndTurnButton;

