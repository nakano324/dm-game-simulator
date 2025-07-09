// DrawAnimation.tsx
import React from 'react';

export function DrawAnimation({
  drawCard,
  phase,
  backImage,
}: {
  drawCard: any;
  phase: 'slide' | 'flip';
  backImage: string;
}) {
  if (!drawCard) return null;

  if (phase === 'slide') {
    return (
      <img
        src={backImage}
        alt=""
        className="draw-slide"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      />
    );
  }

  if (phase === 'flip') {
    return (
      <div className="draw-flip-center">
        <div
          className="flip-inner"
          style={{
            transform: 'rotateY(180deg)',
          }}
        >
          <img
            src={backImage}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 18,
              position: 'absolute',
              backfaceVisibility: 'hidden',
            }}
          />
          <img
            src={drawCard.image_url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 18,
              position: 'absolute',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          />
        </div>
      </div>
    );
  }

  return null;
}
