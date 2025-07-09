
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { useState, useEffect, useRef } from 'react';
import type { JSX } from 'react'; //
import axios from 'axios';
import { AttackArrow } from "./AttackArrow"; 
import bgImage from './assets/background.png';
import backImage from './assets/back_of_card.png'; 
import endButtonImage from './assets/END_bottun2.png';
import './App.css'; 
import type { CSSProperties } from 'react';
import manaCircle from './assets/Mana_zone.png';
import tombstoneImage from './assets/graveyard_icon.png';

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : '/api',
});

// 文明色パーティクル演出（汎用コンポーネント）
function ManaParticles({ civilization = '青', triggerKey }: { civilization: string, triggerKey: number }) {
  const colors: Record<string, string> = {
  '赤': '#F5293B',
  '青': '#028CD1',
  '緑': '#388746',
  '黒': '#5E5C5E',
  '白': '#FAFF63',
};
  // パーティクルの数や動きは好みで増減可
  const particles = Array.from({ length: 12 });

  // triggerKeyで再マウントし、アニメ再生
  return (
    <div style={{
      pointerEvents: 'none',
      position: 'absolute',
      left: 0, top: 0, width: '100%', height: '100%', zIndex: 30,
      overflow: 'visible',
    }}>
      {particles.map((_, i) => {
        const angle = (360 / particles.length) * i + Math.random() * 8;
        const r = 55 + Math.random() * 10;
        const x = Math.cos(angle * Math.PI / 180) * r + 60;
        const y = Math.sin(angle * Math.PI / 180) * r + 90;
        return (
          <div
            key={i + '-' + triggerKey}
            className="mana-particle"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 8, height: 8,
              borderRadius: '50%',
              background: colors[civilization] || '#028CD1',
              opacity: 0.9,
              animation: `mana-particle-fly 0.5s ease-out forwards`,
              animationDelay: `${i * 0.01}s`,
              transform: `translate(-50%, -50%)`,
              boxShadow: `0 0 10px 2px ${colors[civilization] || '#028CD1'}`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes mana-particle-fly {
          0%   { opacity: 0.9; transform: translate(-50%, -50%) scale(0.6);}
          70%  { opacity: 0.7; }
          90%  { opacity: 0.2; }
          100% { opacity: 0; transform: translate(-50%, -100px) scale(1.2);}
        }
      `}</style>
    </div>
  );
}

type ManaRingProps = {
  manaZone: { civilizations?: string[] }[]
  available: number
  total: number
  size?: number
  strokeWidth?: number
  overlayColor?: string 
  bgColor?: string
}

// マナゾーンのカード配列から文明をユニーク抽出
const getManaZoneCivilizations = (
  manaZone: { civilizations?: string[] }[]
): string[] => {
  const set = new Set<string>()
  manaZone.forEach(card => {
    (card.civilizations || []).forEach(c => set.add(c))
  })
  return Array.from(set)
}

const ManaRing: React.FC<ManaRingProps> = ({
  manaZone,
  available,
  total,
  size = 160,
  strokeWidth = 10,
  overlayColor = "rgba(0,0,0,0.6)", // ← 黒レイヤーの色
}) => {
  const civs   = getManaZoneCivilizations(manaZone)
  const colors = civs.map(getCivilizationColor)
  const radius       = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ratio        = total > 0 ? available / total : 0

  return (
    <svg width={size} height={size}>
      <defs>
        <clipPath id="coreClip">
          <circle cx={size/2} cy={size/2} r={radius} />
        </clipPath>
      </defs>
      {/* 背景画像 */}
      <image
        href={manaCircle}
        x={strokeWidth/2}
        y={strokeWidth/2}
        width={size - strokeWidth}
        height={size - strokeWidth}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#coreClip)"
      />
      {/* 文明色のリング（100%全周で描画） */}
      {colors.length <= 1 ? (
        <circle
          cx={size/2}
          cy={size/2}
          r={radius}
          fill="none"
            stroke={
    total === 0
      ? '#fff'          // ← マナが0枚のときは白で
      : colors[0] || '#38bdf8'
  }
  strokeWidth={strokeWidth}
        />
      ) : colors.map((col, i) => {
        // 多色マナ用：分割セグメントで全周描画
        const segmentLen  = circumference / colors.length
        const dashArray   = `${segmentLen} ${circumference - segmentLen}`
        const dashOffset  = -segmentLen * i
        return (
          <circle
            key={i}
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke={col}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        )
      })}
      {/* 使用不可部分だけ黒レイヤー（arc）を上から重ねる */}
      {total > 0 && available < total && (
        <circle
          cx={size/2}
          cy={size/2}
          r={radius}
          fill="none"
          stroke={overlayColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * (1 - ratio)} ${circumference * ratio}`}
          strokeDashoffset={-circumference * ratio}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.2s, stroke-dashoffset 0.2s' }}
        />
      )}
      <text
        x="50%" y="50%"
        fill="white"
        fontSize={size * 0.25}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {available}/{total}
      </text>
    </svg>
  );
};

function getAuraGradient(civs: string[]): string {
  // 色の変換ヘルパー（既出の getCivilizationColor と同じ）
  const mapColor = (c: string) => {
    switch (c) {
      case "青": return "rgba(0,150,255,0.5)";
      case "赤": return "rgba(255,50,0,0.5)";
      case "緑": return "rgba(0,200,0,0.5)";
      case "黒": return "rgba(124, 66, 152, 0.5)";
      case "白": return "rgba(255,215,0,0.5)";
      default: return "rgba(255,255,255,0.5)";
    }
  };

  if (civs.length === 1) {
    // 単文明なら中心から拡がる単色波紋
    const color = mapColor(civs[0]);
    return `radial-gradient(circle, ${color} 0%, transparent 80%)`;
  } else if (civs.length === 2) {
    // 二文明なら二色グラデーション
    const [c1, c2] = civs.map(mapColor);
    return `radial-gradient(circle, ${c1} 0%, ${c2} 60%, transparent 100%)`;
  } else {
    // ３文明以上は円を３分割するようなコニック
    const cols = civs.map(mapColor).join(", ");
    return `conic-gradient(${cols}, transparent)`;
  }
}

function DraggableCard({
  card,
  index,
  onClick,
}: {
  card: any;
  index: number;
  onClick?: (card: any) => void;
}) {
  const uniqueId = `${card.id}-${index}`;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: uniqueId });

  const style: React.CSSProperties = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    width: '120px',
    height: '180px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    margin: '5px',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(card);
      }}
    >
      {/* 左上：クリーチャー側コスト丸 */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: getCivilizationGradient(card.civilizations || []),
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 1px white',
          zIndex: 10,
        }}
      >
        {card.cost}
      </div>

      {/* クリーチャーコスト丸の「すぐ右側」に呪文コスト丸 */}
      {card.card_type === "twimpact" && card.spell_cost != null && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '30px', // 4px + 24px + 8px間隔
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: getCivilizationGradient(card.spell_civilizations || []),
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px white',
            zIndex: 10,
          }}
        >
          {card.spell_cost}
        </div>
      )}

      <img
        src={card.image_url || 'https://placehold.jp/120x180.png'}
        alt={card.name}
        draggable={false}
        onDragStart={e => e.preventDefault()}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{card.name}</div>
      <div style={{ fontSize: '10px', color: '#666' }}>Power: {card.power}</div>
    </div>
  );
}

