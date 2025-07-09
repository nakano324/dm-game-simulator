// src/App.tsx
import React, { useState,useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import GameBoard from './components/GameBoard';
import bgImage from './assets/background.png';
import './App.css';
import EndTurnButton from './components/EndTurnButton'; // ✅ エンドボタンを読み込み
import axios from "axios";
import tombstoneImage from './assets/graveyard_icon.png';
import { api } from './api'; 
import { useRef } from 'react';
import { fetchGameState } from './gameApi';
import { useGameState } from './hooks/useGameState';

const App: React.FC = () => {
    const {
        hand,
        fetchState,
        enqueueAnimation,
        setEnqueueAnimation,
        battleZone,
        manaZone,
        shieldZone,
        opponentBattleZone,
        opponentShieldZone,
        opponentManaZone,
        availableMana,
        opponentAvailableMana,
        deck,
        opponentDeck,
        graveyard,
        opponentGraveyard,
        opponentHandCount,
        turnPlayer,
        turnCount,
        usedManaThisTurn,
        pendingChoice,
        choiceCandidates,
        choicePurpose,
        setTurnPlayer, 
        // setterを追加で受け取る！
        setOpponentManaZone,
        setUsedManaThisTurn,
        setShowDrawCard,
        setDrawAnimPhase,
        setDrawCardFace,
        setBattleZone,
        setManaZone,
        setOpponentBattleZone,
        setCurrentTurnPlayer,
        setTurnCount,
        setPendingChoice,
        setChoiceCandidates,
        setChoicePurpose,
        setHand,
        setOpponentHandCount,
        setShieldZone,
        setOpponentShieldZone,
        setAvailableMana,
        setOpponentAvailableMana,
        setGraveyard,
        setOpponentGraveyard,
        setDeck,
        setOpponentDeck,
    } = useGameState();

  const prevRef = useRef(0);
  const prevManaRef = useRef(0);
  const prevOppManaRef = useRef<any[]>([]);
  const prevOppBattleRef = useRef<any[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [opponentBattleZoneDisplay, setOpponentBattleZoneDisplay] = useState<any[]>([]);
  const [hitShieldId, setHitShieldId] = useState<string | null>(null);
  const [hitShieldEffectKey, setHitShieldEffectKey] = useState<number>(0);
  const [graveIconSrc, setGraveIconSrc] = useState<string>("");
  const [mousePosition, setMousePosition] = useState<{x:number, y:number}>({x:0, y:0});
  const [draggingFromId, setDraggingFromId] = useState<string | null>(null);
  
useEffect(() => {
  fetchGameState({
    enqueueAnimation,
    setTurnPlayer, 
    previousOpponentManaZoneRef: prevOppManaRef,
    previousOpponentBattleZoneRef: prevOppBattleRef,
    prevManaCountRef: prevManaRef,
    // ❌ 不要なものは削除 or dummy渡す
    setOpponentManaZone: () => {},
    setUsedManaThisTurn: () => {},
    setManaZone,
    setOpponentBattleZone,
    setOpponentBattleZoneDisplay,
    setCurrentTurnPlayer,
    setTurnCount,
    currentTurnPlayer: turnPlayer,
    turnCount,
    setPendingChoice,
    setChoiceCandidates,
    setChoicePurpose,
    setHand,
    setShowDrawCard: () => {},  // 未使用アニメ → ダミー
    setDrawAnimPhase: () => {},
    setDrawCardFace: () => {},
    setBattleZone,
    setOpponentHandCount,
    setShieldZone,
    setOpponentShieldZone,
    setAvailableMana,
    setOpponentAvailableMana,
    setGraveyard,
    setOpponentGraveyard,
    setDeck,
    setOpponentDeck,
    hand,
  });
}, []);

useEffect(() => {
  if (opponentBattleZoneDisplay.length > 0) {
  }
}, [opponentBattleZoneDisplay]);

  useEffect(() => {
  if (!hitShieldId) return;

  // ヒットしている間は0.7秒ごとにキーを増やす
  const interval = setInterval(() => {
    setHitShieldEffectKey(k => k + 1);
  }, 700); // 0.7秒で再発生（ここを速くしたいなら短く）

  // ヒット終了時には止める
  return () => clearInterval(interval);
}, [hitShieldId]);

  useEffect(() => {
    const img = new Image();
    img.src = tombstoneImage;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // R,G,B がすべて 240 以上なら“白”とみなして透明化
        if (d[i] > 240 && d[i+1] > 240 && d[i+2] > 240) {
          d[i+3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      setGraveIconSrc(canvas.toDataURL());
    };
  }, []);

  useEffect(() => {
  fetchState(); // ← useGameState()から取れる
}, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    if (draggingFromId) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [draggingFromId]);

  useEffect(() => {
  if (!draggingFromId) return;

  const handlePointerMove = (e: PointerEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };
  const handlePointerUp = (e: PointerEvent) => {
    // 攻撃処理
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const target = elements.find(el => el.id?.startsWith('target-card-'));
    if (target) {
      const targetId = target.id.replace('target-card-', '');
      axios.post('http://localhost:5000/api/attack', {
        attackerId: draggingFromId.replace('card-', ''),
        targetId,
      }).then(() => {
        fetchGameState({
        enqueueAnimation,
        previousOpponentManaZoneRef: prevOppManaRef,
        previousOpponentBattleZoneRef: prevOppBattleRef,
        prevManaCountRef: prevManaRef,
        setOpponentManaZone,
        setUsedManaThisTurn,
        setManaZone,
        setOpponentBattleZone,
        setOpponentBattleZoneDisplay,
        setCurrentTurnPlayer,
        setTurnCount,
        currentTurnPlayer: turnPlayer,
        turnCount,
        setPendingChoice,
        setChoiceCandidates,
        setChoicePurpose,
        setHand,
        setShowDrawCard,
        setDrawAnimPhase,
        setDrawCardFace,
        setBattleZone,
        setOpponentHandCount,
        setShieldZone,
        setOpponentShieldZone,
        setAvailableMana,
        setOpponentAvailableMana,
        setGraveyard,
        setOpponentGraveyard,
        setDeck,
        setOpponentDeck,
        setTurnPlayer,
        hand
      });
      });
    }
    setDraggingFromId(null);
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  return () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };
}, [draggingFromId]);

const handleEndTurn = () => {
  api.post('/end_turn')
    .then(res => {
      fetchState();
      // ↓AIのターンだった場合はAI行動APIも叩く
      if (res.data.status === 'ai_turn') {
        // AIターン進行APIを呼び出し
        api.post('/ai_take_turn').then(() => {
          fetchState(); // AI行動後の状態を再取得
        });
      }
    })
    .catch(err => alert('ターン終了に失敗しました'));
};

  return (
    <div className="h-screen overflow-hidden relative">
      {/* 背景画像 */}
      <img
        src={bgImage}
        alt="背景"
        className="fixed inset-0 w-full h-full object-cover -z-10"
      />

      <DndContext onDragEnd={() => { /* DnD未実装でもOK */ }}>
        <GameBoard />
      </DndContext>

      {/* エンドターンボタン */}
      <EndTurnButton onClick={handleEndTurn} disabled={!isMyTurn} />
    </div>
  );
}

export default App;
