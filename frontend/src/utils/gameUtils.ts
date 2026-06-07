import type { Card, Suit } from '../types/game';

export function getValidCardIndices(hand: Card[], leadSuit: Suit|null, trumpSuit: Suit|null, currentBest: Card|null = null): number[] {
  if (!leadSuit) return hand.map((_,i)=>i);

  const sameIdxs = hand.map((c,i)=>c.suit===leadSuit?i:-1).filter(i=>i!==-1);
  if (sameIdxs.length === 0) return hand.map((_,i)=>i); // can't follow

  // Strict higher-card rule
  if (currentBest && currentBest.suit === leadSuit) {
    const higherIdxs = sameIdxs.filter(i => hand[i].rank_value > currentBest.rank_value);
    if (higherIdxs.length > 0) return higherIdxs;
  }
  return sameIdxs;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({detail:'Error'})); throw new Error(e.detail||`HTTP ${res.status}`); }
  return res.json();
}
