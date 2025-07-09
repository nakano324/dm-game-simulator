export type AnimItem =
  | { type: 'turn'; message: string }
  | { type: 'mana'; card: any }
  | { type: 'opponentMana'; card: any }
  | { type: 'summon'; card: any };