import React from 'react';
import DraggableCard from './DraggableCard';
import ShieldWithHitEffect from './ShieldWithHitEffect';
import { getCivilizationGradient } from '../utils/gradients';

export type ZoneDisplayProps = {
  zone: any[];
  title: string;
  onCardClick?: (card: any) => void;
  facedown?: boolean;
  hitShieldId?: string | null;
  usedManaThisTurn?: boolean;
  zoneType: "hand" | "deck" | "mana" | "graveyard" | "battlezone" | "discard" | "exile" | "no-zone";
  draggingFromId: string | null;
  setDraggingFromId: React.Dispatch<React.SetStateAction<string | null>>;
};

const ZoneDisplay: React.FC<ZoneDisplayProps> = ({
  zone,
  title,
  onCardClick,
  facedown = false,
  hitShieldId,
  usedManaThisTurn = false,
  zoneType,
  draggingFromId,
  setDraggingFromId,
}) => {

  if (!Array.isArray(zone)) {
    return <div className="text-xs">{title}：未取得</div>;
  }

  const isHand = title === '手札';
  const isShield = title === 'シールドゾーン' || title === 'シールド';

  // シールドのみ中央下に絶対配置
  if (isShield) {
    return (
      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '140px', // 好きな高さに調整
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          gap: '2px',
        }}
      >
        {zone.map((card, index) => {
          const key = `${title}-${card.id}-${index}`;
          if (facedown) {
            return (
              <ShieldWithHitEffect
                key={key}
                id={`opponent-shield-${card.id}`}
                isHit={hitShieldId === card.id}
              />
            );
          }
          // フェイスアップなど他の条件が必要な場合はここに追加
          return null;
        })}
      </div>
    );
  }

  // 通常ゾーン（手札・バトル・マナ等）は従来どおり
  return (
    <div className={`flex flex-col ${isHand ? 'items-end w-full' : 'items-center'}`}>
      <div
        className={`${isHand ? 'flex flex-nowrap justify-end' : 'flex flex-wrap justify-center gap-4'}`}
        style={{
          ...(!isHand ? { width: '900px' } : {}),
          ...(isHand ? { position: 'relative', zIndex: 1000 } : {})
        }}
      >
        {zone.map((card, index) => {
          const key = `${title}-${card.id}-${index}`;
          if (isHand) {
            return (
              <DraggableCard
                key={`${title}-${card.id}-${index}`}
                card={card}
                id={card.id}
                index={index}
                onClick={onCardClick}
                draggingFromId={draggingFromId}
                setDraggingFromId={setDraggingFromId}
                zone={zoneType}
              />
            );
          }

          // その他のゾーン（表向きカード）
          return (
            <div
              key={key}
              id={`target-card-${card.id}`}
              className="w-[80px] h-[120px] m-0.5 bg-white rounded shadow flex flex-col items-center justify-start overflow-hidden relative"
              onClick={(e) => { e.stopPropagation(); onCardClick?.(card); }}
            >
              <div
                className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                style={{
                  background: getCivilizationGradient(card.civilizations || []),
                  zIndex: 10,
                }}
              >
                {card.cost}
              </div>
              <img
                src={card.image_url || 'https://placehold.jp/120x180.png'}
                alt={card.name}
                className="w-full h-full object-cover"
              />
              {title !== 'マナゾーン' && (
                <>
                  <div className="font-bold mt-1 text-sm text-center">{card.name}</div>
                  <div className="text-gray-500 text-[10px]">パワー：{card.power}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ZoneDisplay;
