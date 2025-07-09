// SelfZones.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ZoneDisplay from './ZoneDisplay';
import DropZone from './DropZone';
import ManaDropSquare from './ManaDropSquare';
import ManaListPanel from './ManaListPanel';
import { SummonAnimation } from './SummonAnimation';
import { DrawAnimation } from './DrawAnimation';
import { ManaAnimation } from './ManaAnimation';
import { api } from '../api';
import DraggableCard from './DraggableCard';
import { useDroppable } from '@dnd-kit/core';
import ChoiceModal, { ChoiceModalProps } from './ChoiceModal';

type Props = {
  battleZone: any[];
  shieldZone: any[];
  manaZone: any[];
  hand: any[];
  noZone: any[];
  hitBattleId: string | null;
  hitShieldId: string | null;
  usedManaThisTurn: boolean;
  pendingChoice: boolean;
  choiceCandidates: any[];
  choicePurpose: string;
  availableMana: number;
  isManaVisible: boolean;
  setManaVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCard: (card: any) => void;
  summonCard: any | null;
  drawCard: any | null;
  showDrawCard: boolean;
  drawAnimPhase: 'slide' | 'flip';
  backImage: string;
  showManaAnimCard: any | null;
  shakeUI: boolean;
  draggingFromId: string | null;
  setDraggingFromId: React.Dispatch<React.SetStateAction<string | null>>;
  fetchState: () => void;
  draggingZone?: 'hand' | 'deck' | 'mana' | null;
  graveyardZone: any[];
};

const SelfZones: React.FC<Props> = (props) => {
  const {
    noZone,
    battleZone,
    shieldZone,
    manaZone,
    hand,
    hitBattleId,
    hitShieldId,
    usedManaThisTurn,
    pendingChoice,
    choiceCandidates,
    choicePurpose,
    availableMana,
    isManaVisible,
    setManaVisible,
    setSelectedCard,
    summonCard,
    drawCard,
    showDrawCard,
    drawAnimPhase,
    backImage,
    showManaAnimCard,
    shakeUI,
    draggingFromId,
    setDraggingFromId,
    fetchState,
  } = props;

  // モーダル用ステート
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<any>(null);

  const openActionModal = (card: any) => {
    setActionTarget(card);
    setActionModalOpen(true);
  };
  const closeActionModal = () => {
    setActionModalOpen(false);
    setActionTarget(null);
  };
    const handleAction = async (type: 'bounce' | 'destroy' | 'mana') => {
    if (!actionTarget) return;
    await fetch('/api/card_action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: type,
        cardId: actionTarget.id,
      }),
    });
    closeActionModal();
    fetchState();
  };

const handContainer = (
  <div
    style={{
      position: 'fixed',
      bottom: '8px',
      right: '250px',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end',
      width: 'auto',
      maxWidth: '90vw',
      pointerEvents: 'auto',
      isolation: 'isolate',
    }}
  >
    {hand.map((card, idx) => (
      <div
        key={`hand-wrapper-${card.id}-${idx}`}
        style={{
          marginLeft: idx === 0 ? 0 : -30,
          position: 'relative',
          zIndex: 1000 + idx,
          isolation: 'isolate',
        }}
      >
        <DraggableCard
          key={`hand-${card.id}-${idx}`}
          card={card}
          id={card.id}
          onClick={setSelectedCard}
          draggingFromId={draggingFromId}
          setDraggingFromId={setDraggingFromId}
          zone="hand"
        />
      </div>
    ))}
  </div>
);

  const { setNodeRef: setHandDropRef, isOver: isHandOver } = useDroppable({ id: 'hand-dropzone' });

return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>

    <DropZone
  id="battlezone"
  title="バトルゾーン"
  zone={battleZone}
  onCardClick={setSelectedCard}  
  setDraggingFromId={setDraggingFromId}
  style={{
    position: 'fixed',
    left:   '500px',
    bottom: '400px',
    width:  '1000px',
    zIndex: 1000,
  }}
