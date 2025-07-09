import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import ManaRing from './ManaRing';

export type OpponentManaSquareProps = {
  manaZone: { civilizations?: string[] }[];
  availableMana: number;
  setManaVisible?: (v: boolean) => void; // ✅ 明示的な boolean 型
  shake?: boolean;
};

const OpponentManaSquare: React.FC<OpponentManaSquareProps> = ({
  manaZone,
  availableMana,
  setManaVisible,
  shake = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'opponentManaSquare' });

  return (
    <div
      ref={setNodeRef}
      className={`${shake ? 'animate-shake' : ''}`}
      style={{
        position: 'fixed',
        right: 16,
        top: 16,
        width: 110,
        height: 110,
        zIndex: 9999,
        cursor: setManaVisible ? 'pointer' : 'default',
      }}
      onClick={setManaVisible ? () => setManaVisible(true) : undefined} // ✅ 明示的に true を渡す
    >
      <ManaRing
        manaZone={manaZone}
        available={availableMana}
        total={manaZone.length}
        size={110}
        strokeWidth={8}
        bgColor="rgba(0,0,0,0.22)"
      />
      {isOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: 4,
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};

export default OpponentManaSquare;

