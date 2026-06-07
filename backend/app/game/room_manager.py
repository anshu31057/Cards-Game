"""Room Manager - production-grade, bot-safe, deadlock-free"""
import asyncio, random, string, uuid, logging
from typing import Dict, Optional, List
from fastapi import WebSocket
from app.models.game_models import GameState, PlayerState, GamePhase, Trick, Bid
from app.game.engine import GameEngine
from app.bots.bot_player import BotPlayer, make_bot

log = logging.getLogger("cardstrike.rooms")

def _pin() -> str:
    return ''.join(random.choices(string.digits, k=4))


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, GameState] = {}
        self.connections: Dict[str, Dict[str, WebSocket]] = {}
        self.player_rooms: Dict[str, str] = {}
        # Single pending-bot task per room (not per player) — prevents stacking
        self.bot_tasks: Dict[str, asyncio.Task] = {}

    # ── Room lifecycle ───────────────────────────────────────────────────────

    def create_room(self, host_name: str, total_rounds: int = 5):
        pin = _pin()
        while pin in self.rooms: pin = _pin()
        pid = f"p_{uuid.uuid4().hex[:10]}"
        state = GameState(room_pin=pin, total_rounds=max(1, min(20, total_rounds)))
        state.players[pid] = PlayerState(id=pid, name=host_name[:24], is_host=True, seat=0)
        state.player_order.append(pid)
        self.rooms[pin] = state
        self.connections[pin] = {}
        self.player_rooms[pid] = pin
        return pin, pid

    def join_room(self, pin: str, name: str):
        if pin not in self.rooms: return None, "Room not found"
        s = self.rooms[pin]
        if s.phase != GamePhase.LOBBY: return None, "Game already in progress"
        humans = [p for p in s.players.values() if not p.is_bot]
        if len(humans) >= 4: return None, "Room is full"
        # Reconnect: same name = same player
        for pid, p in s.players.items():
            if p.name == name and not p.is_bot:
                self.player_rooms[pid] = pin
                return pid, ""
        pid = f"p_{uuid.uuid4().hex[:10]}"
        s.players[pid] = PlayerState(id=pid, name=name[:24], seat=len(s.players))
        s.player_order.append(pid)
        self.player_rooms[pid] = pin
        return pid, ""

    def add_bots(self, pin: str):
        s = self.rooms[pin]
        needed = 4 - len(s.players)
        for _ in range(needed):
            b = make_bot(seat=len(s.players))
            s.players[b["id"]] = PlayerState(**{k: b[k] for k in b}, is_ready=True)
            s.player_order.append(b["id"])

    def kick_player(self, pin: str, host_id: str, target_id: str):
        s = self.rooms.get(pin)
        if not s: return False, "No room"
        host = s.players.get(host_id)
        if not host or not host.is_host: return False, "Not host"
        if s.phase != GamePhase.LOBBY: return False, "Can't kick in-game"
        if target_id not in s.players: return False, "Player not found"
        if s.players[target_id].is_bot: return False, "Can't kick bots"
        del s.players[target_id]
        s.player_order = [p for p in s.player_order if p != target_id]
        return True, ""

    # ── WebSocket connections ─────────────────────────────────────────────────

    async def connect(self, pin: str, pid: str, ws: WebSocket):
        await ws.accept()
        if pin not in self.connections: self.connections[pin] = {}
        self.connections[pin][pid] = ws
        s = self.rooms.get(pin)
        if s and pid in s.players:
            s.players[pid].is_connected = True

    def disconnect(self, pin: str, pid: str):
        self.connections.get(pin, {}).pop(pid, None)
        s = self.rooms.get(pin)
        if s and pid in s.players:
            s.players[pid].is_connected = False

    async def broadcast(self, pin: str, msg: dict, exclude: str = None):
        dead = []
        for pid, ws in list(self.connections.get(pin, {}).items()):
            if pid == exclude: continue
            try: await ws.send_json(msg)
            except Exception: dead.append(pid)
        for pid in dead: self.disconnect(pin, pid)

    async def send_to(self, pin: str, pid: str, msg: dict):
        ws = self.connections.get(pin, {}).get(pid)
        if ws:
            try: await ws.send_json(msg)
            except Exception: self.disconnect(pin, pid)

    # ── State serialization ───────────────────────────────────────────────────

    def get_state(self, pin: str, for_pid: str = None) -> dict:
        s = self.rooms.get(pin)
        if not s: return {}
        pdata = {}
        for pid, p in s.players.items():
            show_hand = (pid == for_pid or p.is_bot or for_pid is None)
            hand = [c.dict() for c in p.hand] if show_hand else [{"hidden": True} for _ in p.hand]
            pdata[pid] = {
                "id": p.id, "name": p.name, "is_bot": p.is_bot,
                "bot_difficulty": p.bot_difficulty, "is_host": p.is_host,
                "is_connected": p.is_connected, "is_ready": p.is_ready,
                "hand": hand, "hand_count": len(p.hand),
                "bid": p.bid.dict() if p.bid else None,
                "tricks_won": p.tricks_won, "score": p.score, "seat": p.seat,
            }
        return {
            "room_pin": s.room_pin, "phase": s.phase,
            "players": pdata, "player_order": s.player_order,
            "current_player_id": s.current_player_id,
            "trump_suit": s.trump_suit, "final_bidder_id": s.final_bidder_id,
            "final_bid": s.final_bid.dict() if s.final_bid else None,
            "current_trick": {
                "cards": [{"player_id": tc.player_id, "card": tc.card.dict()} for tc in s.current_trick.cards],
                "winner_id": s.current_trick.winner_id,
                "lead_suit": s.current_trick.lead_suit,
            },
            "trick_history_count": len(s.trick_history),
            "original_bidder_id": getattr(s, "_bid_by_player_in_first_phase", None),
            "round_number": s.round_number, "total_rounds": s.total_rounds,
            "is_sarkari_trump": s.is_sarkari_trump,
            "bidding_started_player_idx": s.bidding_started_player_idx,
        }

    async def _broadcast_state(self, pin: str):
        for pid in list(self.connections.get(pin, {})):
            await self.send_to(pin, pid, {"type": "game_state", "payload": self.get_state(pin, for_pid=pid)})

    # ── Game actions ──────────────────────────────────────────────────────────

    async def start_game(self, pin: str, pid: str):
        s = self.rooms.get(pin)
        if not s: return False, "No room"
        host = s.players.get(pid)
        if not host or not host.is_host: return False, "Not host"
        if sum(1 for p in s.players.values() if not p.is_bot) < 2: return False, "Need 2+ players"
        self.add_bots(pin)
        GameEngine(s).start_game()
        await self._broadcast_state(pin)
        self._schedule_bot(pin)
        return True, ""

    async def handle_bid(self, pin: str, pid: str, tricks: int, suit: str):
        s = self.rooms.get(pin)
        if not s: return False, "No room"
        ok, err = GameEngine(s).place_bid(pid, tricks, suit)
        if ok:
            await self._broadcast_state(pin)
            self._schedule_bot(pin)
        return ok, err

    async def handle_play(self, pin: str, pid: str, card_idx: int):
        s = self.rooms.get(pin)
        if not s: return False, "No room", False
        ok, err, penalty = GameEngine(s).play_card(pid, card_idx)
        if ok or penalty:
            await self._broadcast_state(pin)
            if s.phase == GamePhase.TRICK_END:
                # Show trick for 1.8s, then resolve
                await asyncio.sleep(1.8)
                GameEngine(s).finish_trick()
                await self._broadcast_state(pin)
            self._schedule_bot(pin)
        return ok, err, penalty

    async def handle_new_round(self, pin: str, pid: str):
        s = self.rooms.get(pin)
        if not s: return False, "No room"
        if s.phase not in (GamePhase.ROUND_END, GamePhase.GAME_OVER): return False, "Not round end"
        host = s.players.get(pid)
        if not host or not host.is_host: return False, "Not host"
        GameEngine(s).start_new_round()
        await self._broadcast_state(pin)
        self._schedule_bot(pin)
        return True, ""

    # ── Bot scheduling — ONE task per room, never stacked ────────────────────

    def _schedule_bot(self, pin: str):
        """Cancel any existing bot task and schedule a new one if current player is bot."""
        s = self.rooms.get(pin)
        if not s: return
        cid = s.current_player_id
        if not cid: return
        cp = s.players.get(cid)
        if not cp or not cp.is_bot: return
        if s.phase not in (GamePhase.FIRST_BID, GamePhase.FINAL_BID, GamePhase.PLAYING): return

        # Cancel previous if still pending
        prev = self.bot_tasks.get(pin)
        if prev and not prev.done():
            prev.cancel()

        task = asyncio.create_task(self._run_bot(pin, cid, s.current_player_idx))
        self.bot_tasks[pin] = task

    async def _run_bot(self, pin: str, bot_id: str, expected_idx: int):
        """Execute bot action with deadlock-safe timeout fallback."""
        try:
            await asyncio.sleep(random.uniform(0.7, 1.5))
        except asyncio.CancelledError:
            return

        s = self.rooms.get(pin)
        if not s: return
        # Verify it's still this bot's turn (state may have advanced)
        if s.current_player_id != bot_id or s.current_player_idx != expected_idx:
            return

        bp = s.players.get(bot_id)
        if not bp: return

        bot = BotPlayer(bot_id, bp.bot_difficulty or "medium")
        try:
            if s.phase in (GamePhase.FIRST_BID, GamePhase.FINAL_BID):
                tricks, suit = bot.decide_bid(s)
                await self.handle_bid(pin, bot_id, tricks, suit or "spades")
            elif s.phase == GamePhase.PLAYING:
                idx = bot.decide_card(s)
                await self.handle_play(pin, bot_id, idx)
        except Exception as e:
            log.error(f"Bot {bot_id} error in room {pin}: {e}")
            # Fallback: skip bid or play first valid card
            try:
                if s.phase in (GamePhase.FIRST_BID, GamePhase.FINAL_BID):
                    await self.handle_bid(pin, bot_id, 0, "spades")
                elif s.phase == GamePhase.PLAYING and s.players.get(bot_id):
                    await self.handle_play(pin, bot_id, 0)
            except Exception as e2:
                log.error(f"Bot fallback also failed: {e2}")

    def list_rooms(self):
        return [
            {"pin": pin, "player_count": sum(1 for p in s.players.values() if not p.is_bot),
             "max_players": 4, "phase": s.phase, "total_rounds": s.total_rounds}
            for pin, s in self.rooms.items() if s.phase == GamePhase.LOBBY
        ]


room_manager = RoomManager()
