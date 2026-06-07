export type Suit = 'hearts'|'diamonds'|'clubs'|'spades';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';
export type GamePhase = 'lobby'|'initial_deal'|'first_bid'|'final_deal'|'final_bid'|'playing'|'trick_end'|'round_end'|'game_over';

export interface Card { suit: Suit; rank: Rank; rank_value: number; hidden?: boolean; }
export interface Bid { player_id: string; tricks: number; suit: Suit; }
export interface TrickCard { player_id: string; card: Card; }
export interface CurrentTrick { cards: TrickCard[]; winner_id: string|null; lead_suit: Suit|null; }

export interface PlayerState {
  id: string; name: string; is_bot: boolean; bot_difficulty?: string;
  is_host: boolean; is_connected: boolean; is_ready: boolean;
  hand: Card[]; hand_count: number; bid: Bid|null;
  tricks_won: number; score: number; avatar: string; seat: number;
}

export interface GameState {
  room_pin: string; phase: GamePhase;
  players: Record<string,PlayerState>; player_order: string[];
  current_player_id: string|null; trump_suit: Suit|null;
  final_bidder_id: string|null; final_bid: Bid|null;
  current_trick: CurrentTrick; trick_history_count: number;
  round_number: number; total_rounds: number;
  original_bidder_id: string | null;
  is_sarkari_trump: boolean;
  bidding_started_player_idx: number;
}

export interface AppSession { playerName: string; playerId: string; roomPin: string; }
export type ConnectionStatus = 'connecting'|'connected'|'disconnected'|'reconnecting';

export const SUIT_SYMBOLS: Record<Suit,string> = { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' };
export const SUIT_COLORS: Record<Suit,string> = { hearts:'#ef4444', diamonds:'#ef4444', clubs:'#e2e8f0', spades:'#e2e8f0' };
export const SUIT_NAMES: Record<Suit,string> = { hearts:'Hearts', diamonds:'Diamonds', clubs:'Clubs', spades:'Spades' };
