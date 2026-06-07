// CardStrike - Opponent - compact mobile-friendly panel
import { motion } from 'framer-motion';
import PlayingCard from './PlayingCard';
import type { PlayerState, Suit } from '../../types/game';
import { SUIT_SYMBOLS } from '../../types/game';

interface OpponentProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  position: 'top' | 'left' | 'right';
  trumpSuit: Suit | null;
  compact?: boolean;
}

const COLORS = ['#7c3aed','#2563eb','#dc2626','#d97706','#059669','#db2777'];

export default function Opponent({ player, isCurrentTurn, position, compact = false }: OpponentProps) {
  const col = COLORS[player.seat % COLORS.length];
  const cardCount = player.hand_count ?? player.hand.length;
  const isLandscape = position === 'left' || position === 'right';

  // For left/right show cards vertically stacked
  const maxShowCards = compact ? 4 : isLandscape ? 6 : 7;
  const showCount = Math.min(cardCount, maxShowCards);

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      animate={isCurrentTurn ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 1.2, repeat: isCurrentTurn ? Infinity : 0 }}
    >
      {/* Hidden cards mini-fan */}
      {!compact && (
        <div
          className="relative flex justify-center"
          style={{
            width: isLandscape ? 44 : showCount * 10 + 24,
            height: isLandscape ? showCount * 8 + 24 : 44,
          }}
        >
          {Array.from({ length: showCount }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={
                isLandscape
                  ? { top: i * 8, left: 0 }
                  : { left: i * 10, top: 0 }
              }
            >
              <PlayingCard faceDown size="xs" noAnim />
            </div>
          ))}
          {cardCount === 0 && (
            <div className="text-gray-600 text-xs self-center">—</div>
          )}
        </div>
      )}

      {/* Info badge */}
      <motion.div
        className="relative flex flex-col items-center px-2 py-1 rounded-xl"
        style={{
          background: isCurrentTurn ? 'rgba(0,255,135,0.14)' : 'rgba(0,0,0,0.55)',
          border: isCurrentTurn
            ? '1.5px solid rgba(0,255,135,0.55)'
            : '1px solid rgba(255,255,255,0.12)',
          minWidth: compact ? 54 : 70,
          boxShadow: isCurrentTurn ? '0 0 18px rgba(0,255,135,0.25)' : 'none',
        }}
        animate={isCurrentTurn
          ? { boxShadow: ['0 0 12px rgba(0,255,135,0.2)','0 0 28px rgba(0,255,135,0.45)','0 0 12px rgba(0,255,135,0.2)'] }
          : {}}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        {/* Turn dot */}
        {isCurrentTurn && (
          <motion.div
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-green-400"
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          />
        )}

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mb-0.5"
          style={{ background: `linear-gradient(135deg,${col},${col}99)`, fontSize: player.is_bot ? 14 : 10 }}
        >
          {player.is_bot ? '🤖' : player.name.slice(0,2).toUpperCase()}
        </div>

        <div className="text-white font-semibold truncate" style={{ fontSize: 10, maxWidth: compact ? 52 : 68 }}>
          {player.name}
        </div>

        {/* Bid & tricks */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-yellow-400" style={{ fontSize: 10 }}>
            {player.tricks_won}
            {player.bid ? `/${player.bid.tricks}` : ''}
          </span>
          {player.bid && (
            <span style={{ fontSize: 11, color: ['hearts','diamonds'].includes(player.bid.suit) ? '#ef4444' : '#ddd' }}>
              {SUIT_SYMBOLS[player.bid.suit as Suit]}
            </span>
          )}
        </div>

        {/* Disconnected */}
        {!player.is_connected && (
          <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
            <span style={{ fontSize: 9 }} className="text-orange-400">⚡ away</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
