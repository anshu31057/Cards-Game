"""CardStrike - FastAPI entry point"""
import os, logging, uvicorn
from app.core import create_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s"
)

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        ws_ping_interval=20,
        ws_ping_timeout=30,
        log_level="info",
    )
