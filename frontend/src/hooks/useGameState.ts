import React, { createContext, useState, useCallback, ReactNode, useContext, Dispatch, SetStateAction, useRef } from 'react';
import { api } from '../api';
import type { AnimItem } from './types';
import { fetchGameState } from '../gameApi';

export type GameState = {
  setCurrentTurnPlayer: React.Dispatch<React.SetStateAction<number>>;
  setDrawCardFace: React.Dispatch<React.SetStateAction<'back' | 'front'>>;
  setDrawAnimPhase: React.Dispatch<React.SetStateAction<'slide' | 'flip' | 'none'>>;
  setShowDrawCard: React.Dispatch<React.SetStateAction<any>>;
  enqueueAnimation: (anim: AnimItem) => void;
  setEnqueueAnimation: React.Dispatch<React.SetStateAction<AnimItem[]>>;
  noZone: any[]; // ← 追加
  hand: any[];
  battleZone: any[];
  manaZone: any[];
  shieldZone: any[];
  opponentBattleZone: any[];
  opponentShieldZone: any[];
  opponentManaZone: any[];
  availableMana: number;
  opponentAvailableMana: number;
  deck: any[];
  opponentDeck: any[];
  graveyard: any[];
  opponentGraveyard: any[];
  opponentHandCount: number;
  turnPlayer: number;
  turnCount: number;
  usedManaThisTurn: boolean;
  pendingChoice: boolean;
  choiceCandidates: any[];
  choicePurpose: string;
  fetchState: () => void;
  setHand: React.Dispatch<React.SetStateAction<any[]>>;
  setBattleZone: React.Dispatch<React.SetStateAction<any[]>>;
  setManaZone: React.Dispatch<React.SetStateAction<any[]>>;
  setShieldZone: React.Dispatch<React.SetStateAction<any[]>>;
  setNoZone: React.Dispatch<React.SetStateAction<any[]>>
  setOpponentBattleZone: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentShieldZone: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentManaZone: React.Dispatch<React.SetStateAction<any[]>>;
  setAvailableMana: React.Dispatch<React.SetStateAction<number>>;
  setOpponentAvailableMana: React.Dispatch<React.SetStateAction<number>>;
  setDeck: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentDeck: React.Dispatch<React.SetStateAction<any[]>>;
  setGraveyard: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentGraveyard: React.Dispatch<React.SetStateAction<any[]>>;
  setOpponentHandCount: React.Dispatch<React.SetStateAction<number>>;
  setTurnPlayer: React.Dispatch<React.SetStateAction<number>>;
  setTurnCount: React.Dispatch<React.SetStateAction<number>>;
  setUsedManaThisTurn: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingChoice: React.Dispatch<React.SetStateAction<boolean>>;
  setChoiceCandidates: React.Dispatch<React.SetStateAction<any[]>>;
  setChoicePurpose: React.Dispatch<React.SetStateAction<string>>;
};

