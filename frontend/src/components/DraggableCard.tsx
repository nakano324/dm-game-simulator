import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { getCivilizationGradient } from '../utils/gradients';

// どのゾーンでもドラッグ開始／終了は拾う
const useConditionalDraggable = (id: string, data: any, zone: string) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id, data });
  return {
    dragProps: { ref: setNodeRef, ...listeners, ...attributes },
    transform,
  };
};

export type DraggableCardProps = {
  setOriginalRef?: (node: HTMLDivElement | null) => void;
  card: any;
  children?: React.ReactNode; 
  id: string;
  index?: number;
  onClick?: (card: any) => void;
  onDoubleClick?: (card: any) => void;
  draggingFromId?: string | null;
  setDraggingFromId?: (id: string | null) => void;
  zone?: 'hand' | 'deck' | 'mana' | 'graveyard' | 'battlezone' | 'discard' | 'exile' | 'no-zone';
  showCost?: boolean;
  overlay?: boolean;
};

const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  id,
  zone = 'hand',
  draggingFromId,
  showCost,
  onClick,
  onDoubleClick,
  overlay = false,
  setOriginalRef,
}) => {
  const { dragProps, transform } = useConditionalDraggable(
    id,
    { card, zone },
    zone
  );

  const appliedTransform = transform
    ? `translate(${transform.x}px, ${transform.y}px)`
    : undefined;

  const cardStyle: React.CSSProperties = {
    // battlezone のときは見た目は動かさない
    transform: zone === 'battlezone' ? undefined : appliedTransform,
    width: '120px',
    height: '180px',
    cursor: 'grab',
    pointerEvents: overlay ? 'none' : 'auto',
    position: 'relative',
    zIndex: draggingFromId === id ? 999999 : 'inherit',
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <div
      id={id}
      style={cardStyle}
      {...dragProps}
      onClick={e => { e.stopPropagation(); onClick?.(card); }}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick?.(card); }}
      ref={node => {
        // dnd-kit のリファレンス
        dragProps.ref?.(node);
        // GameBoard 側に「固定されたカードの DOM」を登録
        setOriginalRef?.(node);
      }}
    >
      {/* クリーチャーコスト丸 */}
      {showCost !== false && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: getCivilizationGradient(card.civilizations || []),
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px white',
            zIndex: 10,
          }}
        >
          {card.cost}
        </div>
      )}

      {/* ツインパクト呪文コスト丸 */}
      {showCost !== false && card.card_type === 'twimpact' && card.spell_cost != null && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 30,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: getCivilizationGradient(card.spell_civilizations || []),
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px white',
            zIndex: 10,
          }}
        >
          {card.spell_cost}
        </div>
      )}

      <img
        src={card.image_url || 'https://placehold.jp/120x180.png'}
        alt={card.name}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      <div style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
        {card.name}
      </div>

      {card.power != null && (
        <div style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>
          Power: {card.power}
        </div>
      )}
    </div>
  );
};

export default DraggableCard;
