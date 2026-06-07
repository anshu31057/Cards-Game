import { motion } from 'framer-motion';
import type { PlayerState } from '../../types/game';

interface RoundEndProps {
  players: Record<string,PlayerState>; playerOrder: string[];
  myPlayerId: string; isHost: boolean; onNewRound: ()=>void;
  roundNumber: number; totalRounds: number; isGameOver: boolean;
}

export default function RoundEnd({ players, playerOrder, myPlayerId, isHost, onNewRound, roundNumber, totalRounds, isGameOver }: RoundEndProps) {
  const sorted = [...playerOrder].sort((a,b)=>(players[b]?.score??0)-(players[a]?.score??0));
  const medals = ['🥇','🥈','🥉','4th'];

  return (
    <motion.div className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background:'rgba(0,0,0,0.82)', backdropFilter:'blur(10px)' }}
      initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <motion.div className="rounded-3xl p-6 text-center w-full max-w-sm mx-4"
        style={{ background:'linear-gradient(145deg,rgba(10,22,14,0.99),rgba(4,10,6,0.99))', border:'1px solid rgba(201,162,39,0.35)', boxShadow:'0 0 60px rgba(201,162,39,0.15)' }}
        initial={{ scale:0.75,y:50 }} animate={{ scale:1,y:0 }} transition={{ type:'spring',stiffness:280,damping:24,delay:0.1 }}>

        <motion.div className="text-5xl mb-2" animate={{ rotate:[-5,5,-5] }} transition={{ duration:2,repeat:Infinity }}>
          {isGameOver ? '🏆' : '🃏'}
        </motion.div>
        <div className="text-yellow-400 font-bold text-lg shimmer-text mb-0.5">
          {isGameOver ? 'Game Over!' : `Round ${roundNumber} Complete`}
        </div>
        {!isGameOver && <div className="text-gray-500 text-xs mb-4">{totalRounds-roundNumber} round(s) remaining</div>}

        <div className="space-y-2 mb-5 mt-3">
          {sorted.map((pid,rank) => {
            const p = players[pid]; if (!p) return null;
            const isMe = pid === myPlayerId;
            return (
              <motion.div key={pid}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background:isMe?'rgba(0,255,135,0.08)':'rgba(255,255,255,0.03)', border:isMe?'1px solid rgba(0,255,135,0.25)':'1px solid rgba(255,255,255,0.05)' }}
                initial={{ x:-24,opacity:0 }} animate={{ x:0,opacity:1 }} transition={{ delay:0.2+rank*0.08 }}>
                <span className="text-lg">{medals[rank]}</span>
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-medium">{isMe?'You':p.name}{p.is_bot?' 🤖':''}</div>
                  <div className="text-gray-500 text-xs">Tricks: {p.tricks_won}{p.bid?` / Bid: ${p.bid.tricks}`:''}</div>
                </div>
                <div className="text-yellow-400 font-bold text-lg">{p.score}</div>
              </motion.div>
            );
          })}
        </div>

        {isHost ? (
          <motion.button className="w-full py-3 rounded-2xl font-bold text-black text-sm uppercase tracking-wider"
            style={{ background:'linear-gradient(135deg,#c9a227,#f0c040)' }}
            onClick={onNewRound}
            whileHover={{ scale:1.03, boxShadow:'0 0 22px rgba(201,162,39,0.5)' }} whileTap={{ scale:0.97 }}>
            {isGameOver ? '🎮 Play Again' : '▶ Next Round'}
          </motion.button>
        ) : (
          <div className="text-gray-500 text-sm py-3 animate-pulse">Waiting for host…</div>
        )}
      </motion.div>
    </motion.div>
  );
}
