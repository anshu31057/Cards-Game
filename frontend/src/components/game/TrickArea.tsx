// TrickArea - cards persist until winnerId is set, then flash + clear
import { motion, AnimatePresence } from 'framer-motion';
import PlayingCard from './PlayingCard';
import type { CurrentTrick, PlayerState } from '../../types/game';

interface TrickAreaProps {
  trick: CurrentTrick;
  players: Record<string, PlayerState>;
  myPlayerId: string;
  winnerId: string | null;
}

export default function TrickArea({ trick, players, myPlayerId, winnerId }: TrickAreaProps) {
  const mySeat = players[myPlayerId]?.seat ?? 0;

  const getPos = (playerId: string) => {
    const seat = players[playerId]?.seat ?? 0;
    const rel = (seat - mySeat + 4) % 4;
    return [
      { x:0,   y:46,  r:0   },  // bottom = us
      { x:-54, y:0,   r:10  },  // left
      { x:0,   y:-46, r:180 },  // top
      { x:54,  y:0,   r:-10 },  // right
    ][rel] ?? { x:0, y:0, r:0 };
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width:190, height:165 }}>
      {/* Felt glow */}
      <div className="absolute rounded-full pointer-events-none" style={{
        width:150, height:110,
        background:'radial-gradient(ellipse,rgba(0,140,55,0.28) 0%,transparent 70%)',
        border:'1px solid rgba(255,255,255,0.03)',
      }}/>

      <AnimatePresence>
        {trick.cards.map(({ player_id, card }) => {
          const pos = getPos(player_id);
          const isWinner = winnerId === player_id;
          return (
            <motion.div
              key={`${player_id}-${card.suit}-${card.rank}`}
              className="absolute"
              style={{ zIndex: isWinner ? 10 : 1 }}
              initial={{ scale:0.3, opacity:0, x: pos.x * 2, y: pos.y * 2 }}
              animate={{ scale: isWinner ? 1.18 : 1, opacity:1, x: pos.x, y: pos.y, rotate: pos.r + (Math.random() * 6 - 3) }}
              exit={{ scale:0, opacity:0, transition:{ duration:0.35, delay: isWinner ? 0.7 : 0 }}}
              transition={{ type:'spring', stiffness:400, damping:28 }}>
              {isWinner && (
                <motion.div className="absolute inset-0 rounded pointer-events-none" style={{ zIndex:-1 }}
                  animate={{ boxShadow:['0 0 10px rgba(250,204,21,0.4)','0 0 28px rgba(250,204,21,1)','0 0 10px rgba(250,204,21,0.4)'] }}
                  transition={{ duration:0.55, repeat:3 }}/>
              )}
              <PlayingCard card={card} size="sm" noAnim/>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {trick.cards.length === 0 && (
        <div className="pointer-events-none opacity-20 text-center">
          <div className="text-3xl">♠♥</div>
          <div className="text-gray-500 text-xs mt-0.5">Play a card</div>
        </div>
      )}
    </div>
  );
}
