// src/components/OpponentManaListPanel.tsx
import React from "react";
import { getCivilizationGradient } from "../utils/gradients";

type OpponentManaListPanelProps = {
  manaZone: any[];
  onClose: () => void;
  onCardClick: (card: any) => void;
};

const OpponentManaListPanel: React.FC<OpponentManaListPanelProps> = ({
  manaZone,
  onClose,
  onCardClick,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '16px',
        minHeight: '22px',
        zIndex: 99999,
        width: '140px',
        maxHeight: '100vh',
        overflowY: 'auto',
        paddingTop: '8px',
        backgroundColor: 'rgba(255,255,255,0.9)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        borderRadius: '6px',
      }}
    >
      {/* タイトル */}
      <div style={{ padding: '4px 8px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
        相手のマナ
      </div>
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

      {manaZone.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
          マナは空です
        </div>
      ) : (
        manaZone.map((card, idx) => (
          <div
            key={`opp-mana-${card.id}-${idx}`}
            style={{
              width: '120px',
              height: '180px',
              backgroundColor: 'white',
              borderRadius: '6px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              position: 'relative',
              cursor: 'pointer',
              marginTop: idx === 0 ? 0 : '-100px',
              zIndex: idx,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCardClick(card);
            }}
          >
            {/* コスト丸 */}
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: getCivilizationGradient(card.civilizations || []),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 1px white',
              }}
            >
              {card.cost}
            </div>
            {/* カード画像 */}
            <img
              src={card.image_url || "https://placehold.jp/120x180.png"}
              alt={card.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '0 0 6px 6px',
              }}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default OpponentManaListPanel;
