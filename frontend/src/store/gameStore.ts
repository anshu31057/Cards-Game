// CardStrike - Enhanced Zustand store with robust reconnect + room lifecycle
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
  clearSession: () => void;

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
  softReset: () => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace('https', 'wss').replace('http', 'ws');

const SESSION_KEY = 'cardstrike_session';
const PLAYER_NAME_KEY = 'cardstrike_player_name';

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 12;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;

function saveSession(s: AppSession | null) {
  try {
    if (s) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

function loadSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to load session:', e);
    return null;
  }
}

function savePlayerName(name: string) {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {}
}

function loadPlayerName(): string | null {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY);
  } catch {
    return null;
  }
}

/**
 * Properly cleanup all WebSocket and timer resources
 */
function cleanupConnections() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: loadSession(),
  
  setSession: (s) => {
    saveSession(s);
    set({ session: s });
  },

  clearSession: () => {
    saveSession(null);
    set({
      session: null,
      gameState: null,
      selectedCardIdx: null,
      lastAction: null,
      trickWinnerId: null,
    });
  },

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
    const { ws: existing, addNotification } = get();
    
    // If already connected, skip
    if (existing && existing.readyState === WebSocket.OPEN) {
      return;
    }

    // Close stale connection before reconnecting
    if (existing) {
      try {
        existing.close();
      } catch {}
    }

    cleanupConnections();
    set({ connectionStatus: 'connecting' });

    const wsUrl = `${WS_BASE}/ws/${pin}/${playerId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectAttempts = 0;
      set({ connectionStatus: 'connected', ws });
      cleanupConnections();

      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);

      // Request current state on connect/reconnect
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
              store.clearSession();
            }
            break;

          case 'pong':
            // Heartbeat ok
            break;
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onerror = () => {
      console.error('WebSocket error');
      set({ connectionStatus: 'disconnected' });
    };

    ws.onclose = () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }

      set({ connectionStatus: 'disconnected', ws: null });

      const { session } = get();
      if (session && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
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
    cleanupConnections();
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Stop auto-reconnect
    
    if (ws) {
      try {
        ws.close();
      } catch {}
    }
    
    set({ 
      ws: null, 
      connectionStatus: 'disconnected',
    });
    
    reconnectAttempts = 0;
  },

  softReset: () => {
    // Reset game state without disconnecting WebSocket
    // Used when leaving a room to prepare for new room
    set({
      gameState: null,
      selectedCardIdx: null,
      lastAction: null,
      trickWinnerId: null,
    });
  },
}));

// Auto-reconnect on page load if session exists (but only in lobby/game pages)
const stored = loadSession();
if (stored && typeof window !== 'undefined') {
  const path = window.location.pathname;
  // Only auto-reconnect if we're on a game-related page (not main menu)
  if (path.includes('/lobby') || path.includes('/game')) {
    setTimeout(() => {
      const store = useGameStore.getState();
      if (store.connectionStatus === 'disconnected' && stored) {
        store.connectWs(stored.roomPin, stored.playerId);
      }
    }, 300);
  }
}
