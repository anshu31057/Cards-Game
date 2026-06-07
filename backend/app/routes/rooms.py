from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.game.room_manager import room_manager

router = APIRouter()

class CreateBody(BaseModel):
    player_name: str
    total_rounds: int = 5

class JoinBody(BaseModel):
    player_name: str

@router.post("/create")
async def create(body: CreateBody):
    if not body.player_name.strip(): raise HTTPException(400,"Name required")
    pin, pid = room_manager.create_room(body.player_name.strip(), body.total_rounds)
    return {"room_pin":pin,"player_id":pid}

@router.post("/{pin}/join")
async def join(pin: str, body: JoinBody):
    if not body.player_name.strip(): raise HTTPException(400,"Name required")
    pid, err = room_manager.join_room(pin, body.player_name.strip())
    if not pid: raise HTTPException(400, err)
    return {"room_pin":pin,"player_id":pid}

@router.get("/{pin}/state")
async def state(pin: str, player_id: str=None):
    if pin not in room_manager.rooms: raise HTTPException(404,"Not found")
    return room_manager.get_state(pin, for_pid=player_id)

@router.get("/list")
async def list_rooms():
    return {"rooms": room_manager.list_rooms()}