>
   <div className="grid grid-cols-5 gap-2">
     {battleZone.map(card => (
       <DraggableCard
         key={card.id}
         card={card}
         id={card.id}
         onClick={setSelectedCard}
         onDoubleClick={() => openActionModal(card)}
         draggingFromId={draggingFromId}
         setDraggingFromId={setDraggingFromId}
         zone="battlezone"
       />
     ))}
   </div>
 </DropZone>

    {/* どこでもないゾーン */}
    <DropZone
      id="no-zone"
      title="どこでもないゾーン"
      zone={noZone}
      onCardClick={setSelectedCard}
      setDraggingFromId={setDraggingFromId}
    />

    {/* シールドゾーン */}
    <div
      style={{
        position: 'fixed',
        bottom: '180px',
        right: '520px',
        display: 'flex',
        gap: '2px',
      }}
    >
      {shieldZone.map(card => (
        <div key={card.id} className="w-[48px] h-[72px]">
          <img src={backImage} alt="shield" className="w-full h-full rounded-md" />
        </div>
      ))}
    </div>

    {/* 手札 Portal */}
    {handContainer}

    {/* カード選択モーダル */}
    {pendingChoice &&
      createPortal(
        <ChoiceModal
          candidates={choiceCandidates}
          purpose={choicePurpose}
          onSelect={(cardId, options) => {
            const uuidRegex = /[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}/;
            const match = typeof cardId === 'string' && cardId.match(uuidRegex);
            const pureId = match ? match[0] : String(cardId);
            api
              .post('/choose_card', {
                card_id: pureId,
                purpose: choicePurpose,
                ...(options?.mode ? { mode: options.mode } : {}),
              })
              .then(() => fetchState())
              .catch(err => console.error('選択エラー', err));
          }}
          onClose={() => {}}
        />,
        document.body
      )}

    {/* マナゾーン */}
    <ManaDropSquare
      manaZone={manaZone}
      availableMana={availableMana}
      setManaVisible={setManaVisible}
      shake={shakeUI}
      containerStyle={{
        position: 'fixed',
        right: 16,
        bottom: 10,
        width: 110,
        height: 110,
        zIndex: 9999,
        cursor: 'pointer',
      }}
    />
    {isManaVisible && (
      <ManaListPanel
        manaZone={manaZone}
        onClose={() => setManaVisible(false)}
        onCardClick={setSelectedCard}
      />
    )}

    {/* 各種アニメーション */}
    {summonCard && <SummonAnimation card={summonCard} position="self" />}
    {showDrawCard && drawCard && (
      <DrawAnimation drawCard={drawCard} phase={drawAnimPhase} backImage={backImage} />
    )}
    {showManaAnimCard && <ManaAnimation card={showManaAnimCard} />}

    {/* 手札追加ドロップエリア */}
    <div
      ref={setHandDropRef}
      style={{
        position: 'fixed',
        right: 120,
        bottom: 24,
        width: 120,
        height: 80,
        background: isHandOver ? 'rgba(56,189,248,0.3)' : 'rgba(200,200,200,0.2)',
        border: '2px dashed #38bdf8',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#38bdf8',
        fontWeight: 'bold',
        zIndex: 1000,
      }}
    >
      手札に追加
    </div>

    {/* アクション選択モーダル */}
    {actionModalOpen &&
      createPortal(
        <ChoiceModal
          purpose="action_select"
          candidates={[
            { id: 'bounce', name: 'バウンス' },
            { id: 'destroy', name: '破壊' },
            { id: 'mana', name: 'マナ送り' },
          ]}
          onSelect={actionId => {
            handleAction(actionId as 'bounce' | 'destroy' | 'mana');
          }}
          onClose={closeActionModal}
        />,
        document.body
      )}
  </div>
);
};

export default SelfZones;