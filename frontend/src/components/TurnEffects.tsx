import { TurnMessage } from './TurnMessage';

type Props = {
  flash: boolean;
  showTurnAnim: { message: string; key: number } | null;
};

export const TurnEffects = ({ flash, showTurnAnim }: Props) => (
  <>
    {flash && (
      <div className="fixed inset-0 bg-white opacity-80 z-[9999] pointer-events-none" />
    )}
    {showTurnAnim && <TurnMessage message={showTurnAnim.message} />}
  </>
);
