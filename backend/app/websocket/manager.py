"""WebSocket handler"""
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.game.room_manager import room_manager

router = APIRouter()

@router.websocket("/ws/{pin}/{player_id}")
async def ws_endpoint(ws: WebSocket, pin: str, player_id: str):
    s = room_manager.rooms.get(pin)
    if not s or player_id not in s.players:
        await ws.accept()
        await ws.send_json({"type":"error","payload":{"message":"Invalid room/player"}})
        await ws.close(); return

    await room_manager.connect(pin, player_id, ws)
    player = s.players.get(player_id)

    # Send state + notify others
    await ws.send_json({"type":"game_state","payload":room_manager.get_state(pin, for_pid=player_id)})
    await room_manager.broadcast(pin, {"type":"player_connected","payload":{"player_id":player_id,"name":player.name if player else ""}}, exclude=player_id)
    await room_manager._broadcast_state(pin)

    try:
        while True:
            try:
                data = await asyncio.wait_for(ws.receive_json(), timeout=35.0)
            except asyncio.TimeoutError:
                try: await ws.send_json({"type":"ping"})
                except: break
                continue

            t = data.get("type","")
            p = data.get("payload",{})

            if t=="ping":
                await ws.send_json({"type":"pong"})

            elif t=="request_state":
                await ws.send_json({"type":"game_state","payload":room_manager.get_state(pin,for_pid=player_id)})

            elif t=="ready":
                if player_id in s.players: s.players[player_id].is_ready=True
                await room_manager._broadcast_state(pin)

            elif t=="start_game":
                ok,err = await room_manager.start_game(pin,player_id)
                await ws.send_json({"type":"action_result","payload":{"success":ok,"message":err,"action":"start_game"}})

            elif t=="bid":
                # tricks=0 means skip
                ok,err = await room_manager.handle_bid(pin,player_id,int(p.get("tricks",0)),str(p.get("suit","spades")))
                await ws.send_json({"type":"action_result","payload":{"success":ok,"message":err,"action":"bid"}})

            elif t=="play_card":
                ok,err,penalty = await room_manager.handle_play(pin,player_id,int(p.get("card_idx",0)))
                await ws.send_json({"type":"action_result","payload":{"success":ok,"message":err,"action":"play_card","penalty":penalty}})

            elif t=="new_round":
                ok,err = await room_manager.handle_new_round(pin,player_id)
                await ws.send_json({"type":"action_result","payload":{"success":ok,"message":err,"action":"new_round"}})

            elif t=="kick_player":
                ok,err = room_manager.kick_player(pin,player_id,str(p.get("target_id","")))
                if ok:
                    await room_manager.broadcast(pin,{"type":"player_kicked","payload":{"player_id":p.get("target_id")}})
                    await room_manager._broadcast_state(pin)
                await ws.send_json({"type":"action_result","payload":{"success":ok,"message":err,"action":"kick"}})

    except WebSocketDisconnect: pass
    except Exception as e: print(f"WS err {pin}/{player_id}: {e}")
    finally:
        room_manager.disconnect(pin, player_id)
        await room_manager.broadcast(pin,{"type":"player_disconnected","payload":{"player_id":player_id,"name":player.name if player else ""}})
        await room_manager._broadcast_state(pin)
