// src/components/ManaListPanel.tsx
import React from "react";
import StackedCardPanel from "./SelfmanaCardPanel";
import { getCivilizationGradient } from "../utils/gradients";

type ManaListPanelProps = {
  manaZone: any[];
  onClose: () => void;
  onCardClick: (card: any) => void;
};

const ManaListPanel: React.FC<ManaListPanelProps> = ({ manaZone, onClose, onCardClick }) => {
  return (
    <StackedCardPanel
      cards={manaZone}
      title="マナゾーン"
      onClose={onClose}
      onCardClick={onCardClick}
      getCivilizationGradient={getCivilizationGradient}
      position="bottom-left"
      panelType="mana" 
    />
  );
};

export default ManaListPanel;
