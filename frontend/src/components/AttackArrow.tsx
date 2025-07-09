import React from "react";

interface AttackArrowProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
  color?: string;
}

export const AttackArrow: React.FC<AttackArrowProps> = ({
  startX, startY, endX, endY, visible, color = "#e11d48"
}) => {
  if (!visible) return null;

  // 棒の長さ・方向
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // 三角ヘッド
  const arrowHeadLength = 44;
  const arrowHeadHeight = 40;
  const markerId = `arrowhead-${arrowHeadLength}-${arrowHeadHeight}-flat`;
  

  // 棒の中心点補正不要（先端と三角の底辺一致）
  // 棒の太さ
  const strokeWidth = arrowHeadHeight * 0.24;

  // 波紋のパラメータ
  const pulsePositions = [0.15, 0.35, 0.6, 0.85]; // 線上に出す比率
  const pulseMaxRadius = arrowHeadHeight * 1.0;
  const pulseAlpha = 0.22;

  // アニメのタイミング（4分割で開始をずらす）
  const pulses = [0, 0.25, 0.5, 0.75];

  return (
    <svg
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 50000,
      }}
      width={window.innerWidth}
      height={window.innerHeight}
    >
      <defs>
        <linearGradient id="arrow-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <marker
          id={markerId}
          markerWidth={arrowHeadLength}
          markerHeight={arrowHeadHeight}
          refX="0"
          refY={arrowHeadHeight/2}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon
            points={`0,0 0,${arrowHeadHeight} ${arrowHeadLength},${arrowHeadHeight/2}`}
            fill="url(#arrow-gradient)"
            filter="url(#glow)"
          />
        </marker>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor={color} floodOpacity="0.7"/>
        </filter>
      </defs>
      {/* 棒 */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="url(#arrow-gradient)"
        strokeWidth={strokeWidth}
        markerEnd={`url(#${markerId})`}
        opacity={0.96}
        style={{
          filter: "drop-shadow(0 0 24px #fff8)",
        }}
      />
      {pulsePositions.map((pos, i) => {
  // 線分上の座標を計算
  const px = startX + dx * pos;
  const py = startY + dy * pos;
  return pulses.map((t, j) => (
    <circle
      key={`${i}-${j}`}
      cx={px}
      cy={py}
      r={arrowHeadHeight * 0.25}
      fill="none"           // 塗りつぶしなし
      stroke="#fff"         // 白い輪郭だけ
      strokeWidth={arrowHeadHeight * 0.20}
      opacity={pulseAlpha}
    >
      <animate
        attributeName="r"
        from={arrowHeadHeight * 0.25}
        to={pulseMaxRadius}
        dur="1.6s"
        begin={`${t + i * 0.15}s`}
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        from={pulseAlpha}
        to="0"
        dur="1.6s"
        begin={`${t + i * 0.15}s`}
        repeatCount="indefinite"
      />
    </circle>
  ));
})}
    </svg>
  );
};