function BattleWithHitEffect({
  id,
  isHit,
  card
}: {
  id: string,
  isHit: boolean,
  card: any
}) {
  const [effectKey, setEffectKey] = useState(0);

  useEffect(() => {
    if (!isHit) return;
    const interval = setInterval(() => {
      setEffectKey(k => k + 1);
    }, 700);
    return () => clearInterval(interval);
  }, [isHit]);

  return (
    <div
      id={id}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 80,
        height: 120,
        marginRight: '12px',
        boxSizing: 'border-box'
      }}
    >
      {/* コスト丸などカード装飾 */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: getCivilizationGradient(card.civilizations || []),
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 1px white',
          zIndex: 10,
        }}
      >
        {card.cost}
      </div>
      <img
        src={card.image_url || 'https://placehold.jp/120x180.png'}
        alt={card.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '0 0 6px 6px',
          pointerEvents: 'none',
        }}
      />
      {isHit && <ShieldHitEffect key={effectKey} />}
    </div>
  );
}

type DropZoneProps = {
  zone: any[];
  id: string;
  title: string;
  onCardClick: (card: any) => void;
  setDraggingFromId?: (id: string | null) => void;
  droppedCardId?: string | null;
  usedManaThisTurn?: boolean;
};

function DropZone({
  zone,
  id,
  title,
  onCardClick,
  setDraggingFromId,
  droppedCardId,
  usedManaThisTurn,
}: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  // console.log('DropZone:', id, 'droppedCardId=', droppedCardId, 'zoneIds=', zone.map(c=>c.id));

const containerStyle: CSSProperties = {
   width: '100%', // ← 親divの幅に合わせる（これが最重要！）
    minHeight: '120px',
    backgroundColor:
      id === 'battlezone' ? 'transparent' : isOver ? '#a5f3fc' : '#e2e8f0',
    border: id === 'battlezone' ? 'none' : '2px dashed #888',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    padding: '5px',
    overflowX: 'auto',
    margin: '0 auto',
    justifyContent: 'center', // ← 追加。flex内のアイテムを中央に
};

  const isHand = title === '手札';
  const isBattle = title === 'バトルゾーン';
  const isMana = title === 'マナゾーン';

  return (
    <div ref={setNodeRef} style={containerStyle} className="flex flex-row">
      {zone.map((card, index) => {
        const key = `${id}-${card.id}-${index}`;
        // このIDを全てのバトルゾーンカードに使う
        const elemId = isBattle ? `target-card-battle-${card.id}` : null;

        // 振動アニメーション用は従来通り
        const shakeClass =
          isBattle && droppedCardId === `card-${card.id}`
            ? 'animate-shake'
            : '';

            if (isHand) {
  return (
    <div
      key={key}
      style={{
        opacity: usedManaThisTurn ? 0.4 : 1,
        pointerEvents: usedManaThisTurn ? 'none' : 'auto',
      }}
    >
      <DraggableCard
        card={card}
        index={index}
        onClick={onCardClick}
      />
    </div>
  );
}

        return (
          <div
            key={key}
            id={elemId ?? undefined}
            className={`relative bg-white rounded shadow overflow-hidden ${shakeClass}`}
            style={{
              width: '80px',
              height: '120px',
              marginRight: isBattle ? '12px' : '0px',
              marginLeft: isMana && index > 0 ? '-40px' : '0px',
              zIndex: index,
              transition: 'transform 0.3s cubic-bezier(0.7,0.2,0.2,1)',
              transform: isBattle && card.attacked ? 'rotate(90deg)' : 'none',
            }}
            // バトルゾーンならIDを完全一致でセット
            onPointerDown={
              isBattle && setDraggingFromId
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingFromId(elemId); // ← ここでIDを完全一致
                  }
                : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              onCardClick(card);
            }}
          >
            {/* コスト丸 */}
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: getCivilizationGradient(card.civilizations || []),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 1px white',
                zIndex: 10,
              }}
            >
              {card.cost}
            </div>

            {/* 画像 */}
            <img
              src={card.image_url || 'https://placehold.jp/120x180.png'}
              alt={card.name}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '0 0 6px 6px',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function ShieldHitEffect() {
  // AttackArrow.tsxと同じ値で！
  const arrowHeadHeight = 40;
  const pulseMaxRadius = arrowHeadHeight * 1.0;
  const pulseAlpha = 0.22;

  return (
    <svg
      width={48} height={72}
      style={{
        position: 'absolute', left: 0, top: 0, zIndex: 20, pointerEvents: 'none'
      }}>
      <circle
        cx={24} cy={36} r={arrowHeadHeight * 0.25}
        fill="none"
        stroke="#fff"
        strokeWidth={arrowHeadHeight * 0.20}
        opacity={pulseAlpha}
      >
        <animate attributeName="r" from={arrowHeadHeight * 0.25} to={pulseMaxRadius} dur="0.7s" fill="freeze"/>
        <animate attributeName="opacity" from={pulseAlpha} to="0" dur="0.7s" fill="freeze"/>
      </circle>
    </svg>
  );
}

function ShieldWithHitEffect({
  id,
  isHit,
  backImage
}: {
  id: string,
  isHit: boolean,
  backImage: string
}) {
  const [effectKey, setEffectKey] = useState(0);

  // isHitがtrueの間は0.7秒ごとにeffectKeyを増やし続ける
  useEffect(() => {
    if (!isHit) return;
    const interval = setInterval(() => {
      setEffectKey(k => k + 1);
    }, 700); // 0.7秒ごとに波紋再生
    return () => clearInterval(interval);
  }, [isHit]);

  return (
    <div
      id={id}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 48,
        height: 72,
        margin: '0 1px',
        boxSizing: 'border-box'
      }}
    >
      <img
        src={backImage}
        alt="カード裏面"
        className="w-[48px] h-[72px] m-[0_2px] rounded shadow"
      />
      {isHit && <ShieldHitEffect key={effectKey} />}
    </div>
  );
}

