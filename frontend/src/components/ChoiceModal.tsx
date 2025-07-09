// src/components/ChoiceModal.tsx
import React from 'react';
import { getCivilizationGradient } from '../utils/gradients';
import backImage from '../assets/back_of_card.png';

export type ChoiceModalProps = {
  candidates: Array<{
    id: string;
    name: string;
    image_url?: string;
    cost?: number;
    power?: number;
    civilizations?: string[];
    spell_cost?: number;
  }>;
  purpose: string;
  onSelect: (cardId: string, options?: { mode?: 'creature' | 'spell' }) => void;
  onClose?: () => void;
};

const ChoiceModal: React.FC<ChoiceModalProps> = ({
  candidates,
  purpose,
  onSelect,
  onClose,
}) => {
  const renderTitle = () => {
    switch (purpose) {
      case 'action_select':
        return 'アクションを選択してください';
      case 'hand': return 'カードを1枚選んで手札に加えてください';
      case 'mana': return 'カードを1枚選んでマナゾーンに置いてください';
      case 'grave': return 'カードを1枚墓地に送ります';
      case 'twimpact_mode': return 'ツインパクトカードの使用方法を選択';
      default: return 'カードを選択してください';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          maxWidth: '90%',
          width: '600px',
          position: 'relative',
          zIndex: 10000001,
          isolation: 'isolate',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>
          {renderTitle()}
        </h2>

        {purpose === 'twimpact_mode' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
            {candidates.map(card => (
              <div key={card.id} style={{ textAlign: 'center' }}>
                <img
                  src={card.image_url || 'https://placehold.jp/120x180.png'}
                  alt={card.name}
                  style={{ width: 112, height: 168, objectFit: 'cover', borderRadius: 8 }}
                  draggable={false}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: 8 }}>
                  <button
                    style={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                    onClick={() => onSelect(card.id, { mode: 'creature' })}
                  >
                    クリーチャーで使う（{card.cost ?? '??'}）
                  </button>
                  <button
                    style={{
                      backgroundColor: '#8B5CF6',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                    onClick={() => onSelect(card.id, { mode: 'spell' })}
                  >
                    呪文で使う（{card.spell_cost ?? '??'}）
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {candidates.map((card, idx) => (
              <div
                key={card.id + '-' + idx}
                onClick={() => onSelect(card.id)}
                style={{
                  width: 120,
                  height: 180,
                  margin: '0 8px',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {purpose !== 'shield_break' && (
                  <div style={{
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
                  }}>
                    {card.cost}
                  </div>
                )}
                <img
                  src={purpose === 'shield_break' ? backImage : card.image_url || 'https://placehold.jp/120x180.png'}
                  alt={card.name}
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 4,
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.8)',
                }}>
                  {card.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {purpose !== 'twimpact_mode' && (
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: 12, color: '#666' }}>
            クリックで1枚選択
          </div>
        )}
      </div>
    </div>
  );
};

export default ChoiceModal;
