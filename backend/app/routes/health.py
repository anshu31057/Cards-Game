import time
from fastapi import APIRouter

router = APIRouter()
START_TIME = time.time()

@router.get("/health")
async def health():
    return {"status": "ok", "uptime_seconds": int(time.time() - START_TIME)}

@router.get("/ping")
async def ping():
    """Lightweight keepalive endpoint for UptimeRobot / cron-job.org"""
    return "pong"
