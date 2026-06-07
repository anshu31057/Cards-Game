// PlayerHand - single-tap mobile, sorted fan, smooth animations
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayingCard from './PlayingCard';
import type { Card, GamePhase, Suit } from '../../types/game';

interface PlayerHandProps {
  cards: Card[];
  onPlayCard: (idx: number) => void;
  selectedIdx: number | null;
  onSelectCard: (idx: number | null) => void;
  isMyTurn: boolean;
  phase: GamePhase;
  validCardIndices?: number[];
}

// Sort order: Spades > Hearts > Diamonds > Clubs, then A K Q J 10..2
const SUIT_ORDER: Record<Suit, number> = { spades:0, hearts:1, diamonds:2, clubs:3 };

function sortCards(cards: Card[]): { card: Card; origIdx: number }[] {
  return cards
    .map((card, origIdx) => ({ card, origIdx }))
    .sort((a, b) => {
      const sd = SUIT_ORDER[a.card.suit] - SUIT_ORDER[b.card.suit];
      if (sd !== 0) return sd;
      return b.card.rank_value - a.card.rank_value; // A=14 first
    });
}

function useViewport() {
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setVw(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return vw;
}

const DIM = { xs:{w:38,h:54}, sm:{w:50,h:71}, md:{w:62,h:88} };

export default function PlayerHand({
  cards, onPlayCard, selectedIdx, onSelectCard, isMyTurn, phase, validCardIndices,
}: PlayerHandProps) {
  const vw = useViewport();
  const canPlay = isMyTurn && phase === 'playing';
  const count = cards.length;
  const sizeKey: 'xs'|'sm'|'md' = vw < 400 ? 'xs' : vw < 640 ? 'sm' : 'md';
  const { w: cw } = DIM[sizeKey];
  const maxW = Math.min(vw * 0.84, 660);
  const step = count > 1 ? Math.min(cw + 2, Math.floor((maxW - cw) / (count - 1))) : cw;
  const totalW = count === 0 ? 0 : step * (count - 1) + cw;

  const sorted = sortCards(cards);
  const isValid = useCallback((origIdx: number) =>
    !validCardIndices || validCardIndices.includes(origIdx), [validCardIndices]);

  // ── Single-tap mobile fix ──────────────────────────────────────────────
  // Track last-touch time to suppress ghost click; use onPointerDown for instant response
  const lastTouchRef = useRef<number>(0);

  const handlePointerDown = useCallback((e: React.PointerEvent, origIdx: number) => {
    if (!canPlay || !isValid(origIdx)) return;
    // On touch, pointerdown fires before click — act immediately
    if (e.pointerType === 'touch') {
      e.preventDefault(); // stop ghost click
      lastTouchRef.current = Date.now();
      if (selectedIdx === origIdx) {
        onPlayCard(origIdx);
        onSelectCard(null);
      } else {
        onSelectCard(origIdx);
      }
    }
  }, [canPlay, isValid, selectedIdx, onPlayCard, onSelectCard]);

  const handleClick = useCallback((origIdx: number) => {
    if (!canPlay || !isValid(origIdx)) return;
    // Suppress if we just handled a touch (within 400ms)
    if (Date.now() - lastTouchRef.current < 400) return;
    if (selectedIdx === origIdx) {
      onPlayCard(origIdx);
      onSelectCard(null);
    } else {
      onSelectCard(origIdx);
    }
  }, [canPlay, isValid, selectedIdx, onPlayCard, onSelectCard]);
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center select-none" style={{ touchAction:'none' }}>
      <AnimatePresence>
        {canPlay && (
          <motion.div
            className="mb-1 text-xs font-semibold px-3 py-0.5 rounded-full"
            style={{ background:'rgba(0,255,135,0.13)', border:'1px solid rgba(0,255,135,0.4)', color:'#00ff87' }}
            initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {selectedIdx !== null ? '▶ Tap again to play' : '▶ Choose a card'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative" style={{ width: totalW || cw, height: DIM[sizeKey].h + 24 }}>
        <AnimatePresence mode="popLayout">
          {sorted.map(({ card, origIdx }, displayIdx) => {
            const isSelected = selectedIdx === origIdx;
            const valid = isValid(origIdx);
            const dimmed = canPlay && !valid;
            // Slight rotation for fan effect (center = 0 deg)
            const rotDeg = count > 1 ? ((displayIdx - (count-1)/2) * 1.8) : 0;

            return (
              <motion.div
                key={`${card.suit}-${card.rank}`}
                className="absolute bottom-0"
                style={{ left: displayIdx * step, zIndex: isSelected ? 100 : displayIdx + 1, transformOrigin:'bottom center' }}
                initial={{ y: 70, opacity: 0, rotate: rotDeg }}
                animate={{ y: isSelected ? -20 : 0, opacity: 1, rotate: isSelected ? 0 : rotDeg, scale: isSelected ? 1.07 : 1 }}
                exit={{ y: -40, opacity: 0, scale: 0.8 }}
                transition={{ type:'spring', stiffness:420, damping:32, delay: displayIdx * 0.025 }}
                whileHover={canPlay && valid ? { y: isSelected ? -20 : -12, scale: isSelected ? 1.07 : 1.04, zIndex: 90 } : undefined}
              >
                {isSelected && (
                  <motion.div className="absolute inset-0 rounded pointer-events-none" style={{ zIndex:-1 }}
                    animate={{ boxShadow:['0 0 14px rgba(250,204,21,0.7)','0 0 28px rgba(250,204,21,1)','0 0 14px rgba(250,204,21,0.7)'] }}
                    transition={{ duration:0.9, repeat:Infinity }}/>
                )}
                <PlayingCard
                  card={card} size={sizeKey} selected={isSelected} disabled={dimmed} noAnim
                  style={{ cursor: canPlay && valid ? 'pointer' : 'default', opacity: dimmed ? 0.5 : 1 }}
                  onPointerDown={(e) => handlePointerDown(e, origIdx)}
                  onClick={() => handleClick(origIdx)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
