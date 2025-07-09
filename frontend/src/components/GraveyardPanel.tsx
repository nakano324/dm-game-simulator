import React, { Dispatch, SetStateAction } from 'react';
import { useDroppable } from '@dnd-kit/core';
import ChoiceModal from './ChoiceModal';
import { api } from '../api';
import { getCivilizationGradient } from '../utils/gradients';
import StackedCardPanel from './SelfmanaCardPanel';

interface Props {
  setSelectedCard?: (card: any) => void;
  isGraveVisible: boolean;
  isOpponentGraveVisible: boolean;
  setGraveVisible: Dispatch<SetStateAction<boolean>>;
  setOpponentGraveVisible: Dispatch<SetStateAction<boolean>>;
  pendingChoice: boolean;
  choiceCandidates: any[];
  choicePurpose: string;
  fetchState: () => void;
  onCardClick: (card: any) => void;
  graveyard: any[];
  opponentGraveyard: any[];
  title?: string;
}

const GraveyardPanel: React.FC<Props> = ({
  isGraveVisible,
  isOpponentGraveVisible,
  setGraveVisible,
  setOpponentGraveVisible,
  pendingChoice,
  choiceCandidates,
  choicePurpose,
  fetchState,
  onCardClick,
  graveyard,
  opponentGraveyard,
  setSelectedCard,
}) => {
  // 共通パネルスタイル
  const panelContainerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '10px',
    left: '16px',
    minHeight: '22px',
    zIndex: 9999999999999,
    width: '140px',
    maxHeight: '100vh',
    overflowY: 'auto',
    paddingTop: '8px',
    backgroundColor: 'rgba(255,255,255,0.9)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    borderRadius: '6px',
  };

  if (!isGraveVisible && !isOpponentGraveVisible) return null;

  const cardsToShow = isGraveVisible ? graveyard : opponentGraveyard;
  const title = isGraveVisible ? 'あなたの墓地' : '相手の墓地';

  const handleClose = () => {
    if (isGraveVisible) setGraveVisible(false);
    if (isOpponentGraveVisible) setOpponentGraveVisible(false);
  };

  // ドロップ領域設定
  const { setNodeRef: setGraveRef, isOver: isGraveOver } = useDroppable({ id: 'graveyard' });

  return (
    <>
      {pendingChoice && (
        <ChoiceModal
          candidates={choiceCandidates}
          purpose={choicePurpose}
          onSelect={(cardId: string, options?: { mode?: string }) => {
            api
              .post('/choose_card', {
                card_id: cardId,
                purpose: choicePurpose,
                ...(options?.mode ? { mode: options.mode } : {}),
              })
              .then(() => fetchState())
              .catch((err: unknown) => console.error('選択エラー', err));
          }}
          onClose={() => {}}
        />
      )}

      <div
        ref={setGraveRef}
        id="graveyard"
        style={{
          ...panelContainerStyle,
          backgroundColor: isGraveOver
            ? 'rgba(200,200,255,0.9)'
            : panelContainerStyle.backgroundColor,
        }}
      >
        <StackedCardPanel
          cards={cardsToShow}
          title={title}
          onClose={handleClose}
          onCardClick={onCardClick}
          getCivilizationGradient={getCivilizationGradient}
          position="left"
          panelType="graveyard"
        />
      </div>
    </>
  );
};

export default GraveyardPanel;
