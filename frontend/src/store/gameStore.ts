// CardStrike - Zustand store with localStorage persistence + reconnect
import { create } from 'zustand';
import type { GameState, ConnectionStatus, AppSession } from '../types/game';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ActionResult {
  success: boolean;
  message: string;
  action: string;
}

interface GameStore {
  session: AppSession | null;
  setSession: (s: AppSession | null) => void;

  gameState: GameState | null;
  setGameState: (s: GameState) => void;

  ws: WebSocket | null;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (s: ConnectionStatus) => void;

  selectedCardIdx: number | null;
  setSelectedCardIdx: (i: number | null) => void;

  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;

  lastAction: ActionResult | null;
  setLastAction: (a: ActionResult | null) => void;

  trickWinnerId: string | null;
  setTrickWinnerId: (id: string | null) => void;

  settings: {
    musicVolume: number;
    sfxVolume: number;
    animationSpeed: 'slow' | 'normal' | 'fast';
    reducedMotion: boolean;
    colorblindMode: boolean;
    fullscreen: boolean;
  };
  updateSettings: (s: Partial<GameStore['settings']>) => void;

  sendMessage: (type: string, payload?: Record<string, unknown>) => void;
  connectWs: (pin: string, playerId: string) => void;
  disconnectWs: () => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace('https', 'wss').replace('http', 'ws');

const SESSION_KEY = 'cardstrike_session';

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Persist session to localStorage for page-refresh recovery
function saveSession(s: AppSession | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

function loadSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: loadSession(),
  setSession: (s) => { saveSession(s); set({ session: s }); },

  gameState: null,
  setGameState: (s) => set({ gameState: s }),

  ws: null,
  connectionStatus: 'disconnected',
  setConnectionStatus: (s) => set({ connectionStatus: s }),

  selectedCardIdx: null,
  setSelectedCardIdx: (i) => set({ selectedCardIdx: i }),

  notifications: [],
  addNotification: (n) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({
      notifications: [...state.notifications.slice(-4), { ...n, id }],
    }));
    setTimeout(() => get().removeNotification(id), 4000);
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  lastAction: null,
  setLastAction: (a) => set({ lastAction: a }),

  trickWinnerId: null,
  setTrickWinnerId: (id) => set({ trickWinnerId: id }),

  settings: {
    musicVolume: 40,
    sfxVolume: 70,
    animationSpeed: 'normal',
    reducedMotion: false,
    colorblindMode: false,
    fullscreen: false,
  },
  updateSettings: (s) =>
    set((state) => ({ settings: { ...state.settings, ...s } })),

  sendMessage: (type, payload = {}) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  },

  connectWs: (pin, playerId) => {
    const { ws: existing } = get();
    if (existing && existing.readyState === WebSocket.OPEN) return; // already connected
    if (existing) existing.close();

    set({ connectionStatus: 'connecting' });

    const wsUrl = `${WS_BASE}/ws/${pin}/${playerId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectAttempts = 0;
      set({ connectionStatus: 'connected', ws });
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);

      // Request current state on reconnect
      ws.send(JSON.stringify({ type: 'request_state' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;
        const store = get();

        switch (type) {
          case 'game_state':
            store.setGameState(payload as GameState);
            if (payload.current_trick?.winner_id) {
              store.setTrickWinnerId(payload.current_trick.winner_id);
              setTimeout(() => store.setTrickWinnerId(null), 2000);
            }
            break;

          case 'action_result':
            store.setLastAction(payload as ActionResult);
            if (!payload.success && payload.message) {
              store.addNotification({ type: 'error', message: payload.message as string });
            }
            break;

          case 'player_connected':
            store.addNotification({ type: 'info', message: `${payload.name} connected` });
            // Re-request full state so lobby updates instantly
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'request_state' }));
            }
            break;

          case 'player_disconnected':
            store.addNotification({ type: 'warning', message: `${payload.name} disconnected` });
            break;

          case 'player_kicked':
            if (payload.player_id === store.session?.playerId) {
              store.addNotification({ type: 'error', message: 'You were kicked from the room' });
              store.disconnectWs();
              store.setSession(null);
            }
            break;

          case 'pong':
            break; // heartbeat ok
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onerror = () => {
      set({ connectionStatus: 'disconnected' });
    };

    ws.onclose = () => {
      if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
      set({ connectionStatus: 'disconnected', ws: null });

      const { session } = get();
      if (session && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * reconnectAttempts, 8000);
        set({ connectionStatus: 'reconnecting' });
        reconnectTimer = setTimeout(() => {
          get().connectWs(session.roomPin, session.playerId);
        }, delay);
      }
    };

    set({ ws });
  },

  disconnectWs: () => {
    const { ws } = get();
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // stop auto reconnect
    if (ws) ws.close();
    set({ ws: null, connectionStatus: 'disconnected', gameState: null });
    reconnectAttempts = 0;
  },
}));

// Auto-reconnect on page load if session exists
const stored = loadSession();
if (stored) {
  setTimeout(() => {
    useGameStore.getState().connectWs(stored.roomPin, stored.playerId);
  }, 500);
}
