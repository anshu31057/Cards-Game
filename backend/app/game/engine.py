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
                 original_bidder_id: Optional[str]) -> Tuple[bool, str]:
    """
    FINAL RULES:
    first_bid:  min=5 if no current bid, else current+1 (strictly higher)
    final_bid:
      - Original bidder: may increase their own bid by any amount
      - Other players: must bid ≥10 to override trump
      - Everyone can skip (tricks=0)
    """
    if tricks == 0: return True, ""   # skip always allowed
    if tricks > 13: return False, "Max 13"

    if phase == "first_bid":
        min_t = (current_bid.tricks + 1) if current_bid else 5
        if tricks < min_t:
            return False, f"Need ≥{min_t}"

    elif phase == "final_bid":
        is_orig = (player_id == original_bidder_id)
        if is_orig:
            # Original bidder: can increase above their own bid
            own_bid = current_bid.tricks if (current_bid and current_bid.player_id==player_id) else 0
            if tricks <= own_bid:
                return False, f"Must bid higher than your current {own_bid}"
        else:
            # Other players: need ≥10 to take over trump
            if tricks < 10:
                return False, "Need ≥10 to override trump"
            if current_bid and tricks <= current_bid.tricks:
                return False, f"Need >{current_bid.tricks} to override"

    try: Suit(suit)
    except ValueError: return False, "Bad suit"
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
        s = self.state
        s.deck = build_deck()
        hands, rem = deal_cards(s.deck, 5, len(s.players))
        s.deck = rem
        for i, pid in enumerate(s.player_order):
            p = s.players[pid]
            p.hand = sorted(hands[i], key=lambda c: (SUIT_SORT.get(c.suit,4), -c.rank_value))
            p.tricks_won = 0; p.bid = None
        s.phase = GamePhase.FIRST_BID; s.current_player_idx = 0; s._bid_turns = 0
        s.trump_suit = None; s.final_bidder_id = None; s.final_bid = None
        s.current_trick = Trick(); s.trick_history = []
        # Track who placed the first/original bid
        s._original_bidder_id = None

    def place_bid(self, player_id: str, tricks: int, suit: str) -> Tuple[bool, str]:
        s = self.state
        if s.phase not in (GamePhase.FIRST_BID, GamePhase.FINAL_BID): return False, "Not bidding"
        if s.current_player_id != player_id: return False, "Not your turn"

        orig = getattr(s, '_original_bidder_id', None)
        ok, err = validate_bid(tricks, suit, s.phase.value, s.final_bid, player_id, orig)
        if not ok: return False, err

        if tricks > 0:
            bid = Bid(player_id=player_id, tricks=tricks, suit=suit)
            s.players[player_id].bid = bid
            if s.final_bid is None or tricks > s.final_bid.tricks:
                s.final_bid = bid; s.final_bidder_id = player_id; s.trump_suit = suit
            # Track original bidder (first person to bid in first_bid phase)
            if s.phase == GamePhase.FIRST_BID and orig is None:
                s._original_bidder_id = player_id

        s.next_turn()
        self._advance_bid_phase()
        return True, ""

    def _advance_bid_phase(self):
        s = self.state
        s._bid_turns = getattr(s, '_bid_turns', 0) + 1
        n = len(s.players)
        if s._bid_turns < n: return
        s._bid_turns = 0

        if s.phase == GamePhase.FIRST_BID:
            hands, rem = deal_cards(s.deck, 8, n)
            s.deck = rem
            for i, pid in enumerate(s.player_order):
                p = s.players[pid]
                p.hand.extend(hands[i])
                # Re-sort full 13-card hand
                p.hand = sorted(p.hand, key=lambda c: (SUIT_SORT.get(c.suit,4), -c.rank_value))
                p.bid = None
            s.final_bid = None; s.final_bidder_id = None; s.trump_suit = None
            s.phase = GamePhase.FINAL_BID; s.current_player_idx = 0

        elif s.phase == GamePhase.FINAL_BID:
            if s.final_bid is None:
                pid0 = s.player_order[0]
                default = Bid(player_id=pid0, tricks=5, suit="spades")
                s.final_bid = default; s.final_bidder_id = pid0
                s.trump_suit = "spades"; s.players[pid0].bid = default
            s.phase = GamePhase.PLAYING; s.current_player_idx = 0

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
        s = self.state
        s.round_number += 1
        if s.round_number > s.total_rounds: s.phase = GamePhase.GAME_OVER; return
        self.start_game()
