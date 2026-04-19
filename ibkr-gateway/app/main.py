"""
IBKR Gateway REST API
Exposes a simple REST interface over the IB Gateway socket connection.
Used by Claude scheduled tasks to execute trades, query account state, and fetch market data.
"""
import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Literal

import structlog
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from ib_insync import IB, Stock, LimitOrder, MarketOrder, util

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
log = structlog.get_logger()

# Configuration from environment
AUTH_TOKEN = os.getenv("AUTH_TOKEN")
IB_HOST = os.getenv("IB_HOST", "127.0.0.1")
IB_PORT = int(os.getenv("IB_PORT", "4002"))  # 4002 = paper, 4001 = live
IB_CLIENT_ID = int(os.getenv("IB_CLIENT_ID", "1"))
ACCOUNT_MODE = os.getenv("ACCOUNT_MODE", "paper")  # paper | live

# Global IB connection
ib = IB()
connection_state = {"connected": False, "last_connect": None, "last_error": None}


async def connect_ib_once():
    """Single attempt to connect to IB Gateway. Records state, does not raise."""
    try:
        log.info("connecting_to_ib", host=IB_HOST, port=IB_PORT)
        await ib.connectAsync(IB_HOST, IB_PORT, clientId=IB_CLIENT_ID, timeout=30)
        connection_state["connected"] = True
        connection_state["last_connect"] = datetime.utcnow().isoformat()
        connection_state["last_error"] = None
        log.info("ib_connected", mode=ACCOUNT_MODE)
        return True
    except Exception as e:
        connection_state["connected"] = False
        connection_state["last_error"] = str(e)
        log.warning("ib_connect_failed", error=str(e))
        return False


