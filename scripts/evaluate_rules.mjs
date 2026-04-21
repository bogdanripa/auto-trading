#!/usr/bin/env node
/**
 * Evaluate the structured BVB rulebook against a market snapshot.
 *
 * Reads:
 *     rules/bvb_rules.json        — the rulebook (30+ rules, source of truth)
 *     rules/market_snapshot.json  — current market state (or --snapshot <path>)
 *
 * Emits:
 *     JSON object with:
 *       - firing_rules    : list of rules whose triggers all evaluated true
 *       - regime_scores   : REGIME-1 (risk-off) and REGIME-2 (risk-on) weighted scores
 *       - missing_inputs  : rules that could not be evaluated (metric not in snapshot)
 *       - recommended_posture : single derived action, if regime thresholds crossed
 *
 * Node 18+ stdlib only.
 *
 * Exit codes:
 *     0 — evaluated OK, may or may not have firing rules
 *     1 — snapshot missing critical inputs (firing rules still emitted, but flagged)
 *     2 — fatal (rulebook not found, invalid JSON)
 */

import fs from 'node:fs';

const RULES_PATH_DEFAULT = 'rules/bvb_rules.json';
const SNAPSHOT_PATH_DEFAULT = 'rules/market_snapshot.json';

const SENTINEL_MISSING = Symbol('missing');

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(filePath);
    err.code = 'ENOENT';
    throw err;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function get(snapshot, metric) {
  return Object.prototype.hasOwnProperty.call(snapshot, metric) ? snapshot[metric] : SENTINEL_MISSING;
}

function opEval(op, actual, expected) {
  if (actual === null || actual === undefined) return false;
  switch (op) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case 'between': {
      const [lo, hi] = expected;
      return actual >= lo && actual <= hi;
    }
    default: throw new Error(`unknown op: ${op}`);
  }
}

/**
 * Evaluate a single condition.
 * @returns {[boolean|null, string|null]} (result, missingMetric)
 */
function evalCondition(cond, snapshot) {
  const val = get(snapshot, cond.metric);
  if (val === SENTINEL_MISSING) return [null, cond.metric];
  return [opEval(cond.op, val, cond.value), null];
}

function evalRule(rule, snapshot) {
  const result = {
    rule_id: rule.id,
    family: rule.family,
    fired: false,
    missing: [],
    matched: [],
    unmatched: [],
    score: null,
    score_parts: null,
  };

  const scoring = rule.scoring;
  if (scoring && scoring.type === 'weighted_sum') {
    let total = 0;
    const parts = [];
    const missing = [];
    for (const comp of scoring.components) {
      const [ok, miss] = evalCondition(comp, snapshot);
      if (miss) {
        missing.push(miss);
        parts.push({ metric: comp.metric, weight: comp.weight, fired: null, missing: true });
        continue;
      }
      const weight = comp.weight;
      if (ok) total += weight;
      parts.push({ metric: comp.metric, weight, fired: Boolean(ok), missing: false });
    }
    result.missing = missing;
    result.score = total;
    result.score_parts = parts;
    result.fired = total >= scoring.threshold;
    return result;
  }

  let allMatched = true;
  for (const cond of (rule.conditions || [])) {
    const [ok, miss] = evalCondition(cond, snapshot);
    if (miss) {
      result.missing.push(miss);
      allMatched = false;
      continue;
    }
    if (ok) result.matched.push(cond);
    else { result.unmatched.push(cond); allMatched = false; }
  }
  result.fired = allMatched && result.missing.length === 0;
  return result;
}

function derivePosture(regimeResults) {
  const r1 = regimeResults['REGIME-1'] || {};
  const r2 = regimeResults['REGIME-2'] || {};
  if (r1.fired) {
    return { posture: 'risk_off', cash_floor_pct: 60, source: 'REGIME-1', score: r1.score ?? null };
  }
  if (r2.fired) {
    return { posture: 'risk_on', cash_ceiling_pct: 20, source: 'REGIME-2', score: r2.score ?? null };
  }
  return {
    posture: 'neutral',
    source: null,
    regime_1_score: r1.score ?? null,
    regime_2_score: r2.score ?? null,
  };
}

