// src/components/Modal.tsx
import React, { ReactNode, MouseEvent } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
};

export default function Modal({ children, onClose }: ModalProps) {
  // ポータル先の要素（なければ index.html に <div id="modal-root" /> を追加）
  const root = document.getElementById('modal-root') || document.body;

  const handleBgClick = (e: MouseEvent) => {
    if (e.currentTarget === e.target) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBgClick}
    >
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black opacity-50" />
      {/* 中身 */}
      <div className="relative bg-white rounded-lg p-4 shadow-lg z-10">
        {children}
      </div>
    </div>,
    root
  );
}
