"""CardStrike Game Engine - strict rules v4"""
import random
from typing import List, Optional, Tuple, Dict
from app.models.game_models import (
    Card, Suit, GamePhase, GameState, PlayerState, Bid, Trick, TrickCard
)

SUITS = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES]
RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]
RANK_VALUES = {r: i+2 for i,r in enumerate(RANKS)}

# Suit order for client-side sorting reference
SUIT_SORT = {Suit.SPADES:0, Suit.HEARTS:1, Suit.DIAMONDS:2, Suit.CLUBS:3}


def build_deck() -> List[Card]:
    deck = [Card(suit=s, rank=r, rank_value=RANK_VALUES[r]) for s in SUITS for r in RANKS]
    random.shuffle(deck)
    return deck


def deal_cards(deck, count, n):
    hands = [[] for _ in range(n)]
    for i in range(count*n): hands[i%n].append(deck[i])
    return hands, deck[count*n:]


def card_beats(challenger: Card, defender: Card, lead_suit: str, trump: Optional[str]) -> bool:
    if trump:
        ci, di = challenger.suit==trump, defender.suit==trump
        if ci and not di: return True
        if not ci and di: return False
    if challenger.suit == defender.suit:
        return challenger.rank_value > defender.rank_value
    return challenger.suit == lead_suit and False  # can't beat off-suit


def get_trick_winner(trick: Trick, trump: Optional[str]) -> str:
    lead = trick.lead_suit or trick.cards[0].card.suit
    best = trick.cards[0]
    for play in trick.cards[1:]:
        if card_beats(play.card, best.card, lead, trump): best = play
    return best.player_id


def get_valid_plays(hand: List[Card], lead_suit: Optional[str],
                    trump: Optional[str], current_best: Optional[Card]=None) -> List[Card]:
    if not lead_suit: return list(hand)
    same = [c for c in hand if c.suit==lead_suit]
    if same:
        if current_best and current_best.suit==lead_suit:
            higher = [c for c in same if c.rank_value > current_best.rank_value]
            if higher: return higher
        return same
    return list(hand)


def validate_play(card: Card, hand: List[Card], lead_suit: Optional[str],
                  trump: Optional[str], current_best: Optional[Card]) -> Tuple[bool, str]:
    valid = get_valid_plays(hand, lead_suit, trump, current_best)
    if card in valid: return True, ""
    same = [c for c in hand if c.suit==lead_suit] if lead_suit else []
    if same:
        higher = [c for c in same if current_best and c.rank_value>current_best.rank_value]
        if higher and card.suit==lead_suit and current_best and card.rank_value<=current_best.rank_value:
            return False, f"Must play higher than {current_best.rank}"
        return False, f"Must follow suit: {lead_suit}"
    return False, "Invalid card"


def validate_bid(tricks: int, suit: str, phase: str,
                 current_bid: Optional[Bid], player_id: str,
                 original_bidder_id: Optional[str], 
                 bid_by_player_in_first_phase: Optional[str] = None) -> Tuple[bool, str]:
    """
    FINAL RULES:
    
    first_bid (5-card phase):
      - Skip (0) always allowed
      - If no bid yet: minimum must be exactly 5 (not less, not more initially)
      - If bid exists: must be > current bid
      - Only one player can actually bid in first_bid (becomes trump owner)
    
    final_bid (13-card phase):
      - Skip (0) always allowed
      - If player bid in first_bid: can bid >= their first bid, no minimum
      - If player skipped first_bid: can bid 1-13, but to override trump must bid >= 10
      - To override existing trump: must bid > current bid AND >= 10
      - Original bidder: can increase their bid
    """
    if tricks == 0: return True, ""   # skip always allowed
    if tricks > 13: return False, "Max 13"
    if tricks < 0: return False, "Invalid bid"

    try: Suit(suit)
    except ValueError: return False, "Bad suit"

    if phase == "first_bid":
        # In first bid, minimum is 5
        min_t = (current_bid.tricks + 1) if current_bid else 5
        if tricks < min_t:
            return False, f"Need ≥{min_t}"

    elif phase == "final_bid":
        bid_in_first = (bid_by_player_in_first_phase == player_id)
        
        if bid_in_first:
            # Bid in first phase: can increase their bid
            own_bid = current_bid.tricks if (current_bid and current_bid.player_id==player_id) else 5
            if tricks <= own_bid:
                return False, f"Must bid higher than {own_bid}"
        else:
            # Skipped in first phase: can bid any 1-13, but >= 10 required to override trump
            if current_bid and tricks > current_bid.tricks:
                # Trying to override existing trump owner - need >= 10
                if tricks < 10:
                    return False, f"Need ≥10 to override trump. Bid ≥10 to take over."
            # else: bidding lower than current (won't override) - allowed

    return True, ""


