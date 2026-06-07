from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class Suit(str, Enum):
    HEARTS = "hearts"; DIAMONDS = "diamonds"; CLUBS = "clubs"; SPADES = "spades"

class GamePhase(str, Enum):
    LOBBY="lobby"; INITIAL_DEAL="initial_deal"; FIRST_BID="first_bid"
    FINAL_DEAL="final_deal"; FINAL_BID="final_bid"; PLAYING="playing"
    TRICK_END="trick_end"; ROUND_END="round_end"; GAME_OVER="game_over"

class Card(BaseModel):
    suit: Suit; rank: str; rank_value: int
    class Config: use_enum_values=True

class Bid(BaseModel):
    player_id: str; tricks: int; suit: Suit
    class Config: use_enum_values=True

class PlayerState(BaseModel):
    id: str; name: str; is_bot: bool=False; bot_difficulty: Optional[str]=None
    is_host: bool=False; is_connected: bool=True; is_ready: bool=False
    hand: List[Card]=[]; bid: Optional[Bid]=None; tricks_won: int=0
    score: int=0; avatar: str="default"; seat: int=0

class TrickCard(BaseModel):
    player_id: str; card: Card

class Trick(BaseModel):
    cards: List[TrickCard]=[]; winner_id: Optional[str]=None; lead_suit: Optional[Suit]=None
    class Config: use_enum_values=True

class GameState(BaseModel):
    room_pin: str; phase: GamePhase=GamePhase.LOBBY
    players: Dict[str,PlayerState]={}; player_order: List[str]=[]
    current_player_idx: int=0; trump_suit: Optional[Suit]=None
    final_bidder_id: Optional[str]=None; final_bid: Optional[Bid]=None
    current_trick: Trick=Field(default_factory=Trick)
    trick_history: List[Trick]=[]; round_number: int=1
    total_rounds: int=5; deck: List[Card]=[]
    _bid_turns: int=0  # internal counter

    class Config: use_enum_values=True

    @property
    def current_player_id(self) -> Optional[str]:
        if not self.player_order: return None
        return self.player_order[self.current_player_idx % len(self.player_order)]

    def next_turn(self):
        self.current_player_idx = (self.current_player_idx+1) % len(self.player_order)

class CreateRoomRequest(BaseModel):
    player_name: str; total_rounds: int=5

class JoinRoomRequest(BaseModel):
    player_name: str; room_pin: str

class WSMessage(BaseModel):
    type: str; payload: Dict[str,Any]={}; player_id: Optional[str]=None
