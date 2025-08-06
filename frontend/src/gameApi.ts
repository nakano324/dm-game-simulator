// src/api/gameApi.ts
import { api } from './api'; // axiosラッパー
import type { AnimItem } from './hooks/types'; 
export let enqueueRef: ((anim: AnimItem) => void) | null = null;

let prevOpponentManaIds: string[] = [];
let animatingOpponentMana = { current: false }; 

type GameData = any;

export type Setters = {
  enqueueAnimation: (anim: AnimItem) => void;
  setTurnPlayer: React.Dispatch<React.SetStateAction<number>>;
  previousOpponentManaZoneRef: React.MutableRefObject<any[]>;
  previousOpponentBattleZoneRef: React.MutableRefObject<any[]>;
  prevManaCountRef: React.MutableRefObject<number>;
  setOpponentManaZone: React.Dispatch<React.SetStateAction<any[]>>;
  setManaZone: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentBattleZone: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentBattleZoneDisplay: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentTurnPlayer: React.Dispatch<React.SetStateAction<number>>;
  setTurnCount: React.Dispatch<React.SetStateAction<number>>;
  currentTurnPlayer: number;
  turnCount: number;
  setPendingChoice: React.Dispatch<React.SetStateAction<boolean>>;
  setChoiceCandidates: React.Dispatch<React.SetStateAction<any[]>>;
  setChoicePurpose: React.Dispatch<React.SetStateAction<string>>;
  setHand: React.Dispatch<React.SetStateAction<any[]>>;
  setShowDrawCard: React.Dispatch<React.SetStateAction<any | null>>;
  setDrawAnimPhase: React.Dispatch<React.SetStateAction<'none' | 'slide' | 'flip'>>;
  setDrawCardFace: React.Dispatch<React.SetStateAction<'back' | 'front'>>;
  setBattleZone: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentHandCount: React.Dispatch<React.SetStateAction<number>>;
  setShieldZone: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentShieldZone: React.Dispatch<React.SetStateAction<any[]>>;
  setAvailableMana: React.Dispatch<React.SetStateAction<number>>;
  setOpponentAvailableMana: React.Dispatch<React.SetStateAction<number>>;
  setGraveyard: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentGraveyard: React.Dispatch<React.SetStateAction<any[]>>;
  setDeck: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentDeck: React.Dispatch<React.SetStateAction<any[]>>;
  setUsedManaThisTurn: React.Dispatch<React.SetStateAction<boolean>>;
  hand: any[];
};

export function fetchGameState(setters: Setters) {
  const {
    enqueueAnimation,
    previousOpponentManaZoneRef,
    previousOpponentBattleZoneRef,
    prevManaCountRef,
    setOpponentManaZone,
    setManaZone,
    setOpponentBattleZone,
    setOpponentBattleZoneDisplay,
    setCurrentTurnPlayer,
    setTurnCount,
    currentTurnPlayer,
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
    setUsedManaThisTurn,
    hand
  } = setters;

  api.get('/state')
    .then(({ data }) => {

      console.log("[API] opponent_mana_zone:", data.opponent_mana_zone);
      console.log("[API] opponent_available_mana:", data.opponent_available_mana);

      const newOpponentManaZone = data.opponent_mana_zone ?? [];
      const prevMana = previousOpponentManaZoneRef.current;
      const newIds = newOpponentManaZone.map((c: any) => c.id);

      // アニメーション発火の条件を厳密化
      if (newIds.length > prevOpponentManaIds.length && !animatingOpponentMana.current) {
        animatingOpponentMana.current = true;
        for (let i = prevOpponentManaIds.length; i < newIds.length; i++) {
          if (typeof enqueueAnimation === 'function') {
            enqueueAnimation?.({ type: "opponentMana", card: newOpponentManaZone[i] });
          }
        }
        // アニメーション完了後にフラグをリセット
        setTimeout(() => {
          animatingOpponentMana.current = false;
        }, 800); // アニメーションの長さに合わせて調整
      }

      setOpponentManaZone(newOpponentManaZone);

      // === 自分のマナチャージアニメーション検知（useRef版） ===
      const newManaCount = data.mana_zone.length;
      if (newManaCount > prevManaCountRef.current) {
        const addedCard = data.mana_zone[newManaCount - 1];
        enqueueAnimation?.({ type: 'mana', card: addedCard });
      }
      prevManaCountRef.current = newManaCount;
      setManaZone(data.mana_zone);

      // ② 相手バトルゾーン召喚アニメ（複数枚対応）
      const newOpponentBattleZone = data.opponent_battle_zone ?? [];
      const prevBattle = previousOpponentBattleZoneRef.current;
      const addedCount = newOpponentBattleZone.length - prevBattle.length;
      if (addedCount > 0) {
        for (let i = 0; i < addedCount; i++) {
          const addedCard = newOpponentBattleZone[prevBattle.length + i];
          enqueueAnimation?.({ type: 'summon', card: addedCard });
        }
      }
      setOpponentBattleZoneDisplay([...newOpponentBattleZone]);
      previousOpponentBattleZoneRef.current = newOpponentBattleZone;
      setOpponentBattleZone(newOpponentBattleZone);

      // ▼▼▼ pendingChoiceなど ▼▼▼
      setPendingChoice(data.pending_choice ?? false);
      setChoiceCandidates(data.choice_candidates ?? []);
      setChoicePurpose(data.choice_purpose ?? "");
      // ▲▲▲ ここまで追加 ▲▲▲

      // ドローアニメーション
      const newHand = data.hand ?? [];
      if (newHand.length > hand.length) {
        const drawnCard = newHand[newHand.length - 1];
        setShowDrawCard(drawnCard);
        setDrawAnimPhase('slide');
        setDrawCardFace('back');
        setTimeout(() => {
          setDrawAnimPhase('flip');
          setTimeout(() => {
            setDrawCardFace('front');
            setTimeout(() => {
              setShowDrawCard(null);
              setDrawAnimPhase('none');
            }, 700);
          }, 600);
        }, 600);
      }
      setHand(newHand);

      // その他の state 更新
      setBattleZone(data.battle_zone);
      setOpponentHandCount(data.opponent_hand_count ?? 0);
      setShieldZone(data.shield_zone);
      setOpponentShieldZone(data.opponent_shield_zone);
      setAvailableMana(data.available_mana ?? 0);
      setOpponentAvailableMana(data.opponent_available_mana ?? 0);
      setGraveyard(data.graveyard ?? []);
      setOpponentGraveyard(data.opponent_graveyard ?? []);
      setDeck(data.deck ?? []);
      setOpponentDeck(data.opponent_deck ?? []);
      setUsedManaThisTurn(data.used_mana_this_turn ?? false);
    })
    .catch(err => {
      console.error('fetchGameState 失敗', err);
    });
}