def calculate_scores(players: Dict[str,PlayerState], final_bid: Optional[Bid]) -> Dict[str,int]:
    out = {}
    for pid, p in players.items():
        s = p.tricks_won
        if final_bid and pid == final_bid.player_id:
            s += final_bid.tricks if p.tricks_won >= final_bid.tricks else -final_bid.tricks
        out[pid] = s
    return out


class GameEngine:
    def __init__(self, state: GameState): self.state = state

    def start_game(self):
        """Start a new round with proper dealer rotation."""
        s = self.state
        
        # Rotate bidding starter (dealer) each round
        if s.round_number == 1:
            s.bidding_started_player_idx = 0
        else:
            s.bidding_started_player_idx = (s.bidding_started_player_idx + 1) % len(s.player_order)
        
        # Build and deal deck
        s.deck = build_deck()
        hands, rem = deal_cards(s.deck, 5, len(s.players))
        s.deck = rem
        
        # Distribute initial 5 cards and reset player state
        for i, pid in enumerate(s.player_order):
            p = s.players[pid]
            p.hand = sorted(hands[i], key=lambda c: (SUIT_SORT.get(c.suit,4), -c.rank_value))
            p.tricks_won = 0
            p.bid = None
        
        # Reset bid-related state
        s.phase = GamePhase.FIRST_BID
        s.current_player_idx = s.bidding_started_player_idx
        s._bid_turns = 0
        s.trump_suit = None
        s.final_bidder_id = None
        s.final_bid = None
        s.is_sarkari_trump = False
        s.current_trick = Trick()
        s.trick_history = []
        
        # Track who actually bid in first phase (for final phase rules)
        s._bid_by_player_in_first_phase = None

    def place_bid(self, player_id: str, tricks: int, suit: str) -> Tuple[bool, str]:
        s = self.state
        if s.phase not in (GamePhase.FIRST_BID, GamePhase.FINAL_BID): 
            return False, "Not bidding"
        if s.current_player_id != player_id: 
            return False, "Not your turn"

        # Validate bid based on phase
        bid_by_player = getattr(s, '_bid_by_player_in_first_phase', None)
        is_sarkari = getattr(s, 'is_sarkari_trump', False)
        ok, err = validate_bid(tricks, suit, s.phase.value, s.final_bid, player_id, 
                               getattr(s, '_original_bidder_id', None), bid_by_player, is_sarkari)
        if not ok: 
            return False, err

        # Place bid if not skipping
        if tricks > 0:
            bid = Bid(player_id=player_id, tricks=tricks, suit=suit)
            s.players[player_id].bid = bid
            
            # In FINAL_BID phase, only update final_bid if this bid overrides (>= 10 or trump owner increasing)
            # In FIRST_BID phase, always update final_bid
            if s.phase == GamePhase.FIRST_BID:
                s.final_bid = bid
                s.final_bidder_id = player_id
                s.trump_suit = suit
                # Track first bidder in first phase
                if s._bid_by_player_in_first_phase is None:
                    s._bid_by_player_in_first_phase = player_id
            elif s.phase == GamePhase.FINAL_BID:
                # In final phase, update trump owner if this bid >= 10 or if player bid in first
                bid_in_first = (s._bid_by_player_in_first_phase == player_id)
                if bid_in_first or tricks >= 10:
                    # This bid can override trump or increase bid from first phase
                    s.final_bid = bid
                    s.final_bidder_id = player_id
                    s.trump_suit = suit
                # else: bid < 10 and didn't bid in first, so just record their bid but don't change trump
        
        s.next_turn()
        self._advance_bid_phase()
        return True, ""

    def _advance_bid_phase(self):
        """Handle transition between bid phases."""
        s = self.state
        s._bid_turns = getattr(s, '_bid_turns', 0) + 1
        n = len(s.players)
        
        # All players have bid in current phase
        if s._bid_turns < n: 
            return
        
        s._bid_turns = 0

        if s.phase == GamePhase.FIRST_BID:
            # Check if anyone actually bid (not all skipped)
            if s.final_bid is None:
                # All skipped - enter Sarkari Trump mode (no trump owner)
                s.is_sarkari_trump = True
                s.trump_suit = None
                s.final_bidder_id = None
            
            # Deal remaining 8 cards
            hands, rem = deal_cards(s.deck, 8, n)
            s.deck = rem
            for i, pid in enumerate(s.player_order):
                p = s.players[pid]
                p.hand.extend(hands[i])
                # Re-sort full 13-card hand
                p.hand = sorted(p.hand, key=lambda c: (SUIT_SORT.get(c.suit,4), -c.rank_value))
                p.bid = None  # Clear individual bids for next phase
            
            # Move to final bid phase
            s.phase = GamePhase.FINAL_BID
            s.current_player_idx = s.bidding_started_player_idx

        elif s.phase == GamePhase.FINAL_BID:
            # In Sarkari mode, no one needs to place a bid
            # But if someone did bid, keep that as the trump owner's bid
            # If still no bid, keep it that way (true Sarkari - no trump owner)
            if s.final_bid is None and not s.is_sarkari_trump:
                # This shouldn't happen in normal play, but add fallback
                pid0 = s.player_order[0]
                default = Bid(player_id=pid0, tricks=5, suit="spades")
                s.final_bid = default
                s.final_bidder_id = pid0
                s.trump_suit = "spades"
                s.players[pid0].bid = default
            
            # Move to playing phase
            s.phase = GamePhase.PLAYING
            s.current_player_idx = 0

    def play_card(self, player_id: str, card_idx: int) -> Tuple[bool, str, bool]:
        s = self.state
        if s.phase != GamePhase.PLAYING: return False, "Not playing", False
        if s.current_player_id != player_id: return False, "Not your turn", False
        p = s.players[player_id]
        if card_idx < 0 or card_idx >= len(p.hand): return False, "Bad index", False

        card = p.hand[card_idx]
        lead = s.current_trick.lead_suit
        best = self._trick_best()
        ok, err = validate_play(card, p.hand, lead, s.trump_suit, best)
        if not ok:
            self._penalty(player_id); return False, err, True

        p.hand.pop(card_idx)
        if not s.current_trick.lead_suit: s.current_trick.lead_suit = card.suit
        s.current_trick.cards.append(TrickCard(player_id=player_id, card=card))
        s.next_turn()

        if len(s.current_trick.cards) == len(s.players):
            winner_id = get_trick_winner(s.current_trick, s.trump_suit)
            s.current_trick.winner_id = winner_id
            s.trick_history.append(s.current_trick)
            s.players[winner_id].tricks_won += 1
            s.phase = GamePhase.TRICK_END
        return True, "", False

    def finish_trick(self):
        s = self.state
        if all(len(p.hand)==0 for p in s.players.values()):
            for pid, delta in calculate_scores(s.players, s.final_bid).items():
                s.players[pid].score += delta
            s.phase = GamePhase.ROUND_END
        else:
            winner_id = s.trick_history[-1].winner_id
            s.current_trick = Trick()
            s.current_player_idx = s.player_order.index(winner_id)
            s.phase = GamePhase.PLAYING

    def _trick_best(self) -> Optional[Card]:
        trick = self.state.current_trick
        if not trick.cards: return None
        lead = trick.lead_suit or trick.cards[0].card.suit
        best = trick.cards[0]
        for play in trick.cards[1:]:
            if card_beats(play.card, best.card, lead, self.state.trump_suit): best = play
        return best.card

    def _penalty(self, player_id: str):
        s = self.state
        bid_val = s.final_bid.tricks if s.final_bid else 5
        s.players[player_id].score -= bid_val
        for pid, delta in calculate_scores(s.players, s.final_bid).items():
            if pid != player_id: s.players[pid].score += delta
        s.phase = GamePhase.ROUND_END

    def start_new_round(self):
        """Start new round with complete state reset."""
        s = self.state
        s.round_number += 1
        if s.round_number > s.total_rounds: 
            s.phase = GamePhase.GAME_OVER
            return
        
        # Completely reset all round-specific state
        self.start_game()
