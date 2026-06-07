import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import MainMenu from './pages/MainMenu';
import Lobby from './pages/Lobby';
import GameTable from './pages/GameTable';
import Settings from './pages/Settings';
import { useGameStore } from './store/gameStore';
import { preloadCards } from './utils/cardAssets';

function Guard({ children }: { children: React.ReactNode }) {
  const session = useGameStore(s => s.session);
  return session ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const { session, connectWs, connectionStatus } = useGameStore();

  useEffect(() => {
    preloadCards();
  }, []);

  useEffect(() => {
    if (session && connectionStatus === 'disconnected') {
      connectWs(session.roomPin, session.playerId);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/lobby" element={<Guard><Lobby /></Guard>} />
        <Route path="/game" element={<Guard><GameTable /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
