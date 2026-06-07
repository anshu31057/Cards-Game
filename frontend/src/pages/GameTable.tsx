// GameTable - Call Break style layout with penalty notifications
import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import PlayerHand from '../components/game/PlayerHand';
import Opponent from '../components/game/Opponent';
import TrickArea from '../components/game/TrickArea';
import BiddingPanel from '../components/game/BiddingPanel';
import TrumpIndicator from '../components/game/TrumpIndicator';
import Scoreboard from '../components/game/Scoreboard';
import RoundEnd from '../components/game/RoundEnd';
import type { Suit } from '../types/game';
import { getValidCardIndices } from '../utils/gameUtils';

export default function GameTable() {
  const { gameState, session, selectedCardIdx, setSelectedCardIdx,
    sendMessage, connectionStatus, trickWinnerId, notifications, removeNotification } = useGameStore();
  const [penaltyMsg, setPenaltyMsg] = useState<string|null>(null);

  // Listen for penalty action results
  const lastAction = useGameStore(s => s.lastAction);
  useEffect(() => {
    if (lastAction?.action === 'play_card' && (lastAction as any).penalty) {
      setPenaltyMsg('❌ Illegal move! Penalty applied.');
      setTimeout(() => setPenaltyMsg(null), 3000);
    }
  }, [lastAction]);

  if (!gameState || !session) return (
    <div className="h-full flex items-center justify-center" style={{ background:'#155222' }}>
      <motion.div className="text-center" animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:1.4,repeat:Infinity }}>
        <div className="text-4xl mb-2">🃏</div>
        <div className="text-gray-300 text-sm">Loading…</div>
      </motion.div>
    </div>
  );

  const { players, player_order, current_player_id, trump_suit, phase,
    current_trick, final_bid, round_number, total_rounds } = gameState;
  const myId = session.playerId;
  const me = players[myId];
  const isMyTurn = current_player_id === myId;
  const isHost = me?.is_host ?? false;

  const opponents = useMemo(() => {
    const others = player_order.filter(id => id !== myId);
    return others.map((id,i) => ({ id, position:(['left','top','right'] as const)[i] ?? 'top' }));
  }, [player_order, myId]);

  const validCardIndices = useMemo(() => {
    if (!me || !isMyTurn || phase !== 'playing') return undefined;
    const best = current_trick.cards.length > 0 ? current_trick.cards[current_trick.cards.length-1]?.card : undefined;
    return getValidCardIndices(me.hand, current_trick.lead_suit, trump_suit, best ?? null);
  }, [me, isMyTurn, phase, current_trick, trump_suit]);

  const handlePlay = (idx: number) => { sendMessage('play_card',{card_idx:idx}); setSelectedCardIdx(null); };
  const handleBid = (t: number, s: Suit) => sendMessage('bid',{tricks:t,suit:s});
  const handleSkip = () => sendMessage('bid',{tricks:0,suit:'spades'});

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background:'#155222' }}>
      {/* Felt */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:'radial-gradient(ellipse 90% 80% at 50% 50%,#1e7033 0%,#155222 45%,#0d3a18 100%)',
        boxShadow:'inset 0 0 0 8px #5c3a1e, inset 0 0 0 10px #3d2510, inset 0 0 50px rgba(0,0,0,0.6)',
      }}/>

      {/* Scoreboard TL */}
      <div className="absolute top-2 left-2 z-20">
        <Scoreboard players={players} playerOrder={player_order} myPlayerId={myId}
          finalBid={final_bid} roundNumber={round_number} totalRounds={total_rounds} />
      </div>

      {/* Trump + PIN TR */}
      <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
        <div className="px-2 py-0.5 rounded text-xs text-yellow-400 font-mono font-bold tracking-widest"
          style={{ background:'rgba(0,0,0,0.55)', border:'1px solid rgba(201,162,39,0.2)' }}>
          {session.roomPin}
        </div>
        <TrumpIndicator trumpSuit={trump_suit} finalBid={final_bid} />
      </div>

      {/* Top opponent */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
        {opponents.find(o=>o.position==='top') && (
          <Opponent player={players[opponents.find(o=>o.position==='top')!.id]}
            isCurrentTurn={current_player_id===opponents.find(o=>o.position==='top')!.id}
            position="top" trumpSuit={trump_suit} />
        )}
      </div>

      {/* Left opponent */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20">
        {opponents.find(o=>o.position==='left') && (
          <Opponent player={players[opponents.find(o=>o.position==='left')!.id]}
            isCurrentTurn={current_player_id===opponents.find(o=>o.position==='left')!.id}
            position="left" trumpSuit={trump_suit} />
        )}
      </div>

      {/* Right opponent */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
        {opponents.find(o=>o.position==='right') && (
          <Opponent player={players[opponents.find(o=>o.position==='right')!.id]}
            isCurrentTurn={current_player_id===opponents.find(o=>o.position==='right')!.id}
            position="right" trumpSuit={trump_suit} />
        )}
      </div>

      {/* Center trick */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <TrickArea trick={current_trick} players={players} myPlayerId={myId} winnerId={trickWinnerId} />
      </div>

      {/* Bottom: my zone */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center">
        <motion.div className="flex items-center gap-3 px-4 py-1.5 mb-0"
          style={{
            background: isMyTurn ? 'rgba(0,255,135,0.12)' : 'rgba(0,0,0,0.55)',
            border: isMyTurn ? '1px solid rgba(0,255,135,0.3)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius:'10px 10px 0 0',
          }}
          animate={isMyTurn ? { boxShadow:['0 -4px 18px rgba(0,255,135,0.15)','0 -4px 30px rgba(0,255,135,0.35)','0 -4px 18px rgba(0,255,135,0.15)'] } : {}}
          transition={{ duration:1.5, repeat:Infinity }}>
          <span className="text-white font-bold text-sm">{me?.name ?? 'You'}</span>
          {me?.bid && <span className="text-yellow-400 text-xs">Bid:{me.bid.tricks}</span>}
          <span className="text-gray-400 text-xs">{me?.tricks_won??0} tricks</span>
          <span className="text-gray-400 text-xs">Score:<span className="text-yellow-300 ml-0.5">{me?.score??0}</span></span>
          {isMyTurn && phase==='playing' && (
            <motion.span className="text-green-400 text-xs font-bold flex items-center gap-1"
              animate={{ opacity:[0.6,1,0.6] }} transition={{ duration:0.8,repeat:Infinity }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>YOUR TURN
            </motion.span>
          )}
        </motion.div>
        <div className="w-full flex justify-center items-end pb-2 px-2" style={{ background:'rgba(0,0,0,0.45)' }}>
          {me && <PlayerHand cards={me.hand} onPlayCard={handlePlay} selectedIdx={selectedCardIdx}
            onSelectCard={setSelectedCardIdx} isMyTurn={isMyTurn} phase={phase} validCardIndices={validCardIndices} />}
        </div>
      </div>

      {/* Bidding overlay */}
      {me && (
        <BiddingPanel phase={phase} isMyTurn={isMyTurn}
          currentBid={final_bid ? {tricks:final_bid.tricks,suit:final_bid.suit,player_id:final_bid.player_id} : null}
          myPlayerId={myId}
          originalBidderId={(gameState as any).original_bidder_id ?? null}
          onBid={handleBid} onSkip={handleSkip}
          myBid={me.bid ? {tricks:me.bid.tricks,suit:me.bid.suit} : null}
          roundNumber={round_number} totalRounds={total_rounds} />
      )}

      {/* Round/Game end */}
      {(phase==='round_end'||phase==='game_over') && (
        <RoundEnd players={players} playerOrder={player_order} myPlayerId={myId}
          isHost={isHost} onNewRound={()=>sendMessage('new_round')}
          roundNumber={round_number} totalRounds={total_rounds} isGameOver={phase==='game_over'} />
      )}

      {/* Penalty shake banner */}
      <AnimatePresence>
        {penaltyMsg && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-3 rounded-2xl text-white font-bold text-sm text-center"
            style={{ background:'rgba(220,38,38,0.95)', border:'1px solid rgba(255,100,100,0.5)', boxShadow:'0 0 30px rgba(220,38,38,0.6)' }}
            initial={{ scale:0.7, opacity:0 }}
            animate={{ scale:[1.1,1], opacity:1, x:[0,-8,8,-6,6,-3,3,0] }}
            exit={{ opacity:0, scale:0.8 }}
            transition={{ duration:0.4 }}>
            {penaltyMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection */}
      {connectionStatus!=='connected' && (
        <motion.div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background:'rgba(245,158,11,0.92)', color:'#000' }}
          animate={{ opacity:[0.8,1,0.8] }} transition={{ duration:1,repeat:Infinity }}>
          {connectionStatus==='reconnecting' ? '⟳ Reconnecting…' : '⚡ Disconnected'}
        </motion.div>
      )}

      {/* Toasts */}
      <div className="absolute top-14 right-2 z-50 flex flex-col gap-1.5">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id}
              className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer max-w-[180px]"
              style={{
                background: n.type==='error'?'rgba(220,38,38,0.9)':n.type==='success'?'rgba(0,180,70,0.9)':n.type==='warning'?'rgba(245,158,11,0.9)':'rgba(15,25,18,0.92)',
                border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', color:'white',
              }}
              initial={{ x:36,opacity:0 }} animate={{ x:0,opacity:1 }} exit={{ x:36,opacity:0 }}
              onClick={() => removeNotification(n.id)}>
              {n.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
