// CardStrike - Lobby with instant real-time player list updates
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import type { PlayerState } from '../types/game';

const DIFF_LABELS: Record<string, string> = {
  easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard', insane: '💀 Insane',
};
const AVATAR_COLORS = ['#7c3aed','#2563eb','#dc2626','#d97706','#059669','#db2777'];

export default function Lobby() {
  const { gameState, session, sendMessage, connectionStatus } = useGameStore();
  const navigate = useNavigate();

  // Redirect to game when phase leaves lobby
  useEffect(() => {
    if (gameState && gameState.phase !== 'lobby') {
      navigate('/game');
    }
  }, [gameState?.phase]);

  if (!gameState || !session) {
    return (
      <div className="h-full flex items-center justify-center felt-texture">
        <motion.div className="text-center" animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1.5, repeat:Infinity }}>
          <div className="text-3xl mb-2">🃏</div>
          <div className="text-gray-400 text-sm">Connecting…</div>
        </motion.div>
      </div>
    );
  }

  const { players, player_order, room_pin } = gameState;
  const myId = session.playerId;
  const me = players[myId];
  const isHost = me?.is_host ?? false;
  const humanCount = Object.values(players).filter(p => !p.is_bot).length;
  const canStart = humanCount >= 2;

  return (
    <div className="w-full h-full flex items-center justify-center felt-texture">
      <motion.div
        className="w-full max-w-sm mx-4"
        initial={{ opacity:0, y:24 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.45 }}
      >
        {/* Title */}
        <div className="text-center mb-5">
          <div className="text-2xl mb-1">🃏</div>
          <h1 className="text-xl font-bold text-white tracking-wider">Game Lobby</h1>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="text-gray-400 text-xs">PIN:</span>
            <motion.span
              className="text-yellow-400 font-mono font-bold text-lg tracking-[0.3em] px-2.5 py-0.5 rounded-lg"
              style={{ background:'rgba(201,162,39,0.12)', border:'1px solid rgba(201,162,39,0.3)' }}
              animate={{ boxShadow:['0 0 6px rgba(201,162,39,0.2)','0 0 16px rgba(201,162,39,0.4)','0 0 6px rgba(201,162,39,0.2)'] }}
              transition={{ duration:2, repeat:Infinity }}
            >{room_pin}</motion.span>
          </div>
          <p className="text-gray-600 text-xs mt-0.5">Share with friends</p>
        </div>

        {/* Panel */}
        <div className="rounded-2xl p-4 shadow-2xl" style={{
          background:'rgba(4,12,8,0.96)',
          border:'1px solid rgba(201,162,39,0.2)',
        }}>

          {/* Player slots */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Players ({Object.keys(players).length}/4)
              </span>
              <span className="text-xs text-gray-600">
                {4 - Object.keys(players).length} open
              </span>
            </div>

            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {player_order.map(pid => {
                  const p = players[pid];
                  if (!p) return null;
                  return (
                    <PlayerRow
                      key={pid}
                      player={p}
                      isMe={pid === myId}
                      isHost={isHost}
                      onKick={() => sendMessage('kick_player', { target_id: pid })}
                    />
                  );
                })}
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 4 - player_order.length) }).map((_, i) => (
                  <motion.div
                    key={`empty-${i}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{
                      background:'rgba(255,255,255,0.02)',
                      border:'1px dashed rgba(255,255,255,0.07)',
                    }}
                    animate={{ opacity:[0.3,0.5,0.3] }}
                    transition={{ duration:2, repeat:Infinity, delay:i*0.4 }}
                  >
                    <div className="w-7 h-7 rounded-full border border-dashed border-gray-600 flex items-center justify-center text-gray-600" style={{ fontSize:11 }}>?</div>
                    <span className="text-gray-600 text-xs italic">Waiting…</span>
                    <span className="ml-auto text-gray-700 text-xs">Seat {player_order.length + i + 1}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Status */}
          {canStart ? (
            <motion.div className="text-xs text-green-400 text-center py-1.5 rounded-xl mb-3"
              style={{ background:'rgba(0,200,80,0.07)', border:'1px solid rgba(0,200,80,0.2)' }}
              initial={{ opacity:0 }} animate={{ opacity:1 }}
            >
              ✓ Ready! Empty slots → bots
            </motion.div>
          ) : (
            <div className="text-xs text-amber-400 text-center py-1.5 rounded-xl mb-3"
              style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)' }}
            >
              Need at least 2 players
            </div>
          )}

          {/* Actions */}
          {isHost ? (
            <motion.button
              className="w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider"
              style={{
                background: canStart ? 'linear-gradient(135deg,#c9a227,#f0c040)' : 'rgba(80,80,80,0.3)',
                color: canStart ? '#000' : '#555',
                cursor: canStart ? 'pointer' : 'not-allowed',
              }}
              onClick={canStart ? () => sendMessage('start_game') : undefined}
              whileHover={canStart ? { scale:1.02, boxShadow:'0 0 25px rgba(201,162,39,0.5)' } : undefined}
              whileTap={canStart ? { scale:0.97 } : undefined}
            >
              🎮 Start Game
            </motion.button>
          ) : (
            <motion.button
              className="w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider"
              style={{
                background: me?.is_ready ? 'rgba(0,200,80,0.15)' : 'rgba(255,255,255,0.06)',
                border: me?.is_ready ? '1px solid rgba(0,200,80,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: me?.is_ready ? '#00cc60' : '#fff',
              }}
              onClick={() => sendMessage('ready')}
              whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
            >
              {me?.is_ready ? '✓ Ready!' : '👍 Mark Ready'}
            </motion.button>
          )}

          <button
            className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => {
              useGameStore.getState().disconnectWs();
              useGameStore.getState().setSession(null);
              window.location.href = '/';
            }}
          >
            ← Leave Room
          </button>
        </div>

        {/* Connection dot */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{
            background: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'reconnecting' ? '#f59e0b' : '#ef4444',
            boxShadow: connectionStatus === 'connected' ? '0 0 5px #22c55e' : 'none',
          }}/>
          <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
        </div>
      </motion.div>
    </div>
  );
}

function PlayerRow({ player, isMe, isHost, onKick }: {
  player: PlayerState; isMe: boolean; isHost: boolean; onKick: () => void;
}) {
  const col = AVATAR_COLORS[player.seat % AVATAR_COLORS.length];
  return (
    <motion.div
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
      style={{
        background: isMe ? 'rgba(0,255,135,0.06)' : 'rgba(255,255,255,0.03)',
        border: isMe ? '1px solid rgba(0,255,135,0.18)' : '1px solid rgba(255,255,255,0.05)',
      }}
      initial={{ opacity:0, x:-16 }}
      animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:16 }}
      layout
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background:`linear-gradient(135deg,${col},${col}88)` }}>
        {player.is_bot ? '🤖' : player.name.slice(0,2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-white truncate">{player.name}</span>
          {isMe && <span className="text-green-400 text-xs">(you)</span>}
          {player.is_host && <span className="text-yellow-400 text-xs">👑</span>}
          {player.is_bot && <span className="text-gray-400 text-xs">{DIFF_LABELS[player.bot_difficulty ?? 'medium']}</span>}
        </div>
        {!player.is_bot && (
          <div className="text-xs" style={{ color: player.is_ready ? '#22c55e' : '#555' }}>
            {player.is_ready ? '✓ ready' : 'not ready'}
          </div>
        )}
      </div>
      {/* Disconnected badge */}
      {!player.is_connected && !player.is_bot && (
        <span className="text-orange-400 text-xs">⚡</span>
      )}
      {/* Kick */}
      {isHost && !isMe && !player.is_bot && (
        <button className="text-red-500 hover:text-red-300 text-xs px-1.5 py-0.5 rounded transition-colors"
          onClick={onKick}>kick</button>
      )}
    </motion.div>
  );
}
