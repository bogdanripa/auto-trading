#!/usr/bin/env python3
"""
Evaluate the structured BVB rulebook against a market snapshot.

Reads:
    rules/bvb_rules.json        — the rulebook (30+ rules, source of truth)
    rules/market_snapshot.json  — current market state (or --snapshot <path>)

Emits:
    JSON object with:
      - firing_rules    : list of rules whose triggers all evaluated true
      - regime_scores   : REGIME-1 (risk-off) and REGIME-2 (risk-on) weighted scores
      - missing_inputs  : rules that could not be evaluated (metric not in snapshot)
      - recommended_posture : single derived action, if regime thresholds crossed

Why a snapshot file?
    macro-analyst (or any upstream skill) populates the snapshot from live feeds
    — BNR XML for EUR/RON, Yahoo for DAX/VIX, WebSearch for CDS / political events.
    Keeping the evaluator deterministic and snapshot-driven means the same input
    always produces the same output, and the rulebook is testable offline.

Standard library only.

Usage:
    python3 scripts/evaluate_rules.py                           # read default snapshot
    python3 scripts/evaluate_rules.py --snapshot path/to.json
    python3 scripts/evaluate_rules.py --format=text
    python3 scripts/evaluate_rules.py --rules rules/bvb_rules.json
    echo '{"eur_ron_close": 5.12, ...}' | python3 scripts/evaluate_rules.py --stdin

Exit codes:
    0 — evaluated OK, may or may not have firing rules
    1 — snapshot missing critical inputs (firing rules still emitted, but flagged)
    2 — fatal (rulebook not found, invalid JSON)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

RULES_PATH_DEFAULT = "rules/bvb_rules.json"
SNAPSHOT_PATH_DEFAULT = "rules/market_snapshot.json"

_SENTINEL_MISSING = object()


def _load_json(path: str) -> Any:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    with open(path) as f:
        return json.load(f)


def _get(snapshot: dict, metric: str) -> Any:
    """Return the value for `metric`, or _SENTINEL_MISSING if absent."""
    if metric not in snapshot:
        return _SENTINEL_MISSING
    return snapshot[metric]


def _op_eval(op: str, actual: Any, expected: Any) -> bool:
    """Apply a comparison op. Returns False for any comparison where actual is None."""
    if actual is None:
        return False
    if op == "==":
        return actual == expected
    if op == "!=":
        return actual != expected
    if op == ">":
        return actual > expected
    if op == ">=":
        return actual >= expected
    if op == "<":
        return actual < expected
    if op == "<=":
        return actual <= expected
    if op == "between":
        # expected is [lo, hi] inclusive
        lo, hi = expected
        return lo <= actual <= hi
    raise ValueError(f"unknown op: {op}")


def eval_condition(cond: dict, snapshot: dict) -> tuple[bool | None, str | None]:
    """
    Evaluate a single condition.

    Returns (result, missing_metric):
      (True/False, None) if evaluated
      (None, metric)     if metric wasn't in snapshot
    """
    metric = cond["metric"]
    val = _get(snapshot, metric)
    if val is _SENTINEL_MISSING:
        return None, metric
    return _op_eval(cond["op"], val, cond["value"]), None


def eval_rule(rule: dict, snapshot: dict) -> dict:
    """
    Evaluate one rule.

    Returns a dict:
      - fired        : bool
      - missing      : list[str] of metrics not in snapshot
      - matched      : list[dict] of conditions that evaluated True
      - unmatched    : list[dict] of conditions that evaluated False
      - score        : int|None for REGIME rules (weighted sum); else None
      - score_parts  : list[dict] for REGIME rules showing which components fired
    """
    result = {
        "rule_id": rule["id"],
        "family": rule["family"],
        "fired": False,
        "missing": [],
        "matched": [],
        "unmatched": [],
        "score": None,
        "score_parts": None,
    }

    # REGIME rules use weighted scoring instead of AND-composed conditions
    scoring = rule.get("scoring")
    if scoring and scoring.get("type") == "weighted_sum":
        total = 0
        parts = []
        missing = []
        for comp in scoring["components"]:
            ok, miss = eval_condition(comp, snapshot)
            if miss:
                missing.append(miss)
                parts.append({"metric": comp["metric"], "weight": comp["weight"],
                              "fired": None, "missing": True})
                continue
            weight = comp["weight"]
            if ok:
                total += weight
            parts.append({"metric": comp["metric"], "weight": weight, "fired": bool(ok), "missing": False})
        result["missing"] = missing
        result["score"] = total
        result["score_parts"] = parts
        result["fired"] = total >= scoring["threshold"]
        return result

    # standard rule: all conditions must match
    all_matched = True
    for cond in rule.get("conditions", []):
        ok, miss = eval_condition(cond, snapshot)
        if miss:
            result["missing"].append(miss)
            all_matched = False
            continue
        if ok:
            result["matched"].append(cond)
        else:
            result["unmatched"].append(cond)
            all_matched = False

    # A rule fires only if every condition evaluated True.
    # If any metric was missing, we treat the rule as un-fired but preserve `missing`
    # so the agent can see it's indeterminate, not falsified.
    result["fired"] = all_matched and not result["missing"]
    return result


def derive_posture(regime_results: dict[str, dict]) -> dict:
    """
    Collapse REGIME-1 / REGIME-2 scores into a single recommended posture.
    If both fire (shouldn't happen), risk-off wins (conservative bias).
    """
    r1 = regime_results.get("REGIME-1") or {}
    r2 = regime_results.get("REGIME-2") or {}
    if r1.get("fired"):
        return {"posture": "risk_off", "cash_floor_pct": 60, "source": "REGIME-1", "score": r1.get("score")}
    if r2.get("fired"):
        return {"posture": "risk_on", "cash_ceiling_pct": 20, "source": "REGIME-2", "score": r2.get("score")}
    return {"posture": "neutral", "source": None,
            "regime_1_score": r1.get("score"), "regime_2_score": r2.get("score")}


def main() -> int:
    p = argparse.ArgumentParser(description="Evaluate BVB rulebook against a market snapshot")
    p.add_argument("--rules", default=RULES_PATH_DEFAULT)
    p.add_argument("--snapshot", default=SNAPSHOT_PATH_DEFAULT)
    p.add_argument("--stdin", action="store_true", help="read snapshot JSON from stdin instead of --snapshot path")
    p.add_argument("--format", choices=["json", "text"], default="json")
    p.add_argument("--only-firing", action="store_true", help="in text mode, only print firing rules")
    args = p.parse_args()

    try:
        rulebook = _load_json(args.rules)
    except FileNotFoundError:
        print(f"error: rulebook not found at {args.rules}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as e:
        print(f"error: rulebook is not valid JSON: {e}", file=sys.stderr)
        return 2

    if args.stdin:
        try:
            snapshot = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"error: stdin is not valid JSON: {e}", file=sys.stderr)
            return 2
    else:
        try:
            snapshot = _load_json(args.snapshot)
        except FileNotFoundError:
            print(f"error: snapshot not found at {args.snapshot} — create it or pipe via --stdin",
                  file=sys.stderr)
            return 2

    results = []
    regime_results: dict[str, dict] = {}
    any_missing = False

    for rule in rulebook["rules"]:
        r = eval_rule(rule, snapshot)
        # stash the original title / action / band for reporting
        r["title"] = rule["title"]
        r["action"] = rule.get("action")
        r["direction"] = rule.get("direction")
        r["horizon_days"] = rule.get("horizon_days")
        r["expected_move_pct"] = rule.get("expected_move_pct")
        r["confidence"] = rule.get("confidence")
        r["tags"] = rule.get("tags")
        r["notes"] = rule.get("notes")
        results.append(r)
        if rule["family"] == "REGIME":
            regime_results[rule["id"]] = r
        if r["missing"]:
            any_missing = True

    firing = [r for r in results if r["fired"]]
    missing_by_rule = {r["rule_id"]: r["missing"] for r in results if r["missing"]}
    posture = derive_posture(regime_results)

    output = {
        "snapshot_as_of": snapshot.get("as_of"),
        "rulebook_version": rulebook.get("_meta", {}).get("version"),
        "n_rules": len(results),
        "n_firing": len(firing),
        "firing_rules": firing,
        "regime_scores": {
            "REGIME-1": {"score": regime_results.get("REGIME-1", {}).get("score"),
                         "fired": regime_results.get("REGIME-1", {}).get("fired"),
                         "parts": regime_results.get("REGIME-1", {}).get("score_parts")},
            "REGIME-2": {"score": regime_results.get("REGIME-2", {}).get("score"),
                         "fired": regime_results.get("REGIME-2", {}).get("fired"),
                         "parts": regime_results.get("REGIME-2", {}).get("score_parts")},
        },
        "recommended_posture": posture,
        "missing_inputs_by_rule": missing_by_rule,
    }

    if args.format == "json":
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        lines = []
        lines.append(f"🧭 RULE EVAL — snapshot as-of {output['snapshot_as_of'] or 'unknown'}")
        lines.append(f"rulebook v{output['rulebook_version']} · {output['n_firing']}/{output['n_rules']} firing")
        lines.append("")
        lines.append(f"Regime: {posture['posture'].upper()}"
                     + (f"  (from {posture['source']}, score={posture.get('score')})" if posture.get("source") else
                        f"  (R1={posture.get('regime_1_score')}, R2={posture.get('regime_2_score')})"))
        lines.append("")
        if firing:
            lines.append("🔥 FIRING")
            for r in firing:
                exp = r["expected_move_pct"] or {}
                em = f"  (expect {exp.get('low')}..{exp.get('high')}%, {r['horizon_days']}d)" if exp.get('low') is not None else ""
                lines.append(f"  [{r['rule_id']}] {r['title']} → {r['action']}{em}  conf={r['confidence']}")
        elif not args.only_firing:
            lines.append("(no rules firing)")
        if missing_by_rule and not args.only_firing:
            lines.append("")
            lines.append("⚠ INDETERMINATE (missing inputs)")
            for rid, metrics in missing_by_rule.items():
                lines.append(f"  [{rid}] needs: {', '.join(metrics)}")
        print("\n".join(lines))

    return 1 if any_missing else 0


if __name__ == "__main__":
    sys.exit(main())