const GameStateContext = createContext<GameState | undefined>(undefined);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  // 自分の状態
  const [hand, setHand] = useState<any[]>([]);
  const [noZone, setNoZone] = useState<any[]>([]);
  const [battleZone, setBattleZone] = useState<any[]>([]);
  const [manaZone, setManaZone] = useState<any[]>([]);
  const [shieldZone, setShieldZone] = useState<any[]>([]);
  const [graveyard, setGraveyard] = useState<any[]>([]);
  const [deck, setDeck] = useState<any[]>([]);
  const [availableMana, setAvailableMana] = useState<number>(0);
  const [usedManaThisTurn, setUsedManaThisTurn] = useState<boolean>(false);

  // 相手の状態
  const [opponentBattleZone, setOpponentBattleZone] = useState<any[]>([]);
  const [opponentShieldZone, setOpponentShieldZone] = useState<any[]>([]);
  const [opponentManaZone, setOpponentManaZone] = useState<any[]>([]);
  const [opponentGraveyard, setOpponentGraveyard] = useState<any[]>([]);
  const [opponentDeck, setOpponentDeck] = useState<any[]>([]);
  const [opponentAvailableMana, setOpponentAvailableMana] = useState<number>(0);
  const [opponentHandCount, setOpponentHandCount] = useState<number>(0);

  // 全体の状態
  const [turnPlayer, setTurnPlayer] = useState<number>(0);
  const [turnCount, setTurnCount] = useState<number>(0);
  const [pendingChoice, setPendingChoice] = useState<boolean>(false);
  const [choiceCandidates, setChoiceCandidates] = useState<any[]>([]);
  const [choicePurpose, setChoicePurpose] = useState<string>('');
  const [animationQueue, setAnimationQueue] = useState<AnimItem[]>([]);
  const setEnqueueAnimation = setAnimationQueue;
  const [currentTurnPlayer, setCurrentTurnPlayer] = useState<number>(0);
  const [drawCardFace, setDrawCardFace] = useState<'back' | 'front'>('back');
  const [drawAnimPhase, setDrawAnimPhase] = useState<'slide' | 'flip' | 'none'>('none');
  const [showDrawCard, setShowDrawCard] = useState<any>(null);

  const enqueueAnimation = (anim: AnimItem) => {
  setAnimationQueue(q => [...q, anim]);
};

  const fetchState = useCallback(() => {
    api.get('/state').then(response => {
      const data = response.data;
      // Null合体演算子でデフォルト値を設定
      setNoZone(data.no_zone   ?? []);
      setHand(data.hand ?? []);
      setBattleZone(data.battle_zone ?? []);
      setManaZone(data.mana_zone ?? []);
      setShieldZone(data.shield_zone ?? []);
      setGraveyard(data.graveyard ?? []);
      setDeck(data.deck ?? []);
      setAvailableMana(data.available_mana ?? 0);
      setUsedManaThisTurn(data.used_mana_this_turn ?? false);
      setNoZone(data.no_zone ?? []);

      // 相手
      setOpponentBattleZone(data.opponent_battle_zone ?? []);
      setOpponentShieldZone(data.opponent_shield_zone ?? []);
      setOpponentManaZone(data.opponent_mana_zone ?? []);
      setOpponentGraveyard(data.opponent_graveyard ?? []);
      setOpponentDeck(data.opponent_deck ?? []);
      setOpponentAvailableMana(data.opponent_available_mana ?? 0);
      setOpponentHandCount(data.opponent_hand_count ?? 0);

      // 全体
      setTurnPlayer(data.turn_player ?? 0);
      setTurnCount(data.turn_count ?? 0);
      setPendingChoice(data.pending_choice ?? false);
      setChoiceCandidates(data.choice_candidates ?? []);
      setChoicePurpose(data.choice_purpose ?? '');
    }).catch(error => console.error("Error fetching game state:", error));
  }, []);

  const value: GameState = {
    hand, battleZone, manaZone, shieldZone, graveyard, deck, availableMana, usedManaThisTurn,
    opponentBattleZone, opponentShieldZone, opponentManaZone, opponentGraveyard, opponentDeck,
    opponentAvailableMana, opponentHandCount, turnPlayer, turnCount,
    pendingChoice, choiceCandidates, choicePurpose,noZone,
    setCurrentTurnPlayer,setDrawCardFace,setDrawAnimPhase,setShowDrawCard,
    setEnqueueAnimation, fetchState,setHand, setBattleZone, setManaZone, setShieldZone, 
    setGraveyard, setDeck,setAvailableMana, setUsedManaThisTurn, setOpponentBattleZone, setOpponentShieldZone,
    setOpponentManaZone, setOpponentGraveyard, setOpponentDeck, setOpponentAvailableMana,
    setOpponentHandCount, setTurnPlayer, setTurnCount, setPendingChoice,
    setChoiceCandidates, setChoicePurpose,setNoZone,enqueueAnimation,
  };

  return React.createElement(GameStateContext.Provider, { value }, children);
};

export const useGameState = (): GameState => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
