import React, { useEffect } from "react"; 
import DropZone from "./DropZone";
import OpponentManaSquare from "./OpponentManaSquare";
import OpponentManaListPanel from "./OpponentManaListPanel";
import ShieldWithHitEffect from "./ShieldWithHitEffect"; // ←追加
import type { Dispatch, SetStateAction } from "react";

interface Props {
  opponentBattleZone: any[];
  opponentManaZone: any[];
  opponentAvailableMana: number;
  isOpponentManaVisible: boolean;
  setOpponentManaVisible: Dispatch<SetStateAction<boolean>>;
  droppedBattleCardId: string | null;
  setDraggingFromId: (id: string | null) => void;
  opponentShieldZone: any[];
  opponentHandCount: number;
  onCardClick: (card: any) => void;
  hitShieldId: string | null;
}

const OpponentZones: React.FC<Props> = ({
  opponentBattleZone,
  opponentManaZone,
  opponentAvailableMana,
  isOpponentManaVisible,
  setOpponentManaVisible,
  droppedBattleCardId,
  setDraggingFromId,
  opponentShieldZone,
  opponentHandCount,
  onCardClick,
  hitShieldId,
}) => {  
  
  return (
    <div className="absolute top-4 left-0 right-0 flex flex-col items-center space-y-2">
      {/* 相手プレイヤー本体エリア（シールド0枚時の攻撃判定用） */}
      <div
        id="opponent-player"
        style={{
          position: "fixed",
          top: "8px", // シールドより少し上や中央など、分かりやすい位置に
          left: "50%",
          transform: "translateX(-50%)",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(255,0,0,0.15)",
          border: "2px solid #f87171",
          zIndex: 1600,
          display: opponentShieldZone.length === 0 ? "block" : "none", // シールド0枚の時だけ表示
          pointerEvents: "auto",
        }}
      >
        <div style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f87171",
          fontWeight: "bold",
          fontSize: "20px",
          userSelect: "none"
        }}>
          本体
        </div>
      </div>

      {/* 相手シールドゾーン（中央上部に横並び・固定配置） */}
      <div
        style={{
          position: "fixed",
          top: "-16px",             // 16pxから32pxに変更して少し下に移動
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "2px",             // シールド間の間隔
          zIndex: 1500,            // 他UIより上に出したいとき
        }}
      >
        {opponentShieldZone.map((card, idx) => (
          <ShieldWithHitEffect
            key={`${card.id}-${idx}`}
            id={`opponent-shield-${card.id}-${idx}`}
            isHit={hitShieldId === `${card.id}-${idx}`}
          />
        ))}
      </div>
      <div
        style={{
          position: "fixed",
          top: "60px",  // ここを好きな値に変える！
          left: '635px',
          transform: "translateX(-50%)",
          zIndex: 1200,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "auto", // 必要なら追加
        }}
      >
        <DropZone
           id="opponent-battlezone"
          title="相手バトルゾーン"
          zone={opponentBattleZone}
          onCardClick={onCardClick}
          setDraggingFromId={setDraggingFromId}
          droppedCardId={droppedBattleCardId}
        />
        </div>

        {isOpponentManaVisible && (
          <OpponentManaListPanel
            manaZone={opponentManaZone}
            onClose={() => setOpponentManaVisible(false)}
            onCardClick={onCardClick}
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

