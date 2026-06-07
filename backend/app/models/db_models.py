"""
SQLAlchemy ORM models
"""
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from app.database.db import Base


class MatchHistory(Base):
    __tablename__ = "match_history"

    id = Column(Integer, primary_key=True, index=True)
    room_pin = Column(String(4), index=True)
    players = Column(JSON)  # list of player names
    scores = Column(JSON)   # final scores
    winner = Column(String(64))
    rounds_played = Column(Integer)
    trump_suit = Column(String(16))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PlayerStats(Base):
    __tablename__ = "player_stats"

    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String(64), unique=True, index=True)
    games_played = Column(Integer, default=0)
    games_won = Column(Integer, default=0)
    total_tricks = Column(Integer, default=0)
    total_bids_made = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