function parseArgs(argv) {
  const args = {
    rules: RULES_PATH_DEFAULT,
    snapshot: SNAPSHOT_PATH_DEFAULT,
    stdin: false,
    format: 'json',
    onlyFiring: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = (p) => a.startsWith(p + '=') ? a.slice(p.length + 1) : null;
    if (a === '--rules') args.rules = argv[++i];
    else if (eq('--rules')) args.rules = eq('--rules');
    else if (a === '--snapshot') args.snapshot = argv[++i];
    else if (eq('--snapshot')) args.snapshot = eq('--snapshot');
    else if (a === '--stdin') args.stdin = true;
    else if (a === '--format') args.format = argv[++i];
    else if (eq('--format')) args.format = eq('--format');
    else if (a === '--only-firing') args.onlyFiring = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!['json', 'text'].includes(args.format)) {
    throw new Error(`--format must be json|text, got ${args.format}`);
  }
  return args;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); return 2; }

  if (args.help) {
    process.stdout.write('Usage: node scripts/evaluate_rules.mjs [--rules=PATH] [--snapshot=PATH] [--stdin] [--format=json|text] [--only-firing]\n');
    return 0;
  }

  let rulebook;
  try { rulebook = loadJson(args.rules); }
  catch (e) {
    if (e.code === 'ENOENT') process.stderr.write(`error: rulebook not found at ${args.rules}\n`);
    else process.stderr.write(`error: rulebook is not valid JSON: ${e.message}\n`);
    return 2;
  }

  let snapshot;
  if (args.stdin) {
    try { snapshot = JSON.parse(await readStdin()); }
    catch (e) { process.stderr.write(`error: stdin is not valid JSON: ${e.message}\n`); return 2; }
  } else {
    try { snapshot = loadJson(args.snapshot); }
    catch (e) {
      if (e.code === 'ENOENT') {
        process.stderr.write(`error: snapshot not found at ${args.snapshot} — create it or pipe via --stdin\n`);
      } else {
        process.stderr.write(`error: snapshot is not valid JSON: ${e.message}\n`);
      }
      return 2;
    }
  }

  const results = [];
  const regimeResults = {};
  let anyMissing = false;

  for (const rule of rulebook.rules) {
    const r = evalRule(rule, snapshot);
    r.title = rule.title;
    r.action = rule.action ?? null;
    r.direction = rule.direction ?? null;
    r.horizon_days = rule.horizon_days ?? null;
    r.expected_move_pct = rule.expected_move_pct ?? null;
    r.confidence = rule.confidence ?? null;
    r.tags = rule.tags ?? null;
    r.notes = rule.notes ?? null;
    results.push(r);
    if (rule.family === 'REGIME') regimeResults[rule.id] = r;
    if (r.missing.length) anyMissing = true;
  }

  const firing = results.filter(r => r.fired);
  const missingByRule = {};
  for (const r of results) if (r.missing.length) missingByRule[r.rule_id] = r.missing;
  const posture = derivePosture(regimeResults);

  const output = {
    snapshot_as_of: snapshot.as_of ?? null,
    rulebook_version: rulebook._meta?.version ?? null,
    n_rules: results.length,
    n_firing: firing.length,
    firing_rules: firing,
    regime_scores: {
      'REGIME-1': {
        score: regimeResults['REGIME-1']?.score ?? null,
        fired: regimeResults['REGIME-1']?.fired ?? null,
        parts: regimeResults['REGIME-1']?.score_parts ?? null,
      },
      'REGIME-2': {
        score: regimeResults['REGIME-2']?.score ?? null,
        fired: regimeResults['REGIME-2']?.fired ?? null,
        parts: regimeResults['REGIME-2']?.score_parts ?? null,
      },
    },
    recommended_posture: posture,
    missing_inputs_by_rule: missingByRule,
  };

  if (args.format === 'json') {
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } else {
    const lines = [];
    lines.push(`🧭 RULE EVAL — snapshot as-of ${output.snapshot_as_of || 'unknown'}`);
    lines.push(`rulebook v${output.rulebook_version} · ${output.n_firing}/${output.n_rules} firing`);
    lines.push('');
    const postureLine = `Regime: ${posture.posture.toUpperCase()}` +
      (posture.source
        ? `  (from ${posture.source}, score=${posture.score})`
        : `  (R1=${posture.regime_1_score}, R2=${posture.regime_2_score})`);
    lines.push(postureLine);
    lines.push('');
    if (firing.length) {
      lines.push('🔥 FIRING');
      for (const r of firing) {
        const exp = r.expected_move_pct || {};
        const em = exp.low != null
          ? `  (expect ${exp.low}..${exp.high}%, ${r.horizon_days}d)`
          : '';
        lines.push(`  [${r.rule_id}] ${r.title} → ${r.action}${em}  conf=${r.confidence}`);
      }
    } else if (!args.onlyFiring) {
      lines.push('(no rules firing)');
    }
    if (Object.keys(missingByRule).length && !args.onlyFiring) {
      lines.push('');
      lines.push('⚠ INDETERMINATE (missing inputs)');
      for (const [rid, metrics] of Object.entries(missingByRule)) {
        lines.push(`  [${rid}] needs: ${metrics.join(', ')}`);
      }
    }
    process.stdout.write(lines.join('\n') + '\n');
  }

  return anyMissing ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => { process.stderr.write(`FATAL: ${err.stack || err.message || err}\n`); process.exit(2); }
);
