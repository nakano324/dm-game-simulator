import React, { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useGameState } from '../hooks/useGameState';
import { api } from '../api';
import { useGameAnimations } from '../hooks/useGameAnimations';
import { useGraveIcon } from '../hooks/useGraveIcon';
import backImage from '../assets/back_of_card.png';
import { AttackArrow } from './AttackArrow';
import OpponentField from './OpponentField';
import SelfZones from './SelfZones';
import DraggableCard from './DraggableCard';
import { TurnMessage } from './TurnMessage';
import EndTurnButton from './EndTurnButton';
import { SummonAnimation } from './SummonAnimation';
import GraveyardPanel from './GraveyardPanel';
import ManaListPanel from './ManaListPanel';
import OpponentZones from './OpponentZones';
import { ManaAnimation } from './ManaAnimation';
import ChoiceModal from './ChoiceModal';
import { AxiosError } from 'axios';
import DeckDisplayPanel from "./DeckDisplayPanel";

interface ErrorResponse {
  error: string;
}

const GameBoard: React.FC = () => {
  // UI状態
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [draggingFromId, setDraggingFromId] = useState<string | null>(null);
  const [overlayData, setOverlayData] = useState<{
  id: string;
  card: any;
  zone: 'hand' | 'deck' | 'mana'| 'battlezone'; // ← "mana" を追加
} | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    // data.current が undefined の可能性をガード
    const activeData = event.active.data?.current;
    if (!activeData) return;
    
    console.log('DragStart:', { 
      id: event.active.id, 
      zone: activeData.zone, 
      card: activeData.card 
    });
    console.log(
      'DragStart ID:',
      event.active.id,
      'DOM:',
      document.getElementById(String(event.active.id)) // ← 修正
    );
    
    setOverlayData({
      id: String(event.active.id), // ← 修正
      card: activeData.card,
      zone: activeData.zone,
    });
    setDraggingFromId(String(event.active.id)); // ← 修正
  };

  const [droppedBattleCardId, setDroppedBattleCardId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hitShieldId, setHitShieldId] = useState<string | null>(null);
  const [hitBattleId, setHitBattleId] = useState<string | null>(null);
  const [isManaVisible, setManaVisible] = useState(false);
  const [isOpponentManaVisible, setOpponentManaVisible] = useState(false);
  const [isGraveVisible, setGraveVisible] = useState(false);
  const [isOpponentGraveVisible, setOpponentGraveVisible] = useState(false);
  const [showManaAnimCard, setShowManaAnimCard] = useState<any | null>(null);
  const prevManaCountRef = useRef<number>(0);
  const [showShieldChoiceModal, setShowShieldChoiceModal] = useState(false);
  const [shieldCandidates, setShieldCandidates] = useState<any[]>([]);
  const [attackingCardId, setAttackingCardId] = useState<string | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [checkWinNext, setCheckWinNext] = useState(false); // 攻撃直後フラグ

  // ゲーム状態
 const {
   hand, battleZone, manaZone, shieldZone, noZone,
   opponentBattleZone, opponentShieldZone, opponentManaZone,
   availableMana, opponentAvailableMana,
   deck, opponentDeck, graveyard, opponentGraveyard,
   opponentHandCount, turnPlayer, usedManaThisTurn,
   pendingChoice, choiceCandidates, choicePurpose,
   fetchState,
 } = useGameState();
  // 自分のターンかどうかを判定
  const isMyTurn = turnPlayer === 0;

    const prevOpponentShieldCount = useRef(opponentShieldZone.length);
  const graveIconSrc = useGraveIcon();

  // アニメーション管理
  const {
    enqueue,
    showSummonAnim,
    showTurnAnim,
    showManaAnimCard: showManaAnimCardFromHook,
    showOpponentManaAnimCard,
    flash,
    shakeUI,
  } = useGameAnimations(fetchState);

  // ターン切り替わりアニメも「直前と違う時だけ一回」
  const prevTurnPlayer = useRef<number | null>(null);
  useEffect(() => {
    if (prevTurnPlayer.current !== null && turnPlayer !== prevTurnPlayer.current) {
      console.log('【デバッグ】turn enqueue呼び出し', turnPlayer, enqueue);
      enqueue({ type: 'turn', message: turnPlayer === 0 ? 'あなたのターン！' : '相手のターン' });
    }
    prevTurnPlayer.current = turnPlayer;
  }, [turnPlayer, enqueue]);

  // 相手マナゾーン：idの配列のみで差分を検知。アニメ中はenqueue禁止、終了時だけprev追従
  const animatingOpponentMana = !!showOpponentManaAnimCard;
  const prevOpponentManaIds = useRef<string[]>([]);

  // アニメ終了時だけprev追従
  useEffect(() => {
    if (!showOpponentManaAnimCard) {
      prevOpponentManaIds.current = opponentManaZone.map(c => c.id);
    }
  }, [showOpponentManaAnimCard, opponentManaZone]);

  // 自分マナチャージアニメ
  useEffect(() => {
    if (manaZone.length > prevManaCountRef.current) {
      setShowManaAnimCard(manaZone[manaZone.length - 1]);
      setTimeout(() => setShowManaAnimCard(null), 800);
    }
    prevManaCountRef.current = manaZone.length;
  }, [manaZone]);

  // マウス追従
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 攻撃系
  useEffect(() => {
    if (!draggingFromId) return;
    const handlePointerUp = (e: PointerEvent) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      // シールドにヒットしているか判定
      const shieldEl = elements.find(el => el.id && el.id.startsWith('opponent-shield-'));
      if (shieldEl) {
        // シールド候補をセットしてモーダル表示
        setAttackingCardId(draggingFromId);
        setShieldCandidates(opponentShieldZone.map((card, idx) => ({
          ...card,
          id: card.id,  // ← 純粋なカードIDに統一
        })));
        setShowShieldChoiceModal(true);
        setDraggingFromId(null);
        return;
      }
      if (opponentShieldZone.length === 0) {
        // 例えば相手プレイヤー本体のエリアにid="opponent-player"を付与しておく
        const playerEl = elements.find(el => el.id === 'opponent-player');
        if (playerEl) {
          setShowWin(true);
          setDraggingFromId(null);
          return;
        }
      }

      const battleEl = elements.find(el =>
      el.id?.startsWith('target-card-battle-')
    );
    if (battleEl) {
      const defenderId = battleEl.id.replace('target-card-battle-', '');
      api.post('/api/attack', {
        attackerId: draggingFromId!.replace('card-', ''),
        defenderId,
      })
      .then(fetchState)
      .finally(() => setDraggingFromId(null));
      return;
    }
      // それ以外は従来通りドラッグ解除
      setDraggingFromId(null);
    };
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [draggingFromId, opponentShieldZone]);

  useEffect(() => {
    if (!draggingFromId) return;
    const handlePointerMove = (e: PointerEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [draggingFromId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
        const activeZone = active.data?.current?.zone;
    if (activeZone === 'battlezone') {
      return;   // ドロップ処理・矢印クリアは pointerup 側で行う
    }

    console.log('DragEnd:', { active: active.id, over: over.id, zone: active.data.current?.zone });

    // カードIDを取得（プレフィックスを除去）
    const cardId = typeof active.id === 'string' && active.id.startsWith('card-') 
      ? active.id.replace('card-', '') 
      : active.id;

    // 手札からバトルゾーンへの移動
    if (active.data.current?.zone === 'hand' && over.id === 'battlezone') {
      console.log('バトルゾーンへの移動を実行:', { cardId, zone: 'battle' });
      api.post('/api/drop_card', { cardId, zone: 'battle' })
        .then(res => {
          const lastCard = res.data.last_played_card;
          if (lastCard) {
            // 召喚アニメーションを再生
            console.log('カードをバトルゾーンに配置:', lastCard);
          }
        })
        .catch(err => {
          console.error('バトルゾーンへの配置エラー:', err.response?.data?.error || err);
          console.error('エラー詳細:', err.response?.data);
        })
        .finally(() => {
          fetchState();
        });
    }
    // 手札からマナゾーンへの移動
    else if (active.data.current?.zone === 'hand' && over.id === 'manaSquare') {
      if (usedManaThisTurn) {
        alert('このターンはすでにマナチャージしています');
        return;
      }
      api.post('/api/drop_card', { cardId, zone: 'mana' })
        .then(res => {
          console.log('カードをマナゾーンに配置:', res.data);
        })
        .catch(err => {
          console.error('マナゾーンへの配置エラー:', err.response?.data?.error || err);
          alert(err.response?.data?.error || "マナチャージできません");
        })
        .finally(() => {
          fetchState();
        });
    }
    // 手札からどこでもないゾーンへの移動
    else if (active.data.current?.zone === 'hand' && over.id === 'no-zone') {
      api.post('/drop_card', { cardId, zone: 'no-zone' })
        .then(res => {
          console.log('カードをどこでもないゾーンに配置:', res.data);
        })
        .catch(err => {
          console.error('どこでもないゾーンへの配置エラー:', err.response?.data?.error || err);
        })
        .finally(() => {
          fetchState();
        });
    }
    // マナゾーンから手札への移動
    else if (active.data.current?.zone === 'mana' && over.id === 'hand-dropzone') {
      api.post('/api/mana_to_hand', { cardId })
        .then(res => {
          console.log('カードを手札に戻しました:', res.data);
        })
        .catch(err => {
          console.error('手札への移動エラー:', err.response?.data?.error || err);
        })
        .finally(() => {
          fetchState();
        });
    }
    // 墓地から手札への移動
    else if (
      active.data.current?.zone === 'graveyard' &&
      over.id === 'hand-dropzone'
    ) {
      const cardId = typeof active.id === 'string' && active.id.startsWith('card-') 
        ? active.id.replace('card-', '') 
        : active.id;
      api.post('/api/graveyard_to_hand', { cardId })
        .then(fetchState);
    }
    // 墓地からマナゾーンへの移動
    else if (
      active.data.current?.zone === 'graveyard' &&
      over.id === 'manaSquare'
    ) {
      const cardId = typeof active.id === 'string' && active.id.startsWith('card-') 
        ? active.id.replace('card-', '') 
        : active.id;
      api.post('/api/graveyard_to_mana', { cardId })
        .then(fetchState)
        .catch(err => {
          console.error('マナゾーンへの配置エラー:', err.response?.data?.error || err);
        });
    }
    // その他の未対応のドラッグ操作
    else {
      console.log('未対応のドラッグ操作:', { 
        fromZone: active.data.current?.zone, 
        toZone: over.id 
      });
    }
  };

  // アタックエフェクト
const renderAttackArrow = () => {
  // バトルゾーン以外からのドラッグ時は何も描画しない
  if (!draggingFromId || overlayData?.zone !== 'battlezone') return null;

  const fromElem = document.getElementById(draggingFromId);
  if (!fromElem) return null;

  const rect = fromElem.getBoundingClientRect();
  const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const end = mousePosition;
  const arrowHeadLength = 44;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  const tipX = end.x + (dx / norm) * arrowHeadLength;
  const tipY = end.y + (dy / norm) * arrowHeadLength;

  const tipElems = document.elementsFromPoint(tipX, tipY).filter(el =>
    el.id && (el.id.startsWith("target-card-") || el.id.startsWith("target-card-battle-"))
  );

  let shieldHit = null;
  let battleHit = null;
  for (const el of tipElems) {
    const r = el.getBoundingClientRect();
    if (tipX >= r.left && tipX <= r.right && tipY >= r.top && tipY <= r.bottom) {
      if (el.id.startsWith("target-card-battle-")) {
        const hitId = el.id.replace("target-card-battle-", "");
        if (opponentBattleZone.some(c => c.id === hitId)) {
          battleHit = hitId;
          if (hitBattleId !== hitId) setHitBattleId(hitId);
          break;
        }
      } else if (el.id.startsWith("opponent-shield-")) {
        const hitId = el.id.replace("opponent-shield-", "");
        if (opponentShieldZone.some(c => c.id === hitId)) {
          shieldHit = hitId;
          if (hitShieldId !== hitId) setHitShieldId(hitId);
          break;
        }
      }
    }
  }
  if (!shieldHit && hitShieldId) setHitShieldId(null);
  if (!battleHit && hitBattleId) setHitBattleId(null);

    return (
    <AttackArrow
      startX={start.x}
      startY={start.y}
      endX={end.x}
      endY={end.y}
      visible
    />
  );
};

  const { isOver: isPlayareaOver, setNodeRef: playareaRef } =
    useDroppable({ id: 'playarea' });
  const { setNodeRef: setHandDropRef, isOver: isHandOver } = useDroppable({ id: 'hand-dropzone' });

  const handleEndTurn = () => {
  api.post('/api/end_turn')
    .then(fetchState)
    .catch(err => alert('ターン終了に失敗しました'));
};

const prevOpponentManaCountRef = useRef<number>(opponentManaZone.length);
useEffect(() => {
  if (opponentManaZone.length > prevOpponentManaCountRef.current) {
    // 新しく増えたカードを特定
    const newCard = opponentManaZone[opponentManaZone.length - 1];
    console.log('【デバッグ】opponentMana enqueue呼び出し', newCard, enqueue);
    enqueue({ type: 'opponentMana', card: newCard });
  }
  prevOpponentManaCountRef.current = opponentManaZone.length;
}, [opponentManaZone, enqueue]);

  // シールド攻撃API後にfetchState()で状態更新
  const handleShieldAttack = (cardId: string) => {
  setShowShieldChoiceModal(false);

  api.post('/api/attack_shield', {
    attackerId: attackingCardId?.replace('target-card-battle-', ''),
    shieldId: cardId
  })
    .then(() => {
      fetchState();
      setTimeout(() => setCheckWinNext(true), 100); // 状態更新後にフラグON
    })
    .catch((err: AxiosError<ErrorResponse>) => {
      console.error('シールド攻撃エラー:', err);
      alert(err.response?.data?.error || 'シールド攻撃に失敗しました');
    })
    .finally(() => {
      setAttackingCardId(null);
    });
};

  // シールド枚数と攻撃直後フラグで勝利判定
  useEffect(() => {
    if (checkWinNext && opponentShieldZone.length === 0) {
      setShowWin(true);
      setCheckWinNext(false);
    } else if (checkWinNext) {
      setCheckWinNext(false); // 攻撃直後だが0枚でなければリセット
    }
  }, [opponentShieldZone, checkWinNext]);

  return (
    <DndContext
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
<DragOverlay>
  {overlayData && overlayData.zone !== 'battlezone' ? (
    <div style={{ pointerEvents: 'none' }}>
      <DraggableCard
        id={`overlay-${overlayData.id}`}
        card={overlayData.card}
        zone={overlayData.zone}
        draggingFromId={null}
        setDraggingFromId={() => {}}
        showCost={overlayData.zone === 'hand'}
        overlay
      />
    </div>
  ) : null}
</DragOverlay>

      <div className="relative w-full h-full">
        {flash && <div className="fixed inset-0 bg-white opacity-80 z-[9999] pointer-events-none" />}
        {showTurnAnim && <TurnMessage message={showTurnAnim.message} />}
        {renderAttackArrow()}

        <DeckDisplayPanel
        // 新 API: デッキ配列をそのまま渡す
        deck={deck}
        opponentDeck={opponentDeck}
      />

        <OpponentZones
          opponentBattleZone={opponentBattleZone}
          opponentManaZone={opponentManaZone}
          opponentAvailableMana={opponentAvailableMana}
          isOpponentManaVisible={isOpponentManaVisible}
          setOpponentManaVisible={setOpponentManaVisible}
          droppedBattleCardId={droppedBattleCardId}
          setDraggingFromId={setDraggingFromId}
          opponentShieldZone={opponentShieldZone}
          opponentHandCount={opponentHandCount}
          onCardClick={setSelectedCard}
          hitShieldId={hitShieldId}
        />

        <SelfZones
          draggingZone={
    overlayData && overlayData.zone !== 'battlezone'
      ? overlayData.zone
      : null
  }
          noZone={noZone}
          graveyardZone={graveyard} 
          battleZone={battleZone}
          shieldZone={shieldZone}
          manaZone={manaZone}
          hand={hand}
          hitBattleId={hitBattleId}
          hitShieldId={hitShieldId}
          usedManaThisTurn={isMyTurn ? usedManaThisTurn : false}
          pendingChoice={pendingChoice}
          choiceCandidates={choiceCandidates}
          choicePurpose={choicePurpose}
          availableMana={availableMana}
          isManaVisible={isManaVisible}
          setManaVisible={setManaVisible}
          setSelectedCard={setSelectedCard}
          summonCard={null}
          drawCard={null}
          showDrawCard={false}
          drawAnimPhase={'slide'}
          backImage={backImage}
          showManaAnimCard={null}
          shakeUI={shakeUI}
          draggingFromId={draggingFromId}
          setDraggingFromId={setDraggingFromId}
          fetchState={fetchState}
        />

        {showManaAnimCardFromHook && (
          <ManaAnimation card={showManaAnimCardFromHook} />
        )}

        {showOpponentManaAnimCard && (
          <ManaAnimation card={showOpponentManaAnimCard} isOpponent />
        )}

        {showSummonAnim && (
          <SummonAnimation
            card={showSummonAnim}
            position={isMyTurn ? 'self' : 'opponent'}
          />
        )}

        {graveIconSrc && (
          <img
            src={graveIconSrc}
            alt="自分の墓地アイコン"
            style={{
              position: 'absolute',
              right: '16px',
              top: '329px',
              width: 40,
              height: 40,
              cursor: 'pointer',
              zIndex: 9999,
              userSelect: 'none',
            }}
            onClick={() => setGraveVisible(v => !v)}
            className={shakeUI ? 'animate-shake' : ''}
          />
        )}

        {isMyTurn && (
          <div className="absolute bottom-4 right-4 z-50">
            <EndTurnButton onClick={handleEndTurn} />
          </div>
        )}

        {graveIconSrc && (
          <img
            src={graveIconSrc}
            alt="相手の墓地アイコン"
            style={{
              position: 'fixed',
              top: '185px',
              right: '16px',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              zIndex: 9999,
            }}
            onClick={() => setOpponentGraveVisible(v => !v)}
            className={shakeUI ? 'animate-shake' : ''}
          />
        )}

        <GraveyardPanel
          isGraveVisible={isGraveVisible}
          isOpponentGraveVisible={isOpponentGraveVisible}
          setGraveVisible={setGraveVisible}
          setOpponentGraveVisible={setOpponentGraveVisible}
          pendingChoice={pendingChoice}
          choiceCandidates={choiceCandidates}
          choicePurpose={choicePurpose}
          fetchState={fetchState}
          graveyard={graveyard}
          opponentGraveyard={opponentGraveyard}
          onCardClick={setSelectedCard}
          setSelectedCard={setSelectedCard}
        />

        {/* シールド選択モーダル */}
        {showShieldChoiceModal && (
          <ChoiceModal
            candidates={shieldCandidates}
            purpose="shield_break"
            onSelect={handleShieldAttack}
            onClose={() => {
              setShowShieldChoiceModal(false);
              setAttackingCardId(null);
            }}
          />
        )}

        {showWin && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontSize: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
            }}
          >
            勝利！
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default GameBoard;