async def connect_and_monitor_loop():
    """
    Long-running background task.
    - Keeps trying to connect while IB Gateway boots (first-time cold start can take 2 min).
    - Once connected, watches for drops and reconnects.
    - Runs forever so /health always has a fresh view of IB state.
    This must NOT block FastAPI startup — the uvicorn server needs to bind
    port 8080 before Cloud Run's startup probe times out.
    """
    backoff_while_down = 15  # seconds between retries before we ever connect
    heartbeat = 60           # seconds between checks once connected
    while True:
        if not ib.isConnected():
            ok = await connect_ib_once()
            if not ok:
                await asyncio.sleep(backoff_while_down)
                continue
        await asyncio.sleep(heartbeat)
        if not ib.isConnected():
            log.warning("ib_disconnected")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    IMPORTANT: do NOT await IB connection here.
    Cloud Run requires port 8080 to open within its startup-probe window
    (~240s). IB Gateway + IBC auto-login routinely takes 60-120s on a cold
    start, and credentialing issues can make it take forever. Kick the
    connection off as a background task and let /health report the live state.
    """
    log.info("starting_gateway_api", mode=ACCOUNT_MODE)
    monitor = asyncio.create_task(connect_and_monitor_loop())
    try:
        yield
    finally:
        monitor.cancel()
        if ib.isConnected():
            ib.disconnect()
        log.info("gateway_api_stopped")


app = FastAPI(
    title="IBKR Gateway API",
    description="REST interface for the BVB autonomous trading engine",
    version="1.0.0",
    lifespan=lifespan,
)


def verify_token(authorization: Optional[str] = Header(None)):
    """Require Bearer token auth on all endpoints."""
    if not AUTH_TOKEN:
        raise HTTPException(500, "Server not configured with AUTH_TOKEN")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")
    token = authorization.replace("Bearer ", "", 1).strip()
    if token != AUTH_TOKEN:
        raise HTTPException(401, "Invalid token")
    return True


# ---------- Models ----------

class OrderRequest(BaseModel):
    symbol: str = Field(..., description="Stock ticker, e.g. SNG")
    exchange: str = Field("BVB", description="Exchange code")
    currency: str = Field("RON", description="Trading currency")
    action: Literal["BUY", "SELL"]
    quantity: int = Field(..., gt=0)
    order_type: Literal["LMT", "MKT"] = "LMT"
    limit_price: Optional[float] = Field(None, description="Required for LMT orders")
    tif: Literal["DAY", "GTC", "IOC"] = "DAY"
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    order_id: int
    status: str
    symbol: str
    action: str
    quantity: int
    limit_price: Optional[float]
    filled: int = 0
    avg_fill_price: Optional[float] = None
    commission: Optional[float] = None
    timestamp: str


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    """Health check for Cloud Run. No auth required."""
    return {
        "status": "ok" if ib.isConnected() else "degraded",
        "ib_connected": ib.isConnected(),
        "mode": ACCOUNT_MODE,
        "last_connect": connection_state["last_connect"],
        "last_error": connection_state["last_error"],
    }


@app.get("/account", dependencies=[Depends(verify_token)])
async def get_account():
    """Account summary: cash, buying power, net liquidation value."""
    if not ib.isConnected():
        raise HTTPException(503, "Not connected to IB Gateway")
    summary = {}
    for item in ib.accountSummary():
        summary[item.tag] = {
            "value": item.value,
            "currency": item.currency,
            "account": item.account,
        }
    return {"mode": ACCOUNT_MODE, "summary": summary}


@app.get("/positions", dependencies=[Depends(verify_token)])
async def get_positions():
    """Current positions."""
    if not ib.isConnected():
        raise HTTPException(503, "Not connected to IB Gateway")
    positions = []
    for pos in ib.positions():
        positions.append({
            "symbol": pos.contract.symbol,
            "exchange": pos.contract.exchange,
            "currency": pos.contract.currency,
            "position": pos.position,
            "avg_cost": pos.avgCost,
            "account": pos.account,
        })
    return {"positions": positions}


@app.get("/orders", dependencies=[Depends(verify_token)])
async def get_open_orders():
    """All currently open orders."""
    if not ib.isConnected():
        raise HTTPException(503, "Not connected to IB Gateway")
    orders = []
    for trade in ib.openTrades():
        orders.append({
            "order_id": trade.order.orderId,
            "symbol": trade.contract.symbol,
            "action": trade.order.action,
            "quantity": trade.order.totalQuantity,
            "order_type": trade.order.orderType,
            "limit_price": trade.order.lmtPrice if trade.order.lmtPrice > 0 else None,
            "status": trade.orderStatus.status,
            "filled": trade.orderStatus.filled,
            "remaining": trade.orderStatus.remaining,
        })
    return {"orders": orders}


@app.post("/orders", dependencies=[Depends(verify_token)], response_model=OrderResponse)
async def place_order(req: OrderRequest):
    """Place a new order on BVB (or another exchange)."""
    if not ib.isConnected():
        raise HTTPException(503, "Not connected to IB Gateway")

    # Construct the contract
    contract = Stock(req.symbol, req.exchange, req.currency)
    qualified = await ib.qualifyContractsAsync(contract)
    if not qualified:
        raise HTTPException(400, f"Could not qualify contract {req.symbol} on {req.exchange}")
    contract = qualified[0]

    # Construct the order
    if req.order_type == "LMT":
        if req.limit_price is None:
            raise HTTPException(400, "limit_price is required for LMT orders")
        order = LimitOrder(req.action, req.quantity, req.limit_price, tif=req.tif)
    else:
        order = MarketOrder(req.action, req.quantity, tif=req.tif)

    trade = ib.placeOrder(contract, order)

    # Wait briefly for status
    await asyncio.sleep(1)

    log.info(
        "order_placed",
        symbol=req.symbol,
        action=req.action,
        qty=req.quantity,
        price=req.limit_price,
        order_id=trade.order.orderId,
        notes=req.notes,
    )

    return OrderResponse(
        order_id=trade.order.orderId,
        status=trade.orderStatus.status,
        symbol=req.symbol,
        action=req.action,
        quantity=req.quantity,
        limit_price=req.limit_price,
        filled=trade.orderStatus.filled,
        avg_fill_price=trade.orderStatus.avgFillPrice if trade.orderStatus.avgFillPrice > 0 else None,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.delete("/orders/{order_id}", dependencies=[Depends(verify_token)])
async def cancel_order(order_id: int):
    """Cancel an open order."""
    if not ib.isConnected():
        raise HTTPException(503, "Not connected to IB Gateway")
    for trade in ib.openTrades():
        if trade.order.orderId == order_id:
            ib.cancelOrder(trade.order)
            log.info("order_cancelled", order_id=order_id)
            return {"order_id": order_id, "status": "cancel_requested"}
    raise HTTPException(404, f"Order {order_id} not found")


@app.get("/quote/{symbol}", dependencies=[Depends(verify_token)])
async def get_quote(symbol: str, exchange: str = "BVB", currency: str = "RON"):
    """Current quote for a symbol."""
    if not ib.isConnected():
        raise HTTPException(503, "Not connected to IB Gateway")
    contract = Stock(symbol, exchange, currency)
    qualified = await ib.qualifyContractsAsync(contract)
    if not qualified:
        raise HTTPException(400, f"Could not qualify contract {symbol}")
    contract = qualified[0]

    ticker = ib.reqMktData(contract, "", False, False)
    await asyncio.sleep(2)  # wait for data
    ib.cancelMktData(contract)

    return {
        "symbol": symbol,
        "bid": ticker.bid,
        "ask": ticker.ask,
        "last": ticker.last,
        "volume": ticker.volume,
        "time": ticker.time.isoformat() if ticker.time else None,
    }


@app.get("/executions", dependencies=[Depends(verify_token)])
async def get_executions():
    """Today's fills."""
    if not ib.isConnected():
        raise HTTPException(503, "Not connected to IB Gateway")
    fills = []
    for fill in ib.fills():
        fills.append({
            "symbol": fill.contract.symbol,
            "side": fill.execution.side,
            "shares": fill.execution.shares,
            "price": fill.execution.price,
            "time": fill.execution.time.isoformat() if fill.execution.time else None,
            "commission": fill.commissionReport.commission if fill.commissionReport else None,
            "currency": fill.commissionReport.currency if fill.commissionReport else None,
        })
    return {"fills": fills}
