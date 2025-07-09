// src/components/DropZone.tsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import { getCivilizationGradient } from '../utils/gradients';
import DraggableCard from './DraggableCard';

export type DropZoneProps = {
  zone: any[];
  id: string;
  title: string;
  onCardClick: (card: any) => void;
  setDraggingFromId?: (id: string | null) => void;
  draggingFromId?: string | null;
  droppedCardId?: string | null;
  usedManaThisTurn?: boolean;
  /** ここで style を受け取れるように追加 */
  style?: CSSProperties;
  /** children もしくは zone.map のどちらかを描画 */
  children?: React.ReactNode; 
};

const DropZone: React.FC<DropZoneProps> = ({
  zone,
  children,
  style,
  id,
  title,
  onCardClick,
  setDraggingFromId,
  draggingFromId,
  droppedCardId,
  usedManaThisTurn,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isHand    = title === '手札';
  const isBattle  = id    === 'battlezone';
  const isNoZone  = id    === 'no-zone';

  const containerStyle: CSSProperties = {
    width:      isNoZone ? '200px' : '875px',
    minHeight: '120px',
    backgroundColor:
      isBattle && isOver ? 'rgba(56, 189, 248, 0.55)' :
      isNoZone && isOver ? 'rgba(234, 179, 8, 0.3)' :
      'transparent',
    borderRadius: '4px',
    display:      'flex',
    alignItems:   'center',
    padding:      '5px',
    overflowX:    'auto',
    margin:       '0 auto',
    justifyContent: 'center',
    boxShadow: isBattle && isOver
      ? '0 0 24px 8px #38bdf8'
      : isNoZone && isOver
      ? '0 0 16px 4px #eab308'
      : undefined,
    transition: 'background 0.15s, border 0.15s, box-shadow 0.15s',
  };

  return (
    <div
      ref={setNodeRef}
      className="flex flex-row"
      /* containerStyle と外部から来た style をマージ */
      style={{ ...containerStyle, ...style }}
    >
      {children
        ? /* children があればそれを描画 */
          children
        : /* なければ従来の zone.map */
          zone.map((card, index) => {
            // ... 既存の DraggableCard 周りのロジック ...
            return (
              <DraggableCard
                key={id + '-' + card.id + '-' + index}
                card={card}
                id={card.id}
                onClick={onCardClick}
                draggingFromId={draggingFromId}
                setDraggingFromId={setDraggingFromId}
                zone={id as any}
              />
            );
          })}
    </div>
  );
};

export default DropZone;
