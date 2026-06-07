// PlayingCard - img-first SVG, inline fallback, mobile-safe touch
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card, Suit } from '../../types/game';
import { SUIT_SYMBOLS } from '../../types/game';
import { cardImagePath, CARD_BACK_PATH } from '../../utils/cardAssets';

interface PlayingCardProps {
  card?: Card | null;
  hidden?: boolean; faceDown?: boolean; selected?: boolean; disabled?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dealDelay?: number; noAnim?: boolean;
  className?: string; style?: React.CSSProperties;
}

const SIZES = {
  xs: { w: 52, h: 74, r: 6 },
  sm: { w: 68, h: 96, r: 8 },
  md: { w: 92, h: 132, r: 10 },
  lg: { w: 118, h: 168, r: 12 },
};
const RED: Suit[] = ['hearts', 'diamonds'];

function InlineFace({ card, dim }: { card: Card; dim: typeof SIZES['md'] }) {
  const { w, h, r } = dim;
  const isRed = RED.includes(card.suit);
  const col = isRed ? '#dc2626' : '#111';
  const sym = SUIT_SYMBOLS[card.suit];
  const cx = w / 2, cy = h / 2;
  const fs = Math.round(w * 0.18);
  const csz = Math.round(w * 0.3);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <rect x={0} y={0} width={w} height={h} rx={r} fill="white" stroke="#d1d5db" strokeWidth={0.75} />
      <text x={3} y={fs + 2} fill={col} fontSize={fs} fontFamily="Georgia,serif" fontWeight="700">{card.rank}</text>
      <text x={3} y={fs * 2 + 3} fill={col} fontSize={fs - 1}>{sym}</text>
      <g transform={`rotate(180,${cx},${cy})`}>
        <text x={3} y={fs + 2} fill={col} fontSize={fs} fontFamily="Georgia,serif" fontWeight="700">{card.rank}</text>
        <text x={3} y={fs * 2 + 3} fill={col} fontSize={fs - 1}>{sym}</text>
      </g>
      {['J', 'Q', 'K'].includes(card.rank) && <>
        <text x={cx} y={cy - 2} fill={col} fontSize={csz * 0.85} textAnchor="middle" fontFamily="Georgia,serif" fontWeight="900">{card.rank}</text>
        <text x={cx} y={cy + csz * 0.85} fill={col} fontSize={csz * 0.65} textAnchor="middle">{sym}</text>
      </>}
      {card.rank === 'A' && <text x={cx} y={cy + csz * 0.5} fill={col} fontSize={csz * 1.5} textAnchor="middle">{sym}</text>}
      {!['J', 'Q', 'K', 'A'].includes(card.rank) && <text x={cx} y={cy + csz * 0.4} fill={col} fontSize={csz * 0.75} textAnchor="middle">{sym}</text>}
    </svg>
  );
}

function InlineBack({ dim }: { dim: typeof SIZES['md'] }) {
  const { w, h, r } = dim;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <rect x={0} y={0} width={w} height={h} rx={r} fill="#1e1b4b" stroke="#4c1d95" strokeWidth={0.75} />
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={r - 2} fill="none" stroke="#5b21b6" strokeWidth={0.8} opacity={0.6} />
      <text x={w / 2} y={h / 2 + 6} fill="#6d28d9" fontSize={Math.round(w * 0.28)} textAnchor="middle" opacity={0.8}>♠</text>
    </svg>
  );
}

export default function PlayingCard({
  card, hidden, faceDown = false, selected, disabled,
  onClick, onPointerDown, size = 'md', dealDelay = 0, noAnim = false, className = '', style,
}: PlayingCardProps) {
  const screenWidth = window.innerWidth;

  let dim = SIZES[size];

  if (screenWidth < 480) {
    dim = SIZES.xs;
  }
  else if (screenWidth < 768) {
    dim = SIZES.sm;
  }
  const showBack = faceDown || hidden || !card;
  const [imgFailed, setImgFailed] = useState(false);

  const cardStyle: React.CSSProperties = {
    width: dim.w, height: dim.h,
    cursor: onClick && !disabled ? 'pointer' : 'default',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  const imgContent = !imgFailed ? (
    <img
      src={showBack ? CARD_BACK_PATH : (card ? cardImagePath(card.suit, card.rank) : CARD_BACK_PATH)}
      width={dim.w} height={dim.h}
      alt={card ? `${card.rank} ${card.suit}` : 'card back'}
      onError={() => setImgFailed(true)}
      draggable={false}
      style={{
        display: 'block', width: dim.w, height: dim.h,
        objectFit: 'contain', imageRendering: 'auto',
        borderRadius: dim.r, border: selected ? '2px solid #fbbf24' : 'none',
        filter: disabled ? 'brightness(0.45) saturate(0.2)' : undefined,
        boxSizing: 'border-box', pointerEvents: 'none',
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        boxShadow:
          '0 8px 20px rgba(0,0,0,0.35)',
      }}
    />
  ) : (showBack ? <InlineBack dim={dim} /> : card ? <InlineFace card={card} dim={dim} /> : <InlineBack dim={dim} />);

  if (noAnim) return (
    <div className={`inline-block no-select relative ${className}`} style={cardStyle}
      onClick={onClick} onPointerDown={onPointerDown}>
      {selected && <div className="absolute inset-0 rounded pointer-events-none" style={{ boxShadow:
'0 0 24px rgba(250,204,21,0.95), 0 0 40px rgba(251,191,36,0.45)', zIndex: -1 }} />}
      {imgContent}
    </div>
  );

  return (
    <motion.div className={`inline-block no-select relative ${className}`} style={cardStyle}
      initial={{
  y:-120,
  opacity:0,
  scale:0.6,
  rotate:-15,
}}
      animate={{
  y:selected ? -18 : 0,
  opacity:1,
  scale:selected ? 1.08 : 1,
  rotate:selected ? 0 : -1,
}}
      transition={{
  type:'spring',
  stiffness:240,
  damping:20,
  mass:0.8,
  delay:dealDelay
}}
     whileHover={{
  y:selected ? -20 : -14,
  scale:1.08,
  rotate:selected ? 0 : -2,
}}
      onClick={onClick} onPointerDown={onPointerDown}>
      {selected && <motion.div className="absolute inset-0 rounded pointer-events-none"
        style={{ boxShadow: '0 0 18px rgba(250,204,21,0.85)', zIndex: -1 }}
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }} />}
      {imgContent}
    </motion.div>
  );
}
