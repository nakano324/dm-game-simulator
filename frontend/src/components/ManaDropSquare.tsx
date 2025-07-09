import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import ManaRing from './ManaRing';

export type ManaDropSquareProps = {
  manaZone: { civilizations?: string[] }[];
  availableMana: number;
  setManaVisible: React.Dispatch<React.SetStateAction<boolean>>;
  shake?: boolean;
  containerStyle?: React.CSSProperties;
};

const ManaDropSquare: React.FC<ManaDropSquareProps> = ({
  manaZone,
  availableMana,
  setManaVisible,
  shake = false,
  containerStyle,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'manaSquare' });

  return (
    <div
      ref={setNodeRef}
      className={`${shake ? 'animate-shake' : ''}`}
      style={containerStyle}
      onClick={() => setManaVisible(v => !v)}
    >
      <ManaRing
        manaZone={manaZone}
        available={availableMana}
        total={manaZone.length}
        size={110}
        strokeWidth={9}
        bgColor="#e5e7eb"
      />
      {isOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(90,160,250,0.22)',
            borderRadius: 4,
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};


export default ManaDropSquare;
