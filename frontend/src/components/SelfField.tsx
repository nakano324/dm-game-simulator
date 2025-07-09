import React from 'react';
import DropZone from './DropZone';
import OpponentManaListPanel from './OpponentManaListPanel';
import OpponentManaSquare from './OpponentManaSquare';

interface OpponentFieldProps {
  opponentBattleZone: any[];
  opponentManaZone: any[];
  opponentAvailableMana: number;
  opponentHandCount: number;
  isOpponentManaVisible: boolean;
  setOpponentManaVisible: React.Dispatch<React.SetStateAction<boolean>>;
  droppedBattleCardId: string | null;
  setDraggingFromId: (id: string | null) => void;
  setSelectedCard: (card: any) => void;
}

const OpponentField: React.FC<OpponentFieldProps> = ({
  opponentBattleZone,
  opponentManaZone,
  opponentAvailableMana,
  opponentHandCount,
  isOpponentManaVisible,
  setOpponentManaVisible,
  droppedBattleCardId,
  setDraggingFromId,
  setSelectedCard,
}) => {
  return (
    <div className="absolute top-4 left-0 right-0 flex flex-col items-center space-y-2">
      <DropZone
        id="hand"
        title="手札"
        zone={Array(opponentHandCount).fill({})}
        onCardClick={setSelectedCard}
        usedManaThisTurn={false} // 相手のため常にfalse
      />
      {isOpponentManaVisible && (
        <OpponentManaListPanel
          manaZone={opponentManaZone}
          onClose={() => setOpponentManaVisible(false)}
          onCardClick={setSelectedCard}
        />
      )}
      <OpponentManaSquare
        manaZone={opponentManaZone}
        availableMana={opponentAvailableMana}
        setManaVisible={setOpponentManaVisible}
      />
    </div>
  );
};

export default OpponentField;
