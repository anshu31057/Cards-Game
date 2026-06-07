"""Bot AI - rule-safe, never freezes"""
import random
from typing import List, Optional, Tuple
from app.models.game_models import Card, Suit, GameState, GamePhase
from app.game.engine import get_valid_plays, card_beats, RANK_VALUES, SUIT_SORT


class BotPlayer:
    def __init__(self, pid: str, difficulty: str="medium"):
        self.pid = pid; self.difficulty = difficulty

    def decide_bid(self, state: GameState) -> Tuple[int, str]:
        """Return (tricks, suit). tricks=0 = skip."""
        hand = state.players[self.pid].hand
        current = state.final_bid
        phase = state.phase.value
        orig_id = getattr(state, '_original_bidder_id', None)
        is_orig = (self.pid == orig_id)

        # Estimate strength per suit
        best_suit, best_val = Suit.SPADES, -1
        for suit in Suit:
            sc = [c for c in hand if c.suit==suit]
            val = sum(1 for c in sc if c.rank_value >= 11) + len(sc)*0.25
            if val > best_val: best_val = val; best_suit = suit

        estimated = max(1, round(best_val * (0.9 if self.difficulty=="insane" else 1.0)))

        if phase == "first_bid":
            min_bid = (current.tricks+1) if current else 5
        else:
            if is_orig:
                own = current.tricks if (current and current.player_id==self.pid) else 0
                min_bid = own + 1
            else:
                min_bid = 10  # must bid ≥10 to override
                if current and min_bid <= current.tricks: min_bid = current.tricks+1

        # Easy/medium sometimes skip
        if self.difficulty in ("easy","medium") and random.random() < 0.35:
            return 0, ""

        if estimated < min_bid:
            return 0, ""  # can't beat minimum honestly — skip

        tricks = max(min_bid, min(13, estimated))
        return int(tricks), best_suit.value

    def decide_card(self, state: GameState) -> int:
        p = state.players[self.pid]
        hand = p.hand
        if not hand: return 0
        trick = state.current_trick
        trump = state.trump_suit
        lead = trick.lead_suit if trick.cards else None

        # Get current best
        best_card = None
        if trick.cards:
            lead_s = trick.lead_suit or trick.cards[0].card.suit
            b = trick.cards[0]
            for tc in trick.cards[1:]:
                if card_beats(tc.card, b.card, lead_s, trump): b = tc
            best_card = b.card

        valid = get_valid_plays(hand, lead, trump, best_card)
        if not valid: return 0

        if self.difficulty == "easy":
            return hand.index(random.choice(valid))

        # Leading
        if not trick.cards:
            non_trump = [c for c in valid if c.suit!=trump]
            pool = non_trump if non_trump and self.difficulty in ("hard","insane") else valid
            return hand.index(max(pool, key=lambda c: c.rank_value))

        lead_suit = trick.lead_suit or trick.cards[0].card.suit
        we_winning = best_card and trick.cards and trick.cards[-1].player_id==self.pid

        if we_winning:
            return hand.index(min(valid, key=lambda c: c.rank_value))

        beaters = [c for c in valid if best_card and card_beats(c, best_card, lead_suit, trump)]
        if beaters:
            return hand.index(min(beaters, key=lambda c: c.rank_value))
        return hand.index(min(valid, key=lambda c: c.rank_value))


def make_bot(seat: int, difficulty: str="medium") -> dict:
    import uuid
    names = {"easy":["Lucky","Casual"],"medium":["Sharp","Clever"],"hard":["Pro","Tactical"],"insane":["Oracle","NeuralX"]}
    return {"id":f"bot_{uuid.uuid4().hex[:8]}","name":random.choice(names.get(difficulty,["Bot"])),
            "is_bot":True,"bot_difficulty":difficulty,"seat":seat}
