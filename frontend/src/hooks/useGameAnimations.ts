import { useState, useEffect, useCallback } from 'react';
import type { AnimItem } from './types';


export function useGameAnimations(
  fetchState: () => void,
) {
  // アニメーション用の状態
  const [animQueue, setAnimQueue] = useState<AnimItem[]>([]);
  const [currentAnim, setCurrentAnim] = useState<AnimItem | null>(null);
  const [showTurnAnim, setShowTurnAnim] = useState<any | null>(null);
  const [showManaAnimCard, setShowManaAnimCard] = useState<any | null>(null);
  const [showOpponentManaAnimCard, setShowOpponentManaAnimCard] = useState<any | null>(null);
  const [showSummonAnim, setShowSummonAnim] = useState<any | null>(null);
  const [flash, setFlash] = useState(false);
  const [shakeUI, setShakeUI] = useState(false);

  const enqueue = useCallback((anim: AnimItem) => {
    console.log('【デバッグ】enqueue実行', anim);
    setAnimQueue(q => [...q, anim]);
  }, []);

  // useEffectでsetEnqueueAnimationを設定する部分は削除

  // キュー進行ロジック（App.tsxのまま！）
  useEffect(() => {
    console.log('【デバッグ】useGameAnimations呼び出し');
    if (currentAnim === null && animQueue.length > 0) {
      const next = animQueue[0];
      console.log("【queue消化: next】", next);
      if (next) {
        setCurrentAnim(next);
        setAnimQueue(q => q.slice(1));

        if (next.type === "turn") {
          setShowTurnAnim({ message: next.message, key: Date.now() });
          setTimeout(() => {
            setShowTurnAnim(null);
            setCurrentAnim(null);
          }, 1200);
        } else if (next.type === "mana") {
          setShowManaAnimCard(next.card);
          setTimeout(() => {
            setShowManaAnimCard(null);
            setCurrentAnim(null);
          }, 800);
        } else if (next.type === "opponentMana") {
          setShowOpponentManaAnimCard(next.card);
          setTimeout(() => {
            setShowOpponentManaAnimCard(null);
            setCurrentAnim(null);
          }, 500);
        } else if (next.type === "summon") {
          setShowSummonAnim(next.card);
          setFlash(true);
          setTimeout(() => setFlash(false), 400);
          setTimeout(() => {
            setShowSummonAnim(null);
            fetchState();
            setCurrentAnim(null);
          }, 1600);
        }
      }
    }
  }, [animQueue, currentAnim]);

  // 必要なら他のエフェクトも追加

  return {
    enqueue,
    showTurnAnim,
    showManaAnimCard,
    showOpponentManaAnimCard,
    showSummonAnim,
    flash,
    shakeUI,
  };
}
