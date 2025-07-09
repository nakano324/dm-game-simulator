// src/components/TurnAndAttackUI.tsx
import React from 'react';
import { TurnMessage } from './TurnMessage';
import { ManaAnimation } from './ManaAnimation';
import { SummonAnimation } from './SummonAnimation';
import { DrawAnimation } from './DrawAnimation';
import { AttackArrow } from './AttackArrow';

export type TurnAndAttackUIProps = {
  showTurnAnim: { message: string; key: number } | null;
  showManaAnim: any | null;
  showOppManaAnim: any | null;
  showSummonAnim: any | null;
  flash: boolean;
  drawCard: any | null;
  showDrawCard: boolean;
  drawAnimPhase: 'slide' | 'flip';
  backImage: string;
  renderAttackArrow: () => React.ReactNode;
};

const TurnAndAttackUI: React.FC<TurnAndAttackUIProps> = ({
  showTurnAnim,
  showManaAnim,
  showOppManaAnim,
  showSummonAnim,
  flash,
  drawCard,
  showDrawCard,
  drawAnimPhase,
  backImage,
  renderAttackArrow,
}) => {
  return (
    <>
      {flash && <div className="fixed inset-0 bg-white opacity-80 z-[9999] pointer-events-none" />}

      {showTurnAnim && (
        <TurnMessage message={showTurnAnim.message} uniqueKey={showTurnAnim.key} />
      )}

      {showManaAnim && <ManaAnimation card={showManaAnim} />}
      {showOppManaAnim && <ManaAnimation card={showOppManaAnim} />}
      {showSummonAnim && <SummonAnimation card={showSummonAnim} position="self" />}

      {/* 攻撃中の矢印 */}
      {renderAttackArrow()}

      {showDrawCard && drawCard && (
        <DrawAnimation
          drawCard={drawCard}
          phase={drawAnimPhase}
          backImage={backImage}
        />
      )}
    </>
  );
};

export default TurnAndAttackUI;
