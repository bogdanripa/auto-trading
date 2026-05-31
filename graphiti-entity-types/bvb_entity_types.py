"""
BVB Trading Engine — custom entity types for the Graphiti MCP server.

Deploy by either:
  (a) mounting this file into the graphiti-mcp container at /app/entities/bvb.py
      and setting env var GRAPHITI_ENTITIES_PATH=/app/entities/bvb.py
  (b) baking it into a fork/extension of the graphiti-mcp Dockerfile (see README)
  (c) passing --entities-path /app/entities/bvb.py to the server's entrypoint

The MCP server's add_memory tool will pass these to graphiti.add_episode() as
entity_types, constraining the LLM extractor to produce nodes of these specific
types rather than generic NER (which lifts every value — prices, "cash",
"evening" — into a standalone node).
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal


class Company(BaseModel):
    """A listed BVB issuer identified by its ticker symbol."""
    ticker: str = Field(..., description="BVB ticker, e.g. TLV, ONE, BRD, SNG")
    sector: Optional[str] = Field(None, description="energy | banking | utilities | real_estate | consumer | industrial | tech_telecom | pharma")


class Trade(BaseModel):
    """A position the engine opened on a Company. Unified across entry and exit by trade_id."""
    trade_id: str = Field(..., description="Format: YYYY-MM-DD-<ticker>-NN")
    ticker: str
    trade_type: Literal["swing", "event", "trend"]
    entry_price: float
    quantity: int
    conviction: int = Field(..., ge=0, le=10)
    expected_exit_by: Optional[str] = Field(None, description="ISO date")
    theme_tag: Optional[str] = None
    exit_price: Optional[float] = None
    pnl_pct: Optional[float] = None
    thesis_verdict: Optional[Literal["correct", "partially_correct", "wrong", "inconclusive"]] = None
    exit_reason: Optional[str] = None


class Thesis(BaseModel):
    """The plain-language reasoning behind a Trade — one per Trade."""
    text: str = Field(..., description="One-paragraph thesis a human can re-read in six months and understand the entry rationale")
    trade_id: str = Field(..., description="The Trade this Thesis belongs to")


class Catalyst(BaseModel):
    """A specific, dated future event expected to drive a price move for a ticker."""
    event_name: str = Field(..., description="e.g. 'Q1 2026 results publication', 'AGM dividend vote', 'NBR rate decision'")
    expected_date: str = Field(..., description="ISO date")
    ticker: Optional[str] = Field(None, description="Ticker if company-specific; null if macro")
    occurred: Optional[Literal["yes", "no", "delayed", "partial"]] = None


class Mechanism(BaseModel):
    """The causal chain explaining how a Catalyst translates into a price move."""
    description: str = Field(..., description="e.g. 'Q1 beat -> upward earnings revision -> re-rating toward analyst fair value'")
    worked: Optional[Literal["yes", "no", "yes_but_price_reversed", "via_different_path"]] = None


class SkippedSetup(BaseModel):
    """An A or B-grade candidate the scanner produced that the engine considered but did not trade."""
    date: str = Field(..., description="ISO date of the scan")
    ticker: str
    setup_grade: Literal["A", "B"]
    setup_type: str = Field(..., description="breakout | pullback | oversold | etc.")
    score: float = Field(..., ge=0, le=10)
    price_at_skip: float
    reason: str = Field(..., description="One of the canonical skip-reason strings from market-scanner/SKILL.md")
    reason_detail: Optional[str] = None
    invalidation_window_days: int = Field(..., ge=1)


class Counterfactual(BaseModel):
    """The post-window outcome of a SkippedSetup — was the skip right or did we miss?"""
    skip_ref: str = Field(..., description="References the SkippedSetup name")
    ticker: str
    skip_date: str
    end_move_pct: float
    peak_move_pct: float
    trough_move_pct: float
    outcome_class: Literal[
        "validated_skip",
        "missed_winner",
        "missed_extreme_winner",
        "dodged_loss",
        "dodged_disaster",
        "neutral",
    ]


class Theme(BaseModel):
    """A persistent strategic narrative (e.g. 'Neptun Deep', 'NBR first-cut pivot')."""
    name: str
    status: Literal["candidate", "active", "retired"]
    evidence_count: Optional[int] = None


class Prior(BaseModel):
    """A distilled lesson from past trades, with temporal validity (active/retired)."""
    title: str
    status: Literal["candidate", "active", "retired", "active-skip-rule"]
    evidence_count: Optional[int] = None
    retired_reason: Optional[str] = None


class News(BaseModel):
    """A material news item that could affect a Company or the market."""
    headline: str
    date: str = Field(..., description="ISO date of publication")
    ticker: Optional[str] = Field(None, description="Ticker if company-specific")
    materiality: Literal["high", "medium"]
    direction: Literal["positive", "negative", "neutral"]
    source: str = Field(..., description="Domain e.g. bvb.ro, zf.ro")
    url: Optional[str] = None


class MacroEvent(BaseModel):
    """A macro / regulatory / rate event affecting BVB broadly."""
    name: str = Field(..., description="e.g. 'NBR holds at 6.50%', 'OUG 27/2022 windfall tax'")
    date: str
    indicator: Optional[str] = Field(None, description="e.g. 'CPI', 'NBR policy rate', 'TTF gas'")
    value: Optional[float] = None


class Session(BaseModel):
    """One routine run (morning or evening) — captures the engine's epistemic state at run time."""
    date: str
    session_type: Literal["morning", "evening"]


# Required export for the graphiti-mcp server's entity-types loader.
# Key = node label, value = Pydantic model class.
entity_types: dict[str, type[BaseModel]] = {
    "Company": Company,
    "Trade": Trade,
    "Thesis": Thesis,
    "Catalyst": Catalyst,
    "Mechanism": Mechanism,
    "SkippedSetup": SkippedSetup,
    "Counterfactual": Counterfactual,
    "Theme": Theme,
    "Prior": Prior,
    "News": News,
    "MacroEvent": MacroEvent,
    "Session": Session,
}
