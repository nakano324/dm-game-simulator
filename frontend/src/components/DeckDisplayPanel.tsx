// src/components/DeckDisplayPanel.tsx
import React from "react";
import backImage from '../assets/back_of_card.png';
import { useDraggable } from '@dnd-kit/core';

export type Card = {
  id: string;
  image_url: string;
  cost?: number;
  // …必要なフィールドだけ
};

interface Props {
  deck: Card[];            // ← デッキ配列を受け取る
  opponentDeck: Card[];    // ← 相手デッキ配列も受け取る
}

const DeckDisplayPanel: React.FC<Props> = ({ deck, opponentDeck }) => {
  // ドラッグ開始用のトップカードデータ
  const topCard = deck[deck.length - 1];
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: 'deck',
    data: { card: topCard, zone: 'deck' },
  });

  const myCount = deck.length;
  const oppCount = opponentDeck.length;
  const maxStack = Math.min(10, myCount);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'fixed',
        right: 130,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        cursor: 'grab',            // ← ドラッグ可能であることを示唆
      }}
    >
      {/* 相手の山札 */}
      <div style={{ textAlign: 'center', color: 'white', fontWeight: 'bold' }}>
        <div style={{ marginBottom: 4 }}>{oppCount} 枚</div>
        <div style={{ position: 'relative', width: 40, height: 60 }}>
          {[...Array(Math.min(10, oppCount))].map((_, idx) => (
            <img
              key={`opp-${idx}`}
              src={backImage}
              alt="Opponent Deck"
              style={{
                position: 'absolute',
                bottom: idx,
                left: 0,
                width: 40,
                height: 60,
                zIndex: idx,
              }}
            />
          ))}
        </div>
      </div>

      {/* 自分の山札 */}
      <div style={{ textAlign: 'center', color: 'white', fontWeight: 'bold' }}>
        <div style={{ marginBottom: 4 }}>{myCount} 枚</div>
        <div style={{ position: 'relative', width: 40, height: 60 }}>
          {[...Array(maxStack)].map((_, idx) => (
            <img
              key={`me-${idx}`}
              src={backImage}
              alt="My Deck"
              style={{
                position: 'absolute',
                bottom: idx,
                left: 0,
                width: 40,
                height: 60,
                zIndex: idx,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeckDisplayPanel;
