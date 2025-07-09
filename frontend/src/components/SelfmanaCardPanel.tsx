import React from 'react';
import DraggableCard from './DraggableCard'; // DraggableCardコンポーネントのインポート

interface CardData {
  id: string;
  name: string;
  image_url: string;
  cost: number;
  civilizations: string[];
}

interface Props {
  cards: CardData[];
  onClose: () => void;
  onCardClick: (card: CardData) => void;
  getCivilizationGradient: (civs: string[]) => string;
  title: string;
  position: string;
  panelType: 'mana' | 'graveyard'; // ★追加
}

const SelfmanaCardPanel: React.FC<Props> = ({
  cards,
  onClose,
  onCardClick,
  getCivilizationGradient,
  title,
  position,
  panelType, // ★追加
}) => {
  const panelContainerStyle: React.CSSProperties = {
  position: 'fixed',
  // 位置は position によって切り替え
  top:    position === 'bottom-left' ? undefined : '10px',
  left:   position === 'bottom-left' ? '16px' : undefined,
  bottom: position === 'bottom-left' ? '16px' : undefined,

  minHeight:  '22px',
  zIndex:     99999,
  width:      '140px',
  maxHeight:  '100vh',

  // 縦スクロールは維持しつつ、横方向のはみ出しを許可
  overflowY: 'auto',
  overflowX: 'visible',

  paddingTop:      '8px',
  backgroundColor: 'rgba(255,255,255,0.9)',
  boxShadow:       '0 2px 6px rgba(0,0,0,0.15)',
  borderRadius:    '6px',
};

  return (
    <div style={panelContainerStyle}>
      {/* タイトル */}
      <div style={{ padding: '4px 8px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
        {title}
      </div>
      {/* 閉じるボタン */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          zIndex: 100000,
          backgroundColor: '#f87171',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>

      {/* カードリスト or 空表示 */}
      {cards.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
          {panelType === 'graveyard' ? '墓地は空です' : 'マナは空です'}
        </div>
      ) : (
        cards.map((card, idx) => (
          <DraggableCard
            key={card.id}
            card={card}
            id={`card-${card.id}`} // ←必ずこの形式にする
            zone={panelType}
          />
        ))
      )}
    </div>
  );
};

export default SelfmanaCardPanel;

// Removed unused 'cardId' code that referenced undefined 'active'