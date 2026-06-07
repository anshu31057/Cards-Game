// BiddingPanel - dim overlay (not blur), new bid rules UI
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Suit, GamePhase } from '../../types/game';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../types/game';

interface BiddingPanelProps {
  phase: GamePhase; isMyTurn: boolean;
  currentBid: { tricks: number; suit: Suit; player_id: string } | null;
  myPlayerId: string;
  originalBidderId: string | null;
  onBid: (t: number, s: Suit) => void; onSkip: () => void;
  myBid: { tricks: number; suit: Suit } | null;
  roundNumber: number; totalRounds: number;
}

const SUITS: Suit[] = ['spades','hearts','diamonds','clubs'];

export default function BiddingPanel({
  phase, isMyTurn, currentBid, myPlayerId, originalBidderId,
  onBid, onSkip, myBid, roundNumber, totalRounds,
}: BiddingPanelProps) {
  const isBid = phase==='first_bid' || phase==='final_bid';

  const isOrigBidder = myPlayerId === originalBidderId;
  const minBid = (() => {
    if (phase==='first_bid') return currentBid ? currentBid.tricks+1 : 5;
    if (phase==='final_bid') {
      if (isOrigBidder) {
        const own = (currentBid?.player_id===myPlayerId) ? currentBid.tricks : 0;
        return own + 1;
      }
      return Math.max(10, currentBid ? currentBid.tricks+1 : 10);
    }
    return 1;
  })();

  const [tricks, setTricks] = useState(minBid);
  const [suit, setSuit] = useState<Suit>('spades');
  useEffect(() => { if (tricks < minBid) setTricks(minBid); }, [minBid]);

  if (!isBid) return null;
  const pct = Math.max(0, Math.min(100, ((tricks-minBid)/Math.max(1,13-minBid))*100));

  return (
    <AnimatePresence>
      <motion.div className="absolute inset-0 z-40 flex items-end justify-center pb-40"
        style={{ background:'rgba(0,0,0,0.42)' }}  // dim only — no backdropFilter
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>

        <motion.div className="w-full max-w-xs mx-3 rounded-2xl p-4 shadow-2xl"
          style={{ background:'rgba(6,18,10,0.98)', border:'1px solid rgba(201,162,39,0.3)' }}
          initial={{ y:55, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:55, opacity:0 }}
          transition={{ type:'spring', stiffness:360, damping:30 }}>

          {/* Header */}
          <div className="text-center mb-3">
            <div className="text-yellow-400 font-bold uppercase tracking-widest text-xs">
              {phase==='first_bid' ? 'Make Your Call' : 'Final Override'}
            </div>
            <div className="text-gray-600 text-xs">Rd {roundNumber}/{totalRounds}</div>
            {currentBid && (
              <div className="text-gray-400 text-xs mt-0.5">
                Current: <span className="text-white font-bold">{currentBid.tricks}</span>
                <span className="ml-1" style={{ color:SUIT_COLORS[currentBid.suit] }}>{SUIT_SYMBOLS[currentBid.suit]}</span>
              </div>
            )}
            {phase==='final_bid' && !isOrigBidder && (
              <div className="text-amber-400 text-xs mt-0.5">Need ≥10 to override trump</div>
            )}
            {phase==='final_bid' && isOrigBidder && (
              <div className="text-green-400 text-xs mt-0.5">You can increase your bid</div>
            )}
          </div>

          {!isMyTurn || myBid ? (
            <div className="text-center py-3">
              {myBid ? (
                <div className="text-green-400 font-semibold text-sm">✓ Bid: {myBid.tricks} {SUIT_SYMBOLS[myBid.suit]}</div>
              ) : (
                <motion.div className="text-gray-400 text-sm" animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1.4,repeat:Infinity }}>
                  Waiting…
                </motion.div>
              )}
            </div>
          ) : (
            <>
              <motion.div key={tricks} className="text-center text-5xl font-bold text-white mb-2"
                initial={{ scale:1.2, opacity:0.6 }} animate={{ scale:1, opacity:1 }} transition={{ duration:0.1 }}>
                {tricks}
              </motion.div>

              <div className="px-1 mb-2">
                <input type="range" min={minBid} max={13} value={tricks}
                  onChange={e=>setTricks(Number(e.target.value))} className="w-full h-2 rounded-full"
                  style={{ background:`linear-gradient(to right,#22c55e ${pct}%,rgba(255,255,255,0.1) ${pct}%)`, accentColor:'#22c55e' }}/>
                <div className="flex justify-between text-xs text-gray-600 mt-0.5 px-0.5"><span>{minBid}</span><span>13</span></div>
              </div>

              <div className="flex justify-center gap-5 mb-3">
                {([['−',()=>setTricks(t=>Math.max(minBid,t-1))],['+',()=>setTricks(t=>Math.min(13,t+1))]] as [string,()=>void][]).map(([l,fn])=>(
                  <motion.button key={l} className="w-10 h-10 rounded-full text-xl font-bold text-white"
                    style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}
                    onClick={fn} whileHover={{ scale:1.12 }} whileTap={{ scale:0.9 }}>{l}</motion.button>
                ))}
              </div>

              <div className="flex gap-2 justify-center mb-3">
                {SUITS.map(s=>(
                  <motion.button key={s} className="w-11 h-11 rounded-xl text-xl"
                    style={{ background:suit===s?'rgba(201,162,39,0.22)':'rgba(255,255,255,0.06)', border:suit===s?'2px solid #c9a227':'1px solid rgba(255,255,255,0.1)', color:SUIT_COLORS[s], boxShadow:suit===s?'0 0 10px rgba(201,162,39,0.4)':'none' }}
                    onClick={()=>setSuit(s)} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}>
                    {SUIT_SYMBOLS[s]}
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-2">
                <motion.button className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-300"
                  style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}
                  onClick={onSkip} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}>Skip</motion.button>
                <motion.button className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-black"
                  style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}
                  onClick={()=>onBid(tricks,suit)}
                  whileHover={{ scale:1.02, boxShadow:'0 0 16px rgba(34,197,94,0.5)' }} whileTap={{ scale:0.97 }}>
                  ✓ Bid {tricks} {SUIT_SYMBOLS[suit]}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
