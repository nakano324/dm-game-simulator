import React from 'react';
import DropZone from './DropZone';
import OpponentManaSquare from './OpponentManaSquare';
import OpponentManaListPanel from './OpponentManaListPanel';
import backImage from "../assets/back_of_card.png";

interface OpponentZonesProps {
  opponentBattleZone: any[];
  opponentManaZone: any[];
  opponentAvailableMana: number;
  opponentHandCount: number;
  isOpponentManaVisible: boolean;
  setOpponentManaVisible: (visible: boolean) => void;
  droppedBattleCardId: string | null;
  setDraggingFromId: (id: string | null) => void;
  setSelectedCard: (card: any) => void;
}

const OpponentZones: React.FC<OpponentZonesProps> = ({
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
      <div
        style={{
          position: "fixed",
          top: "0px",
          right: "300px",
          height: "72px", // カードの高さに合わせる
          zIndex: 1600,
          display: "flex",
          alignItems: "center",
        }}
      >
        {Array.from({ length: opponentHandCount }).map((_, idx) => {
  // 枚数が多いほど重なりを強くする（最大10枚でwidth:48pxの2/3重なりになるように調整）
  const overlap = opponentHandCount <= 1
    ? 0
    : Math.min(16, 24 - 12 * (opponentHandCount - 1) / 9); // 1~10枚で変化
        return (
          <img
            key={idx}
            src={backImage}
            alt="相手手札"
            style={{
              width: "48px",
              height: "72px",
              borderRadius: "6px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              pointerEvents: "none",
              userSelect: "none",
              marginLeft: idx === 0 ? 0 : -overlap,
              zIndex: idx,
            }}
          />
        );
      })}
      </div>

      <DropZone
        id="hand"
        title="手札"
        zone={Array(opponentHandCount).fill({})}
        onCardClick={setSelectedCard}
        usedManaThisTurn={false}
      />
      <DropZone
        id="opponent-battlezone"
        title="相手バトルゾーン"
        zone={opponentBattleZone}
        onCardClick={setSelectedCard}
        setDraggingFromId={setDraggingFromId}
        droppedCardId={droppedBattleCardId}
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

export default OpponentZones;
