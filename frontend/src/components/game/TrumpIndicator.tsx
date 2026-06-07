// CardStrike - Compact Trump Indicator
import { motion, AnimatePresence } from 'framer-motion';
import type { Suit } from '../../types/game';
import { SUIT_SYMBOLS, SUIT_COLORS, SUIT_NAMES } from '../../types/game';

interface TrumpIndicatorProps {
  trumpSuit: Suit | null;
  finalBid?: { player_id: string; tricks: number; suit: Suit } | null;
}

export default function TrumpIndicator({ trumpSuit, finalBid }: TrumpIndicatorProps) {
  return (
    <AnimatePresence mode="wait">
      {trumpSuit ? (
        <motion.div
          key={trumpSuit}
          className="flex flex-col items-center gap-0.5"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="text-gray-400 uppercase tracking-wider" style={{ fontSize: 9 }}>Trump</div>
          <motion.div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{
              color: SUIT_COLORS[trumpSuit],
              background: `radial-gradient(circle, ${SUIT_COLORS[trumpSuit]}22 0%, rgba(0,0,0,0.5) 100%)`,
              border: `1.5px solid ${SUIT_COLORS[trumpSuit]}66`,
            }}
            animate={{
              boxShadow: [
                `0 0 10px ${SUIT_COLORS[trumpSuit]}33`,
                `0 0 22px ${SUIT_COLORS[trumpSuit]}66`,
                `0 0 10px ${SUIT_COLORS[trumpSuit]}33`,
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {SUIT_SYMBOLS[trumpSuit]}
          </motion.div>
          <div className="font-semibold" style={{ fontSize: 10, color: SUIT_COLORS[trumpSuit] }}>
            {SUIT_NAMES[trumpSuit]}
          </div>
          {finalBid && (
            <div className="text-yellow-400" style={{ fontSize: 9 }}>Bid:{finalBid.tricks}</div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="none"
          className="flex flex-col items-center opacity-30"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-gray-500 uppercase tracking-wider" style={{ fontSize: 9 }}>Trump</div>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-600 text-xl"
            style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>?</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