function ZoneDisplay({
  zone, title, onCardClick, facedown = false, hitShieldId, hitBattleId
}: {
  zone: any[];
  title: string;
  onCardClick?: (card: any) => void;
  facedown?: boolean;
  hitShieldId?: string | null;
  hitBattleId?: string | null;
  usedManaThisTurn?: boolean;
}): JSX.Element {
  if (!Array.isArray(zone)) return <div className="text-xs">{title}：未取得</div>;

  const isHand = title === "手札";

  return (
    <div className={`flex flex-col ${isHand ? 'items-end w-full' : 'items-center'}`}>
      <div className={`${isHand ? 'flex flex-nowrap justify-end' : 'flex flex-wrap justify-center gap-4'}`}>
        {zone.map((card, index) => {
          // ★ 手札は常に操作OK（透過・ロック一切なし）
          if (isHand) {
            return (
              <div
                key={`hand-${card.id}-${index}`}
                style={{
                  marginLeft: index === 0 ? '0px' : '-40px',
                  zIndex: index,
                  position: 'relative',
                }}
              >
                <DraggableCard
                  card={card}
                  index={index}
                  onClick={onCardClick}
                />
              </div>
            );
          }

          if (facedown) {
            return (
              <ShieldWithHitEffect
                key={`${title}-facedown-${card.id}-${index}`}
                id={`target-card-${card.id}-${index}`}
                isHit={hitShieldId === `${card.id}-${index}`}
                backImage={backImage}
              />
            );
          }

          if (title === "相手バトルゾーン") {
            return (
              <BattleWithHitEffect
                key={`${title}-${card.id}`}
                id={`target-card-battle-${card.id}`}
                isHit={hitBattleId === card.id}
                card={card}
              />
            );
          }

          if (title === "バトルゾーン") {
            return (
              <BattleWithHitEffect
                key={`${title}-${card.id}`}
                id={`target-card-battle-${card.id}`}
                isHit={hitBattleId === card.id}
                card={card}
              />
            );
          }

          // その他のゾーン
          return (
            <div
              key={`${title}-${card.id}-${index}`}
              id={`target-card-${card.id}`}
              className="w-[80px] h-[120px] m-0.5 bg-white rounded shadow flex flex-col items-center justify-start overflow-hidden relative"
              onClick={(e) => {
                e.stopPropagation();
                onCardClick?.(card);
              }}
            >
              <div
                className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                style={{
                  background: getCivilizationGradient(card.civilizations || []),
                  zIndex: 10,
                }}
              >
                {card.cost}
              </div>
              <img
                src={card.image_url || "https://placehold.jp/120x180.png"}
                alt={card.name}
                className="w-full h-full object-cover"
              />
              {!(title === "マナゾーン" || title === "バトルゾーン") && (
                <>
                  <div className="font-bold mt-1">{card.name}</div>
                  <div className="text-gray-500 text-[10px]">パワー：{card.power}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCivilizationColor(civ: string): string {
  switch (civ) {
    case "赤": return "#F5293B";
    case "青": return "#028CD1";
    case "緑": return "#388746";
    case "黒": return "#5E5C5E";
    case "白": return "#FAFF63";
    default: return "black";
  }
}

function getCivilizationGradient(civs: string[]): string {
  const colors = civs.map(getCivilizationColor);
  if (colors.length === 1) {
    return colors[0];
  } else if (colors.length === 2) {
    return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  } else if (colors.length >= 3) {
    return `conic-gradient(${colors[0]} 0deg 120deg, ${colors[1]} 120deg 240deg, ${colors[2]} 240deg 360deg)`;
  } else {
    return 'black';
  }
}

function ManaDropSquare({
  manaZone,
  availableMana,
  setManaVisible,
  shake = false,
}: {
  manaZone: { civilizations?: string[] }[]
  availableMana: number
  setManaVisible: React.Dispatch<React.SetStateAction<boolean>>
  shake?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'manaSquare' })
  return (
    <div
      ref={setNodeRef}
      className={`${shake ? 'animate-shake' : ''}`}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 10,
        width: 110,
        height: 110,
        zIndex: 9999,
        cursor: 'pointer',
      }}
      onClick={() => setManaVisible(v => !v)}
    >
      <ManaRing
        manaZone={manaZone}
        available={availableMana}
        total={manaZone.length}
        size={110}
        strokeWidth={9}
        bgColor="#e5e7eb"
      />
    </div>
  )
}

function OpponentManaSquare({
    manaZone,
  availableMana,
  setManaVisible,
  shake = false,
}: {
  manaZone: { civilizations?: string[] }[]
  availableMana: number
  setManaVisible: React.Dispatch<React.SetStateAction<boolean>>
  shake?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'opponentManaSquare' })
  return (
    <div
      ref={setNodeRef}
      className={`${shake ? 'animate-shake' : ''}`}
      style={{
        position: 'fixed',
        right: 16,
        top: 16,
        width: 110,
        height: 110,
        zIndex: 9999,
        cursor: 'pointer',
      }}
      onClick={() => setManaVisible(v => !v)}
    >
      <ManaRing
        manaZone={manaZone}
        available={availableMana}
        total={manaZone.length}
        size={110}
        strokeWidth={8}
        bgColor="rgba(0,0,0,0.22)" // 相手用の背景色（好きな色に）
      />
    </div>
  )
}

function App() {
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [battleZone, setBattleZone] = useState<any[]>([]);
  const [hand, setHand] = useState<any[]>([]);
  const [manaZone, setManaZone] = useState<any[]>([]);
  const [shieldZone, setShieldZone] = useState<any[]>([]);
  const [opponentShieldZone, setOpponentShieldZone] = useState<any[]>([]);
  const [opponentBattleZone, setOpponentBattleZone] = useState<any[]>([]);
  const [draggingFromId, setDraggingFromId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cursorRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const previousCardIdRef = useRef<string | null>(null);
  const [showAnimationCard, setShowAnimationCard] = useState<any | null>(null);
  const [isManaVisible, setManaVisible] = useState(false);
  const [opponentManaZone, setOpponentManaZone] = useState<any[]>([]);
  const [isOpponentManaVisible, setOpponentManaVisible] = useState(false);
  const [graveyard, setGraveyard] = useState<any[]>([]);
  const [isGraveVisible, setGraveVisible] = useState(false);
  const [opponentGraveyard, setOpponentGraveyard] = useState<any[]>([]);
  const [isOpponentGraveVisible, setOpponentGraveVisible] = useState(false);
  const [deck, setDeck] = useState<any[]>([]);
  const [opponentDeck, setOpponentDeck] = useState<any[]>([]);
  const [droppedBattleCardId, setDroppedBattleCardId] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [shakeUI, setShakeUI] = useState(false);
  const [availableMana, setAvailableMana] = useState<number>(0);
  const [opponentAvailableMana, setOpponentAvailableMana] = useState<number>(0);
  const [graveIconSrc, setGraveIconSrc] = useState<string>(tombstoneImage);
  const [showManaAnimCard, setShowManaAnimCard] = useState<any | null>(null);
  const [showManaParticlesKey, setShowManaParticlesKey] = useState<number>(0);
  const [showOpponentManaAnimCard, setShowOpponentManaAnimCard] = useState<any | null>(null);
  const [showOpponentManaParticlesKey, setShowOpponentManaParticlesKey] = useState<number>(0);
  const previousOpponentManaZoneRef = useRef<any[]>([]);
  const previousOpponentBattleZoneRef = useRef<any[]>([]);
  const [showOpponentSummonCard, setShowOpponentSummonCard] = useState<any | null>(null);
  const [showTurnAnim, setShowTurnAnim] = useState<{message: string, key: number} | null>(null);
  const [currentTurnPlayer, setCurrentTurnPlayer] = useState<number | null>(null);
  const [turnCount, setTurnCount] = useState<number | null>(null);
  const [opponentBattleZoneDisplay, setOpponentBattleZoneDisplay] = useState<any[]>([]);
  const [hitShieldId, setHitShieldId] = useState<string | null>(null);
  const [hitShieldEffectKey, setHitShieldEffectKey] = useState<number>(0);
  const [hitBattleId, setHitBattleId] = useState<string | null>(null);
  const [usedManaThisTurn, setUsedManaThisTurn] = useState(false);
  const isMyTurn = currentTurnPlayer === 0;
  const [pendingChoice, setPendingChoice] = useState(false);
  const [choiceCandidates, setChoiceCandidates] = useState<any[]>([]);
  const [choicePurpose, setChoicePurpose] = useState<string>("");
  const [opponentHandCount, setOpponentHandCount] = useState<number>(0);
  const [prevHandLength, setPrevHandLength] = useState<number>(0);
  const [animQueue, setAnimQueue] = useState<any[]>([]);
  const [currentAnim, setCurrentAnim] = useState<any | null>(null);
  const previousDeckRef = useRef<any[]>([]);
  const [showDrawCard, setShowDrawCard] = useState<any | null>(null);
  const [showFlipCard, setShowFlipCard] = useState<any | null>(null);
  const [drawCardFace, setDrawCardFace] = useState<'back' | 'front'>('back');
  const [drawAnimPhase, setDrawAnimPhase] = useState<'none' | 'slide' | 'flip'>('none');
  const prevManaCountRef = useRef<number>(0);

useEffect(() => {
  if (currentAnim === null && animQueue.length > 0) {
    const next = animQueue[0];
    setCurrentAnim(next);
    setAnimQueue(q => q.slice(1));

    if (next.type === "turn") {
      setShowTurnAnim({
        message: next.message,
        key: Date.now()
      });
      setTimeout(() => {
        setShowTurnAnim(null);
        setCurrentAnim(null);
      }, 1200);

    }  else if (next.type === "mana") {
      setShowManaAnimCard(next.card);
      setTimeout(() => {
        setShowManaAnimCard(null);
        setCurrentAnim(null);
      }, 800);

    } else if (next.type === "opponentMana") {
      setShowOpponentManaAnimCard(next.card);
      setShowOpponentManaParticlesKey(k => k + 1);
      setTimeout(() => {
        setShowOpponentManaAnimCard(null);
        setCurrentAnim(null);
      }, 500);

    } else if (next.type === "summon") {
      setShowOpponentSummonCard(next.card);
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
      setTimeout(() => {
        setShowOpponentSummonCard(null);
        fetchGameState();
        setCurrentAnim(null);
      }, 1600);
    }
  }
}, [animQueue, currentAnim,]);


useEffect(() => {
  if (opponentBattleZoneDisplay.length > 0) {
    console.log("opponentBattleZoneDisplayのIDリスト:", opponentBattleZoneDisplay.map(c => c.id));
  }
}, [opponentBattleZoneDisplay]);

  useEffect(() => {
  if (!hitShieldId) return;

  // ヒットしている間は0.7秒ごとにキーを増やす
  const interval = setInterval(() => {
    setHitShieldEffectKey(k => k + 1);
  }, 700); // 0.7秒で再発生（ここを速くしたいなら短く）

  // ヒット終了時には止める
  return () => clearInterval(interval);
}, [hitShieldId]);

  useEffect(() => {
    const img = new Image();
    img.src = tombstoneImage;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // R,G,B がすべて 240 以上なら“白”とみなして透明化
        if (d[i] > 240 && d[i+1] > 240 && d[i+2] > 240) {
          d[i+3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      setGraveIconSrc(canvas.toDataURL());
    };
  }, []);


  useEffect(() => {
    fetchGameState();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    if (draggingFromId) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [draggingFromId]);

  useEffect(() => {
  if (!draggingFromId) return;

  const handlePointerMove = (e: PointerEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };
  const handlePointerUp = (e: PointerEvent) => {
    // 攻撃処理
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const target = elements.find(el => el.id?.startsWith('target-card-'));
    if (target) {
      const targetId = target.id.replace('target-card-', '');
      axios.post('http://localhost:5000/api/attack', {
        attackerId: draggingFromId.replace('card-', ''),
        targetId,
      }).then(() => {
        fetchGameState();
      });
    }
    setDraggingFromId(null);
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  return () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };
}, [draggingFromId]);

useEffect(() => {
  if (!draggingFromId) return;

  const doAttack = (targetId: string) => {
    api.post('/attack', {
      attackerId: draggingFromId.replace('card-', ''),
      targetId,
    })
    .catch(err => console.error('attack 失敗', err))
    .finally(() => {
      fetchGameState();
      setDraggingFromId(null);
    });
  };

  const handlePointerUp = (e: PointerEvent) => {
    const elems = document.elementsFromPoint(e.clientX, e.clientY);
    const target = elems.find(el => el.id?.startsWith('target-card-'));
    if (target) {
      doAttack(target.id.replace('target-card-', ''));
    } else {
      setDraggingFromId(null);
    }
  };
  window.addEventListener('pointerup', handlePointerUp);

  const handleMouseUp = (e: MouseEvent) => {
    const elems = document.elementsFromPoint(e.clientX, e.clientY);
    const target = elems.find(el => el.id?.startsWith('target-card-'));
    if (target) {
      doAttack(target.id.replace('target-card-', ''));
    } else {
      setDraggingFromId(null);
    }
  };
  window.addEventListener('mouseup', handleMouseUp);

  return () => {
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [draggingFromId]);

  useEffect(() => {
  console.log(
    "[pendingChoice監視] pendingChoice:", pendingChoice,
    "choiceCandidates:", choiceCandidates.map(c => c.name),
    "choicePurpose:", choicePurpose
  );
}, [pendingChoice, choiceCandidates, choicePurpose]);

function enqueueAnimation(anim: { type: string; card?: any; message?: string }) {
  setAnimQueue(q => [...q, anim]);
}

function playSummonEffect(card: any) {
  // ① 一度リセット：アニメーション用カード／フラッシュ／画面振動を解除
  setShowAnimationCard(null);
  setFlash(false);
  setScreenShake(false);

  // ② 即座にアニメーション開始準備
  setTimeout(() => {
    // ③ 中央召喚カードをマウント
    setShowAnimationCard(card);

    // ④ フラッシュ＋音声再生
    setFlash(true);
    new Audio('/sounds/summon.mp3').play().catch(() => {});

    // ⑤ フラッシュ解除（0.4秒後）
    setTimeout(() => {
      setFlash(false);
    }, 400);

    // ⑥ 演出完了後（1.6秒後）、まとめて処理
    setTimeout(() => {
      //   - 中央カードをアンマウント
      setShowAnimationCard(null);
      //   - ゲーム状態更新（バトルゾーンにカードを追加）
      fetchGameState();

      //   - 画面全体を振動（0.3秒間）
    setShakeUI(true);
    setTimeout(() => setShakeUI(false), 300);
    }, 1600);
  }, 0);
}  

function fetchGameState() {
  console.log(`[fetchGameState:start] ${new Date().toISOString()}`);  
  api.get('/state')
    .then(({ data }) => {
      console.log("[fetchGameState]", data);

      // ① 相手マナアニメーション検出
      const newOpponentManaZone = data.opponent_mana_zone ?? [];
      const prevMana = previousOpponentManaZoneRef.current;
      if (newOpponentManaZone.length > prevMana.length) {
        const addedCard = newOpponentManaZone[newOpponentManaZone.length - 1];
        enqueueAnimation({ type: 'opponentMana', card: addedCard });
      }
      previousOpponentManaZoneRef.current = newOpponentManaZone;
      setOpponentManaZone(newOpponentManaZone);

      // === 自分のマナチャージアニメーション検知（useRef版） ===
      const newManaCount = data.mana_zone.length;
      if (newManaCount > prevManaCountRef.current) {
        const addedCard = data.mana_zone[newManaCount - 1];
        console.log(`[ManaAnim] prev=${prevManaCountRef.current}, next=${newManaCount}`, addedCard);
        enqueueAnimation({ type: 'mana', card: addedCard });
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
          enqueueAnimation({ type: 'summon', card: addedCard });
        }
      }
      setOpponentBattleZoneDisplay([...newOpponentBattleZone]);
      previousOpponentBattleZoneRef.current = newOpponentBattleZone;
      setOpponentBattleZone(newOpponentBattleZone);

      // ③ ターン切り替わり演出
      const newTurnPlayer = data.turn_player ?? 0;
      const newTurnCount = data.turn_count ?? 0;
      if (
        (currentTurnPlayer !== null && newTurnPlayer !== currentTurnPlayer) ||
        (turnCount !== null && newTurnCount !== turnCount)
      ) {
        enqueueAnimation({
          type: 'turn',
          message: newTurnPlayer === 0 ? "自分のターン" : "相手のターン"
        });
      }
      setCurrentTurnPlayer(newTurnPlayer);
      setTurnCount(newTurnCount);

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
      setOpponentGraveyard(data.opponent_opponent_graveyard ?? []);
      setDeck(data.deck ?? []);
      setOpponentDeck(data.opponent_deck ?? []);
      setUsedManaThisTurn(data.used_mana_this_turn ?? false);

      console.log(`[fetchGameState:end] ${new Date().toISOString()}`);
    })
    .catch(err => {
      console.error('fetchGameState 失敗', err);
    });
}

function handleDragEnd(event: any) {
  const { active, over } = event;
  if (!over) return;

  const idx = active.id.lastIndexOf('-');
  const cardId = idx !== -1 ? active.id.slice(0, idx) : active.id;

  if (over.id === 'battlezone' || over.id === 'playarea') {
    api.post('/drop_card', { cardId, zone: 'battle' })
      .then(res => {
        const lastCard = res.data.last_played_card;
        if (lastCard) {
          playSummonEffect(lastCard); // 召喚も呪文も同じアニメ
        }
      })
      .catch(err => {
        // エラー時もアラートは出さず、必要ならログのみ
        // console.error(err.response?.data?.error || err);
      })
      .finally(() => {
        fetchGameState();
      });
  }
  else if (over.id === 'manaSquare') {
    if (usedManaThisTurn) {
      alert('このターンはすでにマナチャージしています');
      return;
    }
    api.post('/drop_card', { cardId, zone: 'mana' })
      .catch(err => {
        alert(err.response?.data?.error || "マナチャージできません");
      })
      .finally(() => {
        fetchGameState();
      });
  }
}

  return (
    <>

    <DndContext onDragEnd={handleDragEnd}>
      {showOpponentManaAnimCard && (
  <div
    style={{
      position: 'fixed',
      right: 16 + 8, // マナゾーン右上と揃える
      top: 16 + 8,
      width: 110,
      height: 165,
      zIndex: 10001,
      pointerEvents: 'none',
      animation: 'mana-card-drop 0.45s cubic-bezier(0.17,0.67,0.7,1.3)',
      borderRadius: '12px',
      overflow: 'visible',
      boxShadow: '0 4px 20px 4px rgba(0,0,0,0.12)',
    }}
  >
    {/* 文明コスト○ */}
    <div style={{
      position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: '50%',
      background: getCivilizationGradient(showOpponentManaAnimCard.civilizations || []),
      color: 'white', fontSize: 12, fontWeight: 'bold',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 0 1px white', zIndex: 10,
    }}>
      {showOpponentManaAnimCard.cost}
    </div>
    <img
      src={showOpponentManaAnimCard.image_url || 'https://placehold.jp/120x180.png'}
      alt={showOpponentManaAnimCard.name}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    />

    <style>{`
      @keyframes mana-card-drop {
        0%   { opacity: 0; transform: translateY(-80px) scale(0.8);}
        80%  { opacity: 1; transform: translateY(6px) scale(1.02);}
        100% { opacity: 1; transform: translateY(0) scale(1);}
      }
    `}</style>
  </div>
)}
      <div className={screenShake ? 'animate-screen-shake' : ''}>
      <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16 + 80 + 8,  // マナ正方形(80px) の上に8px マージン
        zIndex: 9999,
      }}
    >
      {/* 山札枚数を追加 */}
      <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>
        山札：{deck.length} 枚
      </div>
      <button
  onClick={() => setGraveVisible(v => !v)}
  className={shakeUI ? 'animate-shake' : ''}
  style={{
    position: 'relative',    // ← 追加
    top: '-20px',              // ← 上から下へ8pxずらす
    padding: '4px',
    borderRadius: '4px',
    left: '40px',
    backgroundColor: '#C296CD',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    /* もし余白で調整したい場合は以下も試せます */
    marginTop: '24px',
    marginBottom: '4px',
  }}
>
  <img
    src={graveIconSrc}
    alt="墓地アイコン"
    style={{
      width: '30px',
      height: '30px',
    }}
  />
</button>
    </div>

    {/* 自分の墓地パネル */}
    {isGraveVisible && (
  <div
    style={{
      position: 'fixed',
      left:    '16px',         // 右端からの位置
      zIndex:   99999,
      minHeight:    '22px',
      width:        '140px',    // 幅
      maxHeight:    '80vh',     // 高さ制限
      overflowY:    'auto',     // 縦スクロール許可
      padding:      '8px',      // 内側余白
      backgroundColor: 'rgba(255,255,255,0.9)', // 背景色
      boxShadow:    '0 2px 6px rgba(0,0,0,0.15)',
      borderRadius: '6px',
    }}
  >

            {/* ✕ボタン */}
                <button
      onClick={() => setGraveVisible(false)}
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        zIndex: 100000,
        backgroundColor: '#f87171',  // 背景を赤に
        color: 'white',              // 文字を白に
        border: 'none',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      ✕
    </button>
        {graveyard.map((card, idx) => (
          <div
  key={`grave-${card.id}-${idx}`}
  style={{
    width: '120px',
    height: '180px',
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    position: 'relative',
    cursor: 'pointer',
    marginTop: idx === 0 ? 0 : '-100px',  // ←ここ！
    zIndex: idx,
  }}
  onClick={e => { e.stopPropagation(); setSelectedCard(card); }}
  >
            <img
              src={card.image_url || 'https://placehold.jp/120x180.png'}
              alt={card.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: getCivilizationGradient(card.civilizations||[]),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 1px white',
              }}
            >
              {card.cost}
            </div>
          </div>
        ))}
      </div>
    )}
    <ManaDropSquare
  manaZone={manaZone}
  availableMana={availableMana}
  setManaVisible={setManaVisible}
  shake={shakeUI}
/>

    {/* 相手のマナ */}
    <OpponentManaSquare
    manaZone={opponentManaZone}
    availableMana={opponentAvailableMana}
    setManaVisible={setOpponentManaVisible}
    shake={shakeUI}
  />


    {/* 相手の墓地を開くボタン（相手マナ正方形の下） */}
<div
  style={{
    position: 'fixed',
    right: 16,
    top: 16 + 80 + 8,  // 相手マナ正方形( top:16 + 80px ) の下に8px
    zIndex: 9999,
  }}
>
   <button
    onClick={() => setOpponentGraveVisible(v => !v)}
    className={shakeUI ? 'animate-shake' : ''}
    style={{
      position: 'relative',   // ← 追加
      top: '40px',            // ← 上方向に8pxずらす（負の値で上へ、正の値で下へ移動）
      padding: '4px',
      borderRadius: '4px',
      left: '40px',
      backgroundColor: '#C296CD',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <img
      src={graveIconSrc}
      alt="墓地アイコン"
      style={{ width: '30px', height: '30px' }}
    />
  </button>

    {/* 山札枚数を追加 */}
    <div style={{ color: 'white', fontWeight: 'bold', marginTop: '42px' }}>
    山札：{opponentDeck.length} 枚
  </div>
</div>

{/* 相手の墓地パネル */}
{isOpponentGraveVisible && (
  <div
      style={{
      position: 'fixed',
      top: '10px',
      left: '16px',
      minHeight:'22px',
      zIndex: 99999,
      width: '140px',
      maxHeight: '100vh',
      overflowY: 'auto',
      paddingTop: '8px',
      backgroundColor: 'rgba(255,255,255,0.9)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      borderRadius: '6px',
      
    }}
  >
    {/* ✕ボタン */}
                    <button
      onClick={() => setOpponentGraveVisible(false)}
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        zIndex: 100000,
        backgroundColor: '#f87171',  // 背景を赤に
        color: 'white',              // 文字を白に
        border: 'none',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      ✕
    </button>

    {opponentGraveyard.map((card, idx) => (
      <div
  key={`grave-${card.id}-${idx}`}
  style={{
    width: '120px',
    height: '180px',
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    position: 'relative',
    cursor: 'pointer',
    marginTop: idx === 0 ? 0 : '-100px',  // ←ここ！
    zIndex: idx,
  }}
  onClick={e => { e.stopPropagation(); setSelectedCard(card); }}
>
        <img
          src={card.image_url || 'https://placehold.jp/120x180.png'}
          alt={card.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: getCivilizationGradient(card.civilizations||[]),
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px white',
          }}
        >
          {card.cost}
        </div>
      </div>
    ))}
  </div>
)}

          {/* 全画面背景画像 */}
          <img
        src={bgImage}
        alt="背景"
        className="fixed inset-0 w-full h-full object-cover -z-10"
      />

      {/* ゲーム画面レイアウト */}
<div className="relative grid grid-rows-[1fr_1fr_2fr_1fr_0.6fr_0.4fr] grid-cols-2 h-screen p-2 overflow-hidden">
  {/* 👇 ②相手シールドゾーン＋手札ダミー */}
<div
  className={`col-span-2 flex justify-center mt-[-5px] ${shakeUI ? 'animate-shake' : ''}`}
  style={{
    height: '80px',
    alignItems: 'center',
    overflow: 'visible',
  }}
>
  {/* シールド表示 */}
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <ZoneDisplay
      zone={opponentShieldZone}
      title="相手シールド"
      facedown={true}
      hitShieldId={hitShieldId}
    />
    {/* 相手手札の裏向きカードを並べる */}
    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
  {[...Array(opponentHandCount)].map((_, i) => (
    <img
      key={`opp-hand-back-${i}`}
      src={backImage}
      alt="相手手札"
      style={{
        width: '64px',
        height: '96px',
        marginLeft: i === 0 ? 0 : '-16px',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.16)',
      }}
    />
  ))}
</div>
  </div>
</div>

<div
  className={`col-span-2 flex justify-center mt-[10px] ${shakeUI ? 'animate-shake' : ''}`}
  style={{
    height: '120px',
    alignItems: 'center',
    overflow: 'visible',
  }}
>
  <ZoneDisplay
    zone={opponentBattleZoneDisplay}
    title="相手バトルゾーン"
    hitBattleId={hitBattleId}
    onCardClick={setSelectedCard}
  />
</div>

{/* ★バトルゾーン直前に追加！ */}
<div
  id="playarea"
  ref={useDroppable({ id: "playarea" }).setNodeRef}
  style={{
    position: 'fixed',
    left: 0,
    right: 0,
    top: '32%',           // ← 上方向に広げたいならこの値で調整
    height: '220px',      // ← エリアの縦幅も調整
    zIndex: 1200,         // バトルゾーンより上ならこのくらい
    pointerEvents: 'auto',
    background: 'rgba(0,0,0,0)', // 完全透明。デバッグ時は 0.1 などでもOK
  }}
/>
  {/* 👇 バトルゾーン */}
<div className={`col-span-2 flex justify-center items-center w-full mt-[-36px] ${shakeUI ? 'animate-shake' : ''}`}>
  <DropZone
    zone={battleZone}
    id="battlezone"
    title="バトルゾーン"
    setDraggingFromId={setDraggingFromId}
    onCardClick={setSelectedCard}
    droppedCardId={droppedBattleCardId}
  />
</div>


{/* 👇 自分シールドゾーン（直下、余白なしで上に詰める） */}
<div className={`col-span-2 flex justify-center bg-red-200 p-2 mt-[-36px] ${shakeUI ? 'animate-shake' : ''}`}>
  <ZoneDisplay
    zone={shieldZone}
    title="シールド"
    facedown={true}
    onCardClick={setSelectedCard}
  />
</div>

  {/* 👇 手札 */}
  <div
  style={{
    position: 'fixed',
    bottom: '8px', // 画面下端にぴったり
    right: '250px',
    zIndex: 20000,
    display: 'flex',
    justifyContent: 'flex-end',
    width: 'auto',
    maxWidth: '90vw',
  }}
>
  <ZoneDisplay
    zone={hand}
    title="手札"
    onCardClick={setSelectedCard}
    usedManaThisTurn={isMyTurn ? usedManaThisTurn : true}
  />
</div>
</div>

{/* 相手と自分の山札（ENDボタンの左にスタック表示） */}
<div
  style={{
    position: 'fixed',
    right: 180, // ENDボタンの左（140px幅＋40px余白）
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '40px',
  }}
>
  {/* 相手の山札 */}
  <div style={{ position: 'relative', width: '40px', height: '60px' }}>
    {[...opponentDeck].slice(0, 10).map((_, idx) => (
      <img
        key={`opp-deck-${idx}`}
        src={backImage}
        alt="Opponent Deck"
        style={{
          position: 'absolute',
          bottom: `${idx}px`,
          left: 0,
          width: '40px',
          height: '60px',
          zIndex: idx,
        }}
      />
    ))}
  </div>

  {/* 自分の山札 */}
  <div style={{ position: 'relative', width: '40px', height: '60px' }}>
    {[...deck].slice(0, 10).map((_, idx) => (
      <img
        key={`my-deck-${idx}`}
        src={backImage}
        alt="My Deck"
        style={{
          position: 'absolute',
          bottom: `${idx}px`,
          left: 0,
          width: '40px',
          height: '60px',
          zIndex: idx,
        }}
      />
    ))}
  </div>
</div>


    {/* ターン終了ボタン */}
    <div
  style={{
    position: 'fixed',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10000,
    cursor: isMyTurn ? 'pointer' : 'not-allowed',
    opacity: isMyTurn ? 1 : 0.5, // グレーアウト
    pointerEvents: isMyTurn ? 'auto' : 'none', // ←クリック不可
  }}
  onClick={() => {
    if (!isMyTurn) return; // 念のため
    api.post('/end_turn')
  .then(res => {
    fetchGameState();
    if (res.data.status === 'ai_turn') {
      setTimeout(() => {
        api.post('/ai_take_turn')
          .catch(err => console.error('ai_take_turn 失敗', err))
          .finally(() => fetchGameState());
      }, 500);
    }
  })
  .catch(err => console.error('end_turn 失敗', err));
  }}
>
  <img
    src={endButtonImage}
    alt="ターン終了"
    style={{
      width: '100px',
      height: 'auto',
      display: 'block',
      filter: isMyTurn ? 'none' : 'grayscale(0.9) brightness(1.2)', // 画像もグレーアウト
    }}
  />
</div>

      <div
        id="cursor"
        ref={cursorRef}
        style={{ position: 'fixed', top: mousePosition.y, left: mousePosition.x, width: '1px', height: '1px', pointerEvents: 'none', zIndex: 9999 }}
      />

      {/* フラッシュ演出 */}
{flash && <div className="flash" />}

{/* 山札から下にスライド中 */}
{showDrawCard && drawAnimPhase === 'slide' && (
  <img
    src={backImage}
    alt=""
    className="draw-slide"
    style={{
      borderRadius: 8,
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      // 必要なら他の装飾
    }}
  />
)}

{/* 中央でフリップ中 */}
{showDrawCard && drawAnimPhase === 'flip' && (
  <div className="draw-flip-center">
    <div
      className="flip-inner"
      style={{
        transform: drawCardFace === 'front' ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* 裏面 */}
      <img
        src={backImage}
        alt=""
        style={{
          width: "100%", height: "100%",
          borderRadius: 18,
          position: "absolute",
          backfaceVisibility: "hidden",
        }}
      />
      {/* 表面 */}
      <img
        src={showDrawCard.image_url}
        alt=""
        style={{
          width: "100%", height: "100%",
          borderRadius: 18,
          position: "absolute",
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
        }}
      />
    </div>
  </div>
)}

{showTurnAnim && (
  <div
    key={showTurnAnim.key}
    style={{
      position: 'fixed',
      top: '28%',
      left: '50%',
      transform: 'translate(-50%, 0)',
      zIndex: 99999,
      pointerEvents: 'none',
      padding: '40px 72px',
      background: 'rgba(32,36,40,0.87)',
      borderRadius: 28,
      color: '#fff',
      fontSize: 38,
      fontWeight: 700,
      textShadow: '0 4px 28px #000,0 0 18px #00e3ff77',
      boxShadow: '0 6px 64px 0 #222b',
      opacity: 0.96,
      animation: 'turn-fade-inout 1.2s cubic-bezier(0.55,0,0.3,1)',
      letterSpacing: 4,
      textAlign: 'center'
    }}
  >
    {showTurnAnim.message}
    <style>
      {`
        @keyframes turn-fade-inout {
          0%   { opacity: 0; transform: translate(-50%, 0) scale(0.96);}
          12%  { opacity: 1; transform: translate(-50%, -14px) scale(1.06);}
          80%  { opacity: 1; transform: translate(-50%, 0) scale(1);}
          100% { opacity: 0; }
        }
      `}
    </style>
  </div>
)}

{/* 召喚演出：ズシン＋回転 ＆ 文明オーラ */}
{showAnimationCard && !flash && (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      width: 120,
      height: 180,
    }}
    className="animate-summon"
  >
        {/* 文明付きコスト○ */}
        <div
      style={{
        position: 'absolute',
        top: 4,
        left: 4,
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: getCivilizationGradient(showAnimationCard.civilizations || []),
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 1px white',
        zIndex: 10,
      }}
    >
      {showAnimationCard.cost}
    </div>
    <img
      src={showAnimationCard.image_url}
      alt={showAnimationCard.name}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    />
    {/* 文明オーラ */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 8,
        pointerEvents: 'none',
        background: getAuraGradient(showAnimationCard.civilizations || []),
      }}
      className="animate-aura"
    />
  </div>
)}

{showOpponentSummonCard && (
  <div
    style={{
      position: 'fixed',
      top: '20%',
      left: '50%',
      transform: 'translate(-50%, 0)',
      zIndex: 9999,
      width: 120,
      height: 180,
    }}
    className="animate-summon"
  >
    {/* 文明付きコスト○ */}
    <div
      style={{
        position: 'absolute',
        top: 4,
        left: 4,
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: getCivilizationGradient(showOpponentSummonCard.civilizations || []),
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 1px white',
        zIndex: 10,
      }}
    >
      {showOpponentSummonCard.cost}
    </div>
    <img
      src={showOpponentSummonCard.image_url || "https://placehold.jp/120x180.png"}
      alt={showOpponentSummonCard.name}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    />
    {/* 文明オーラ */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 8,
        pointerEvents: 'none',
        background: getAuraGradient(showOpponentSummonCard.civilizations || []),
      }}
      className="animate-aura"
    />
  </div>
)}


{showManaAnimCard && (
  <div
    style={{
      position: 'fixed',
      right: 16 + 8, // マナゾーンの位置に合わせて調整
      bottom: 10 + 8,
      width: 110, height: 165,
      zIndex: 10001,
      pointerEvents: 'none',
      animation: 'mana-card-drop 0.45s cubic-bezier(0.17,0.67,0.7,1.3)',
      borderRadius: '12px',
      overflow: 'visible',
      boxShadow: '0 4px 20px 4px rgba(0,0,0,0.12)',
    }}
  >
    {/* 文明コスト○ */}
    <div style={{
      position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: '50%',
      background: getCivilizationGradient(showManaAnimCard.civilizations || []),
      color: 'white', fontSize: 12, fontWeight: 'bold',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 0 1px white', zIndex: 10,
    }}>
      {showManaAnimCard.cost}
    </div>
    <img
      src={showManaAnimCard.image_url || 'https://placehold.jp/120x180.png'}
      alt={showManaAnimCard.name}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    />

    <style>{`
      @keyframes mana-card-drop {
        0%   { opacity: 0; transform: translateY(80px) scale(0.8);}
        80%  { opacity: 1; transform: translateY(-6px) scale(1.02);}
        100% { opacity: 1; transform: translateY(0) scale(1);}
      }
    `}</style>
  </div>
)}

{/* 自分のマナ一覧パネル */}
{isManaVisible && (
  <div
    style={{
      position: 'fixed',
      top: '10px',
      left: '16px',
      minHeight:'22px',
      zIndex: 99999,
      width: '140px',
      maxHeight: '100vh',
      overflowY: 'auto',
      paddingTop: '8px',
      backgroundColor: 'rgba(255,255,255,0.9)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      borderRadius: '6px',
    }}
  >
            <button
      onClick={() => setManaVisible(false)}
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        zIndex: 100000,
        backgroundColor: '#f87171',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      ✕
    </button>

    {manaZone.map((card, idx) => (
      <div
        key={`mana-${card.id}-${idx}`}
        style={{
          width: '120px',
          height: '180px',
          backgroundColor: 'white',
          borderRadius: '6px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          position: 'relative',
          cursor: 'pointer',
          marginTop: idx === 0 ? 0 : '-100px',
          zIndex: idx,
        }}
        onClick={e => {
          e.stopPropagation();
          setSelectedCard(card);
        }}
      >
        {/* コスト丸 */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: getCivilizationGradient(card.civilizations || []),
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px white',
          }}
        >
          {card.cost}
        </div>
        {/* 画像 */}
        <img
          src={card.image_url || "https://placehold.jp/120x180.png"}
          alt={card.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '0 0 6px 6px',
          }}
        />
      </div>
    ))}
  </div>
)}

  {/* ─── 相手マナ一覧パネル ───────────────────────── */}
  {isOpponentManaVisible && (
      <div
    style={{
      position: 'fixed',
      top: '10px',
      left: '16px',
      minHeight:'22px',
      zIndex: 99999,
      width: '140px',
      maxHeight: '100vh',
      overflowY: 'auto',
      paddingTop: '8px',
      backgroundColor: 'rgba(255,255,255,0.9)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      borderRadius: '6px',
    }}
  >
    {/* ✕ボタン */}
            <button
      onClick={() => setOpponentManaVisible(false)} 
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        zIndex: 100000,
        backgroundColor: '#f87171',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      ✕
    </button>

      {opponentManaZone.map((card, idx) => (
        <div
          key={`opp-mana-${card.id}-${idx}`}
          style={{
            width: '120px',
            height: '180px',
            backgroundColor: 'white',
            borderRadius: '6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            position: 'relative',
            cursor: 'pointer',
            marginTop: idx === 0 ? 0 : '-100px',
            zIndex: idx,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCard(card);
          }}
        >
         {/* コスト丸 */}
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: getCivilizationGradient(card.civilizations||[]),
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px white',
          }}>
            {card.cost}
          </div>
          {/* 画像 */}
          <img
            src={card.image_url||"https://placehold.jp/120x180.png"}
            alt={card.name}
            style={{
              width:'100%',
              height:'100%',
              objectFit:'cover',
              borderRadius:'0 0 6px 6px',
            }}
          />
        </div>
      ))}
    </div>
  )}
  
  </div>
    </DndContext>
    {pendingChoice && (
  <div
    style={{
      position: "fixed",
      top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.68)",
      zIndex: 30000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "white",
        borderRadius: 18,
        padding: "36px 36px 26px",
        minWidth: 380,
        boxShadow: "0 6px 32px #222a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >
      {/* ---- タイトル ---- */}
      <h2 style={{
        fontWeight: 700, fontSize: 22, letterSpacing: 1,
        marginBottom: 18, color: "#215", textAlign: "center"
      }}>
        {choicePurpose === "hand" && "カードを1枚選んで手札に加えてください"}
        {choicePurpose === "mana" && "カードを1枚選んでマナゾーンに置いてください"}
        {choicePurpose === "grave" && "カードを1枚墓地に送ります"}
        {!["hand","mana","grave","twimpact_mode"].includes(choicePurpose) && "カードを選択してください"}
        {choicePurpose === "twimpact_mode" && "ツインパクトカードの使用方法を選択"}
        {!["hand","mana","grave","twimpact_mode"].includes(choicePurpose) && "カードを選択してください"}
      </h2>

      {/* ---- twimpact_mode専用UI ---- */}
      {choicePurpose === "twimpact_mode" ? (
        <div>
          {choiceCandidates.map(card => (
            <div key={card.id} style={{ marginBottom: 16, textAlign: "center" }}>
              <img
                src={card.image_url || "https://placehold.jp/120x180.png"}
                alt={card.name}
                style={{ width: 120, height: 180 }}
              />
              <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
                <button onClick={() => {
                  api.post('/choose_card', {
                    card_id: card.id,
                    purpose: "twimpact_mode",
                    mode: "creature"
                  })
                  .then(res => {
                    const lastCard = res.data.last_played_card;
                    if (lastCard) playSummonEffect(lastCard);
                  })
                  .catch(err => console.error(err))
                  .finally(() => {
                    setPendingChoice(false);
                    fetchGameState();
                  });
                }}>
                  クリーチャーで使う（{card.cost}）
                </button>
                <button onClick={() => {
                  api.post('/choose_card', {
                    card_id: card.id,
                    purpose: "twimpact_mode",
                    mode: "spell"
                  })
                  .then(res => {
                    const lastCard = res.data.last_played_card;
                    if (lastCard) playSummonEffect(lastCard);
                  })
                  .catch(err => console.error(err))
                  .finally(() => {
                    setPendingChoice(false);
                    fetchGameState();
                  });
                }}>
                  呪文で使う（{card.spell_cost}）
                </button>
              </div>
            </div>
          ))}
        </div>

      ) : (
        /* ---- 通常の単一選択UI ---- */
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {choiceCandidates.map(card => (
            <div
              key={card.id}
              style={{
                width: 120, height: 180,
                border: "2px solid #2491ff",
                borderRadius: 10,
                background: "#eef6fa",
                boxShadow: "0 2px 10px #0002",
                cursor: "pointer",
                transition: "transform 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                position: "relative"
              }}
              onClick={() => {
                api.post('/choose_card', {
                  card_id: card.id,
                  purpose: choicePurpose,
                  zone: choicePurpose 
                })
                .catch(err => console.error(err))
                .finally(() => {
                  setPendingChoice(false);
                  fetchGameState();
                });
              }}
            >
              <div style={{
                position: "absolute",
                top: 7, left: 8, width: 26, height: 26,
                borderRadius: "50%",
                background: getCivilizationGradient(card.civilizations || []),
                color: "white", fontWeight: "bold", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 1px white", zIndex: 10
              }}>
                {card.cost}
              </div>
              <img
                src={card.image_url || "https://placehold.jp/120x180.png"}
                alt={card.name}
                style={{
                  width: "100%",
                  height: "74%",
                  borderRadius: 7,
                  marginBottom: 6,
                  objectFit: "cover"
                }}
              />
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, textAlign: "center" }}>{card.name}</div>
              <div style={{ fontSize: 12, color: "#555" }}>パワー：{card.power}</div>
            </div>
          ))}
        </div>
      )}

      {choicePurpose !== "twimpact_mode" && (
        <div style={{ marginTop: 18, color: "#444", fontSize: 13 }}>
          クリックで1枚選択
        </div>
      )}
    </div>
  </div>
)}

    {draggingFromId && (() => {
      const fromElem = document.getElementById(draggingFromId);
      console.log("fromElem:", fromElem, "draggingFromId:", draggingFromId); 
      if (!fromElem) {
        console.log("fromElemが見つからない", draggingFromId);
        return null;
      }
      const rect = fromElem.getBoundingClientRect();
      const start = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const end = mousePosition;
      const arrowHeadLength = 44; // AttackArrow.tsxと同じ値
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const norm = Math.sqrt(dx * dx + dy * dy);
      const tipX = end.x + (dx / norm) * arrowHeadLength;
      const tipY = end.y + (dy / norm) * arrowHeadLength;

      // elementsFromPointで複数ヒットしたカードから「tipX,tipYが矩形内に入っているもの」だけに絞る
      const tipElems = document.elementsFromPoint(tipX, tipY)
        .filter(el =>
          el.id && (
            el.id.startsWith("target-card-") ||
            el.id.startsWith("target-card-battle-")
          )
        );
        console.log("tipElemsのidリスト:", tipElems.map(e => e.id), "tipX:", tipX, "tipY:", tipY);

      let shieldHit = null;
      let battleHit = null;

      for (const el of tipElems) {
        const r = el.getBoundingClientRect();
        if (tipX >= r.left && tipX <= r.right && tipY >= r.top && tipY <= r.bottom) {
          // バトルゾーン判定
          if (el.id.startsWith("target-card-battle-")) {
            const hitId = el.id.replace("target-card-battle-", "");
            if (opponentBattleZoneDisplay.some((c) => c.id === hitId)) {
              console.log("バトルゾーンヒット: hitId=", hitId, "opponentBattleZoneDisplay:", opponentBattleZoneDisplay.map(c => c.id));
              battleHit = hitId;
              if (hitBattleId !== hitId) setHitBattleId(hitId);
              break;
            }
          }
          // シールド判定
          else if (el.id.startsWith("target-card-")) {
            const hitId = el.id.replace("target-card-", "");
            if (opponentShieldZone.some((c) => c.id === hitId)) {
              shieldHit = hitId;
              if (hitShieldId !== hitId) setHitShieldId(hitId);
              break;
            }
          }
        }
      }

      // どこにもヒットしなければ解除
      if (!shieldHit && hitShieldId) {
        setHitShieldId(null);
      }
      if (!battleHit && hitBattleId) {
        setHitBattleId(null);
      }

      return (
        <AttackArrow
          startX={start.x}
          startY={start.y}
          endX={end.x}
          endY={end.y}
          visible={true}
        />
      );
    })()}
    </>
  );
}


export default App;
