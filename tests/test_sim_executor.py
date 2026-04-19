#!/usr/bin/env python3
"""
Tests for scripts/sim_executor.py.

Uses a temporary PORTFOLIO_DIR and monkeypatches fetch_today_bar so we don't
touch Yahoo. Standard library only (unittest).

Run:
    python3 -m unittest tests/test_sim_executor.py -v
"""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

# make `scripts/` importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts import sim_executor as se  # noqa: E402


def _seed_state(cash_ron: float = 10_000.0, positions: list | None = None, mode: str = "simulation") -> dict:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "as_of": now,
        "mode": mode,
        "cash_ron": cash_ron,
        "positions": positions or [],
        "totals": {},
    }


def _fake_bar(price: float, open_: float, high: float, low: float, date_iso: str) -> dict:
    return {"price": price, "open": open_, "high": high, "low": low, "close": price, "bar_date": date_iso}


class SimExecutorTest(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        self.portfolio_dir = Path(self.tmpdir.name)

        # point module-level paths at the tempdir (they were resolved at import time)
        self._patches = [
            mock.patch.object(se, "PORTFOLIO_DIR", str(self.portfolio_dir)),
            mock.patch.object(se, "STATE_PATH", str(self.portfolio_dir / "state.json")),
            mock.patch.object(se, "ORDERS_PATH", str(self.portfolio_dir / "orders.jsonl")),
            mock.patch.object(se, "FILLS_PATH", str(self.portfolio_dir / "fills.jsonl")),
            mock.patch.dict(os.environ, {"EXECUTION_MODE": "simulation"}),
        ]
        for p in self._patches:
            p.start()
            self.addCleanup(p.stop)

    def _write_state(self, state: dict) -> None:
        se._write_json_atomic(se.STATE_PATH, state)

    def _orders(self) -> list[dict]:
        return se._read_jsonl(se.ORDERS_PATH)

    def _fills(self) -> list[dict]:
        return se._read_jsonl(se.FILLS_PATH)

    def _read_state(self) -> dict:
        with open(se.STATE_PATH) as f:
            return json.load(f)

    def _run(self, argv: list[str]) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            with mock.patch.object(sys, "argv", ["sim_executor.py"] + argv):
                try:
                    rc = se.main()
                except SystemExit as e:
                    rc = int(e.code) if e.code is not None else 0
        return rc, out.getvalue(), err.getvalue()

    # ----- tests -----------------------------------------------------------

    def test_buy_settle_sell_roundtrip(self):
        """Happy path: place BUY → settle (fills) → place SELL → settle (closes)."""
        self._write_state(_seed_state(cash_ron=5_000.0))

        yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
        today = datetime.now(timezone.utc).date().isoformat()

        # BUY
        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(38.0, 37.8, 38.5, 37.5, today)):
            rc, out, err = self._run([
                "place", "--symbol", "TLV", "--action", "BUY",
                "--quantity", "10", "--limit", "38.0",
                "--trade-type", "swing", "--trade-id", "2026-04-18-TLV-01",
                "--theme-tag", "BNR higher-for-longer",
                "--invalidation", "NIM drops below 3.5",
                "--invalidation", "close below 35.00",
            ])
        self.assertEqual(rc, 0, err)
        orders = self._orders()
        self.assertEqual(len(orders), 1)
        self.assertEqual(orders[0]["theme_tag"], "BNR higher-for-longer")
        self.assertEqual(len(orders[0]["invalidation_conditions"]), 2)
        self.assertTrue(orders[0]["engine_managed"])

        # back-date the order so settle considers it eligible
        orders[0]["placed_at"] = f"{yesterday}T10:00:00+00:00"
        se._write_jsonl_atomic(se.ORDERS_PATH, orders)

        # SETTLE — bar today, limit 38.0, low 37.5 → fills at min(38.0, 37.8)=37.8
        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(38.2, 37.8, 38.5, 37.5, today)):
            rc, out, err = self._run(["settle"])
        self.assertEqual(rc, 0, err)

        state = self._read_state()
        self.assertEqual(len(state["positions"]), 1)
        pos = state["positions"][0]
        self.assertEqual(pos["symbol"], "TLV")
        self.assertEqual(pos["quantity"], 10)
        self.assertAlmostEqual(pos["avg_cost"], 37.8, places=4)
        self.assertEqual(pos["theme_tag"], "BNR higher-for-longer")
        self.assertTrue(pos["engine_managed"])
        self.assertEqual(self._orders(), [])
        fills = self._fills()
        self.assertEqual(len(fills), 1)
        self.assertEqual(fills[0]["action"], "BUY")
        self.assertEqual(fills[0]["theme_tag"], "BNR higher-for-longer")

        # SELL the whole position
        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(40.0, 39.8, 40.5, 39.0, today)):
            rc, out, err = self._run([
                "place", "--symbol", "TLV", "--action", "SELL",
                "--quantity", "10", "--limit", "39.5",
                "--trade-type", "swing", "--trade-id", "2026-04-18-TLV-01",
            ])
        self.assertEqual(rc, 0, err)

        # back-date the sell order
        orders = self._orders()
        orders[0]["placed_at"] = f"{yesterday}T10:00:00+00:00"
        se._write_jsonl_atomic(se.ORDERS_PATH, orders)

        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(40.2, 39.8, 40.5, 39.0, today)):
            rc, out, err = self._run(["settle"])
        self.assertEqual(rc, 0, err)

        report = json.loads(out)
        self.assertEqual(len(report["closed_positions"]), 1)
        closed = report["closed_positions"][0]
        self.assertEqual(closed["symbol"], "TLV")
        # fill = max(limit, open) = max(39.5, 39.8) = 39.8
        # realized = (39.8 - 37.8)*10 - commission
        self.assertAlmostEqual(closed["exit_price"], 39.8, places=4)
        state = self._read_state()
        self.assertEqual(state["positions"], [])
        self.assertGreater(state["cash_ron"], 5_000.0)  # we should have profit

    def test_expired_day_order(self):
        """A BUY DAY order that doesn't fill during its next session should expire, not linger."""
        self._write_state(_seed_state(cash_ron=5_000.0))
        yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
        today = datetime.now(timezone.utc).date().isoformat()

        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(38.0, 37.8, 38.5, 37.5, today)):
            rc, _, err = self._run([
                "place", "--symbol", "TLV", "--action", "BUY",
                "--quantity", "10", "--limit", "35.0",  # below today's low 37.5 — won't fill
                "--trade-type", "swing", "--trade-id", "2026-04-18-TLV-02",
                "--tif", "DAY",
            ])
        self.assertEqual(rc, 0, err)

        # back-date
        orders = self._orders()
        orders[0]["placed_at"] = f"{yesterday}T10:00:00+00:00"
        orders[0]["limit_price"] = 35.0  # below the bar's low
        se._write_jsonl_atomic(se.ORDERS_PATH, orders)

        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(38.0, 37.8, 38.5, 37.5, today)):
            rc, out, err = self._run(["settle"])
        self.assertEqual(rc, 0, err)

        # DAY order, placed yesterday, didn't fill — should be gone
        self.assertEqual(self._orders(), [])
        self.assertEqual(self._fills(), [])
        self.assertEqual(self._read_state()["positions"], [])

    def test_sector_cap_rejection(self):
        """Attempting to deploy so much into Banking that it breaches the 60% sector cap must be rejected."""
        # total value ~= 5000; 60% cap => 3000
        state = _seed_state(cash_ron=2_500.0, positions=[{
            "symbol": "TLV",
            "sector": "Banking",
            "quantity": 100,
            "avg_cost": 25.0,
            "last_price": 25.0,
            "opened_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "engine_managed": True,
        }])
        self._write_state(state)

        # trying to add BRD 50 @ 20 = 1000 RON.
        # current Banking value = 2500; adding 1000 => 3500 > 0.6*5000=3000 ⇒ reject
        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(20.0, 19.9, 20.3, 19.6, "2026-04-19")):
            rc, out, err = self._run([
                "place", "--symbol", "BRD", "--action", "BUY",
                "--quantity", "50", "--limit", "20.0",
                "--trade-type", "swing", "--trade-id", "2026-04-19-BRD-01",
            ])
        self.assertEqual(rc, 1, err)
        self.assertIn("sector cap", err)
        self.assertEqual(self._orders(), [])

    def test_execution_mode_guard(self):
        """If EXECUTION_MODE != state.mode, both place and settle must refuse."""
        self._write_state(_seed_state(cash_ron=5_000.0, mode="ibkr"))  # state claims ibkr; env says simulation

        with mock.patch.object(se, "fetch_today_bar", return_value=_fake_bar(38.0, 37.8, 38.5, 37.5, "2026-04-19")):
            rc, out, err = self._run([
                "place", "--symbol", "TLV", "--action", "BUY",
                "--quantity", "1", "--limit", "38.0",
                "--trade-type", "swing", "--trade-id", "2026-04-19-TLV-X",
            ])
        self.assertEqual(rc, 2, err)
        self.assertIn("EXECUTION_MODE", err)

        rc, out, err = self._run(["settle"])
        self.assertEqual(rc, 2, err)
        self.assertIn("EXECUTION_MODE", err)


if __name__ == "__main__":
    unittest.main()
