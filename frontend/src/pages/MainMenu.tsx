import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { apiPost } from '../utils/gameUtils';

type View = 'main'|'create'|'join';

export default function MainMenu() {
  const [view, setView] = useState<View>('main');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [rounds, setRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setSession, connectWs } = useGameStore();
  const nav = useNavigate();

  const go = async (createRoom: boolean) => {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!createRoom && (!pin.trim() || pin.length!==4)) { setError('Enter valid 4-digit PIN'); return; }
    setLoading(true); setError('');
    try {
      const data = await apiPost<{room_pin:string,player_id:string}>(
        createRoom ? '/api/rooms/create' : `/api/rooms/${pin}/join`,
        createRoom ? {player_name:name.trim(),total_rounds:rounds} : {player_name:name.trim()}
      );
      const session = {playerName:name.trim(),playerId:data.player_id,roomPin:data.room_pin};
      setSession(session);
      connectWs(data.room_pin,data.player_id);
      nav('/lobby');
    } catch(e:any) { setError(e.message||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full h-full flex items-center justify-center felt-texture overflow-hidden">
      {['♠','♥','♦','♣'].map((s,i)=>(
        <motion.div key={s} className="absolute text-7xl pointer-events-none select-none"
          style={{ color:i%2?'rgba(201,162,39,0.06)':'rgba(255,255,255,0.03)', left:`${12+i*22}%`, top:`${8+(i%2)*58}%` }}
          animate={{ y:[-10,10,-10], rotate:[-4,4,-4] }} transition={{ duration:4+i,repeat:Infinity,delay:i*0.7 }}>
          {s}
        </motion.div>
      ))}

      <motion.div className="relative z-10 w-full max-w-sm mx-4" initial={{ opacity:0,y:36 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5 }}>
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">🃏</div>
          <h1 className="text-4xl font-bold shimmer-text tracking-widest uppercase">CardStrike</h1>
          <p className="text-gray-500 text-xs mt-1 tracking-wider">Multiplayer Trick-Taking Card Game</p>
        </div>

        <div className="rounded-3xl p-5 shadow-2xl" style={{ background:'rgba(4,12,8,0.96)', border:'1px solid rgba(201,162,39,0.22)', boxShadow:'0 0 60px rgba(0,0,0,0.8)' }}>
          <AnimatePresence mode="wait">
            {view==='main' && (
              <motion.div key="main" initial={{ opacity:0,x:-16 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:16 }} className="flex flex-col gap-3">
                {[['🎮','Create Room','create'],['🚪','Join Room','join'],['⚙️','Settings','/settings']].map(([icon,label,target])=>(
                  <motion.button key={label} className="w-full py-4 rounded-2xl flex items-center gap-4 px-5 text-left font-semibold text-sm transition-all"
                    style={{ background:target==='create'?'rgba(201,162,39,0.12)':'rgba(255,255,255,0.04)', border:target==='create'?'1px solid rgba(201,162,39,0.35)':'1px solid rgba(255,255,255,0.07)', color:target==='create'?'#f0c040':'#fff' }}
                    onClick={()=>target.startsWith('/')?nav(target):setView(target as View)}
                    whileHover={{ scale:1.02,x:3 }} whileTap={{ scale:0.98 }}>
                    <span className="text-2xl">{icon}</span><span>{label}</span><span className="ml-auto text-gray-600">▶</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {view==='create' && (
              <motion.div key="create" initial={{ opacity:0,x:16 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-16 }} className="flex flex-col gap-3">
                <button className="text-gray-500 hover:text-white text-xs flex items-center gap-1 transition-colors" onClick={()=>{setView('main');setError('');}}>← Back</button>
                <h2 className="text-yellow-400 font-bold text-base text-center">Create Room</h2>

                <input className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" placeholder="Your name…"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}
                  value={name} onChange={e=>setName(e.target.value)} maxLength={20}
                  onKeyDown={e=>e.key==='Enter'&&go(true)} />

                {/* Rounds selector */}
                <div>
                  <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Number of Rounds</div>
                  <div className="flex gap-2">
                    {[1,3,5,10].map(r=>(
                      <motion.button key={r} className="flex-1 py-2 rounded-xl text-sm font-bold"
                        style={{ background:rounds===r?'rgba(201,162,39,0.2)':'rgba(255,255,255,0.05)', border:rounds===r?'1px solid rgba(201,162,39,0.5)':'1px solid rgba(255,255,255,0.07)', color:rounds===r?'#f0c040':'#888' }}
                        onClick={()=>setRounds(r)} whileHover={{ scale:1.06 }} whileTap={{ scale:0.95 }}>
                        {r}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {error && <div className="text-red-400 text-xs text-center">{error}</div>}
                <motion.button className="w-full py-3.5 rounded-2xl font-bold text-black text-sm uppercase tracking-wider"
                  style={{ background:loading?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#c9a227,#f0c040)', cursor:loading?'not-allowed':'pointer' }}
                  onClick={()=>!loading&&go(true)} whileHover={!loading?{scale:1.02}:undefined} whileTap={!loading?{scale:0.97}:undefined}>
                  {loading?'Creating…':'Create Room'}
                </motion.button>
                <p className="text-gray-600 text-xs text-center">A 4-digit PIN will be generated</p>
              </motion.div>
            )}

            {view==='join' && (
              <motion.div key="join" initial={{ opacity:0,x:16 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-16 }} className="flex flex-col gap-3">
                <button className="text-gray-500 hover:text-white text-xs flex items-center gap-1 transition-colors" onClick={()=>{setView('main');setError('');}}>← Back</button>
                <h2 className="text-yellow-400 font-bold text-base text-center">Join Room</h2>

                <input className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" placeholder="Your name…"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}
                  value={name} onChange={e=>setName(e.target.value)} maxLength={20} />

                <input className="w-full px-4 py-3 rounded-xl text-white text-center text-2xl font-mono font-bold outline-none tracking-[0.4em]" placeholder="PIN"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)' }}
                  value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                  onKeyDown={e=>e.key==='Enter'&&go(false)} maxLength={4} />

                {error && <div className="text-red-400 text-xs text-center">{error}</div>}
                <motion.button className="w-full py-3.5 rounded-2xl font-bold text-black text-sm uppercase tracking-wider"
                  style={{ background:loading?'rgba(100,100,100,0.3)':'linear-gradient(135deg,#c9a227,#f0c040)', cursor:loading?'not-allowed':'pointer' }}
                  onClick={()=>!loading&&go(false)} whileHover={!loading?{scale:1.02}:undefined} whileTap={!loading?{scale:0.97}:undefined}>
                  {loading?'Joining…':'Join Room'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
