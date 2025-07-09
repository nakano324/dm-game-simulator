import React from 'react';
import  ChoiceModal  from './ChoiceModal';
import { api } from '../api';

interface Props {
  pendingChoice: boolean;
  choiceCandidates: any[];
  choicePurpose: string;
  fetchState: () => void;
}

const ChoiceModalWrapper: React.FC<Props> = ({
  pendingChoice,
  choiceCandidates,
  choicePurpose,
  fetchState,
}) => {
  if (!pendingChoice) return null;

  return (
    <ChoiceModal
      candidates={choiceCandidates}
      purpose={choicePurpose}
      onSelect={(cardId, options) => {
        api.post('/choose_card', {
          card_id: cardId,
          purpose: choicePurpose,
          mode: options?.mode || 'creature', // デフォルトは 'creature'
        })
        .then(fetchState)
        .catch((err) => console.error('選択エラー', err));
      }}
      onClose={() => {
        // モーダルを強制的に閉じる処理があればここに記述
      }}
    />
  );
};

export default ChoiceModalWrapper;
