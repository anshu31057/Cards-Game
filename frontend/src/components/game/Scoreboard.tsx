// CardStrike - Compact Scoreboard for mobile (like Call Break score table)
import { motion } from 'framer-motion';
import type { PlayerState, Suit } from '../../types/game';
import { SUIT_SYMBOLS } from '../../types/game';

interface ScoreboardProps {
  players: Record<string, PlayerState>;
  playerOrder: string[];
  myPlayerId: string;
  finalBid: { player_id: string; tricks: number; suit: Suit } | null;
  roundNumber: number; totalRounds: number;
}

export default function Scoreboard({ players, playerOrder, myPlayerId, finalBid, roundNumber, totalRounds }: ScoreboardProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: 120,
        fontSize: 10,
      }}
    >
      {/* Header row */}
      <div className="flex items-center px-2 py-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(201,162,39,0.12)' }}>
        <span className="text-yellow-400 font-bold uppercase tracking-wider flex-1" style={{ fontSize: 9 }}>
          Rd {roundNumber}/{totalRounds}
        </span>
        <span className="text-gray-500" style={{ fontSize: 9 }}>Bid</span>
        <span className="text-gray-500 ml-2" style={{ fontSize: 9 }}>Pts</span>
      </div>

      {/* Player rows */}
      {playerOrder.map(pid => {
        const p = players[pid];
        if (!p) return null;
        const isMe = pid === myPlayerId;
        const isBidder = finalBid?.player_id === pid;
        const bidMet = p.bid ? p.tricks_won >= p.bid.tricks : null;

        return (
          <motion.div
            key={pid}
            className="flex items-center px-2 py-1 gap-1"
            style={{
              background: isMe ? 'rgba(0,255,135,0.07)' : 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
            layout
          >
            {/* Name */}
            <div className="flex-1 truncate font-medium" style={{
              color: isMe ? '#a7f3d0' : '#ddd',
              maxWidth: 52,
            }}>
              {isMe ? 'You' : p.name.slice(0, 6)}
              {isBidder && <span className="text-yellow-400 ml-0.5">★</span>}
            </div>

            {/* Tricks/bid */}
            <div style={{
              color: bidMet === true ? '#34d399' : bidMet === false ? '#f87171' : '#aaa',
              fontWeight: 700,
              minWidth: 28,
              textAlign: 'right',
            }}>
              {p.tricks_won}{p.bid ? `/${p.bid.tricks}` : ''}
              {p.bid && (
                <span className="ml-0.5" style={{
                  color: ['hearts','diamonds'].includes(p.bid.suit) ? '#f87171' : '#ccc',
                }}>
                  {SUIT_SYMBOLS[p.bid.suit as Suit]}
                </span>
              )}
            </div>

            {/* Total score */}
            <motion.div
              key={p.score}
              className="font-bold text-yellow-400 ml-1"
              style={{ minWidth: 22, textAlign: 'right' }}
              animate={{ scale: [1.3, 1] }}
              transition={{ duration: 0.3 }}
            >
              {p.score}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
