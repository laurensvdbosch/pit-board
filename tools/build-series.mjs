/* ===========================================================
   Builds series-bank.js — the question bank for Tape Audit (AUDT).

     node tools/build-series.mjs            → writes series-bank.js
     node tools/build-series.mjs --check    → only runs the self-tests

   Two question types, 8 numbers each:
   - extra ('x'): one number was inserted into a valid sequence.
   - wrong ('w'): one number of a valid sequence was changed.

   Every candidate is checked against a set of pattern detectors.
   A question is kept only if the intended number is the ONLY one
   whose removal (extra) or replacement (wrong) leaves a sequence
   some detector explains, so there is exactly one right answer.
   =========================================================== */

import fs from 'fs';

const LEN = 8;
const MAXV = 99999;

// ---------- seeded RNG (same bank every build) ----------
let seed = 20261026;
const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = arr => arr[Math.floor(rand() * arr.length)];

const PRIMES = [];
for (let n = 2; PRIMES.length < 300; n++) if (PRIMES.every(p => p * p > n || n % p)) PRIMES.push(n);
const isPrime = n => n > 1 && PRIMES.includes(n);

// ---------- pattern families (generators) ----------
// Each returns { terms, rule, level } for `len` terms, or null.
const up = (d) => (d > 0 ? `add ${d}` : `subtract ${-d}`);
const FAMILIES = {
  arith(len) {
    const d = ri(3, 19);
    const down = rand() < 0.25;
    const a = down ? ri(d * len + 2, d * len + 90) : ri(2, 70);
    const step = down ? -d : d;
    return { terms: Array.from({ length: len }, (_, k) => a + step * k), rule: `${up(step)[0].toUpperCase()}${up(step).slice(1)} each step`, level: 1 };
  },
  geom(len) {
    const r = rand() < 0.7 ? 2 : 3;
    const a = r === 2 ? ri(1, 12) : ri(1, 4);
    return { terms: Array.from({ length: len }, (_, k) => a * r ** k), rule: `Multiply by ${r} each step`, level: r === 2 ? 1 : 2 };
  },
  squares(len) {
    const n0 = ri(1, 12);
    const c = pick([0, 0, 0, 1, -1, 2, 3, 5]);
    const tail = c ? ` ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}` : '';
    return { terms: Array.from({ length: len }, (_, k) => (n0 + k) ** 2 + c), rule: `Squares${tail}: ${n0}², ${n0 + 1}², ${n0 + 2}², …`, level: c ? 2 : 1 };
  },
  cubes(len) {
    const n0 = ri(1, 5);
    const c = pick([0, 0, 1, -1, 2]);
    const tail = c ? ` ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}` : '';
    return { terms: Array.from({ length: len }, (_, k) => (n0 + k) ** 3 + c), rule: `Cubes${tail}: ${n0}³, ${n0 + 1}³, ${n0 + 2}³, …`, level: c ? 3 : 2 };
  },
  triangular(len) {
    const n0 = ri(1, 10);
    const pronic = rand() < 0.5;
    const f = n => (pronic ? n * (n + 1) : (n * (n + 1)) / 2);
    return { terms: Array.from({ length: len }, (_, k) => f(n0 + k)), rule: pronic ? 'n × (n+1): 1×2, 2×3, 3×4, … (differences +2 each time)' : 'Triangular numbers (add 1, 2, 3, 4, …)', level: 2 };
  },
  quad(len) {
    const a = ri(1, 40), d0 = ri(1, 9), c = ri(1, 4);
    const t = [a];
    for (let k = 1; k < len; k++) t.push(t[k - 1] + d0 + c * (k - 1));
    return { terms: t, rule: `Differences grow by ${c} (${d0}, ${d0 + c}, ${d0 + 2 * c}, …)`, level: 2 };
  },
  primes(len) {
    const p0 = ri(2, 30);
    return { terms: PRIMES.slice(p0, p0 + len), rule: 'Consecutive prime numbers', level: 2 };
  },
  fib(len) {
    const a = ri(1, 9), b = ri(a, a + 9);
    const t = [a, b];
    while (t.length < len) t.push(t[t.length - 1] + t[t.length - 2]);
    return { terms: t, rule: 'Each number is the sum of the previous two', level: 2 };
  },
  powers2(len) {
    const c = pick([-1, 1, 2, 3, -3, 5]);
    const k0 = ri(0, 3);
    return { terms: Array.from({ length: len }, (_, k) => 2 ** (k0 + k) + c), rule: `Powers of 2 ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)} (or: ×2 then ${c > 0 ? 'subtract' : 'add'} ${Math.abs(c)})`, level: 2 };
  },
  interleaved(len) {
    const a1 = ri(2, 40), a2 = ri(2, 40);
    let d1 = ri(2, 12), d2 = ri(2, 12);
    const desc = rand() < 0.35;
    const b2 = desc ? ri(d2 * len + 10, d2 * len + 80) : a2;
    if (desc) d2 = -d2;
    if (!desc && d1 === d2 && a1 === a2) return null;
    const t = Array.from({ length: len }, (_, k) => (k % 2 === 0 ? a1 + d1 * (k / 2) : b2 + d2 * ((k - 1) / 2)));
    return { terms: t, rule: `Two sequences take turns: 1st, 3rd, 5th… ${up(d1)}; 2nd, 4th, 6th… ${up(d2)}`, level: desc ? 3 : 2 };
  },
  altops(len) {
    const x0 = ri(1, 12), a = ri(1, 7);
    const kind = pick(['addmul', 'muladd', 'mulsub']);
    const ops = {
      addmul: [x => x + a, x => x * 2, `alternately add ${a}, then multiply by 2`],
      muladd: [x => x * 2, x => x + a, `alternately multiply by 2, then add ${a}`],
      mulsub: [x => x * 3, x => x - a, `alternately multiply by 3, then subtract ${a}`],
    }[kind];
    const t = [x0];
    for (let k = 1; k < len; k++) t.push(ops[(k - 1) % 2](t[k - 1]));
    return { terms: t, rule: ops[2][0].toUpperCase() + ops[2].slice(1), level: 3 };
  },
  affine(len) {
    const a = rand() < 0.75 ? 2 : 3;
    const b = pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
    const x0 = a === 2 ? ri(2, 9) : ri(2, 4);
    const t = [x0];
    for (let k = 1; k < len; k++) t.push(t[k - 1] * a + b);
    return { terms: t, rule: `Multiply by ${a}, then ${b > 0 ? 'add' : 'subtract'} ${Math.abs(b)}`, level: 3 };
  },
  diffgeom(len) {
    const x0 = ri(1, 30), d = ri(1, 4), r = rand() < 0.7 ? 2 : 3;
    const t = [x0];
    for (let k = 1; k < len; k++) t.push(t[k - 1] + d * r ** (k - 1));
    return { terms: t, rule: `Differences multiply by ${r} (${d}, ${d * r}, ${d * r * r}, …)`, level: 3 };
  },
  diffprimes(len) {
    const x0 = ri(1, 30), q0 = ri(0, 5);
    const t = [x0];
    for (let k = 1; k < len; k++) t.push(t[k - 1] + PRIMES[q0 + k - 1]);
    return { terms: t, rule: `Add consecutive primes (${PRIMES[q0]}, ${PRIMES[q0 + 1]}, ${PRIMES[q0 + 2]}, …)`, level: 3 };
  },
  diffsquares(len) {
    const x0 = ri(1, 30), n0 = ri(1, 4);
    const t = [x0];
    for (let k = 1; k < len; k++) t.push(t[k - 1] + (n0 + k - 1) ** 2);
    return { terms: t, rule: `Add consecutive squares (${n0 ** 2}, ${(n0 + 1) ** 2}, ${(n0 + 2) ** 2}, …)`, level: 3 };
  },
  trib(len) {
    const t = [ri(1, 4), ri(1, 5), ri(2, 7)];
    while (t.length < len) t.push(t[t.length - 1] + t[t.length - 2] + t[t.length - 3]);
    return { terms: t, rule: 'Each number is the sum of the previous three', level: 3 };
  },
  mulinc(len) {
    const x0 = ri(1, 2);
    const t = [x0];
    for (let k = 1; k < len; k++) t.push(t[k - 1] * (k + 1));
    return { terms: t, rule: 'Multiply by 2, then 3, then 4, … (a factorial pattern)', level: 3 };
  },
};

// ---------- detectors ----------
// points: [[position, value], …] sorted by position; may skip one position.
const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));

function polyFits(points, deg) {
  if (points.length < deg + 3) return false;
  const base = points.slice(0, deg + 1);
  const at = x => base.reduce((s, [xi, yi], i) =>
    s + yi * base.reduce((p, [xj], j) => (j === i ? p : (p * (x - xj)) / (xi - xj)), 1), 0);
  return points.slice(deg + 1).every(([x, y]) => near(at(x), y));
}

function geomFits(points, minPts = 4) {
  if (points.length < minPts) return false;
  const [[k1, v1], [k2, v2]] = points;
  if (!v1 || v2 / v1 <= 0) return false;
  const r = (v2 / v1) ** (1 / (k2 - k1));
  if (!isFinite(r) || near(r, 1)) return false;
  return points.every(([k, v]) => near(v1 * r ** (k - k1), v));
}

// Walk a one-step rule forward from the first known term, checking every known term
function simulate(points, step) {
  const m = new Map(points);
  const kmax = points[points.length - 1][0];
  let x = points[0][1];
  for (let k = points[0][0]; k <= kmax; k++) {
    if (m.has(k) && !near(m.get(k), x)) return false;
    x = step(x, k);
    if (!isFinite(x)) return false;
  }
  return true;
}

function runStart(points, n) {
  const m = new Map(points);
  for (const [k] of points) {
    let ok = true;
    for (let i = 1; i < n; i++) if (!m.has(k + i)) { ok = false; break; }
    if (ok) return k;
  }
  return -1;
}

// x(k+1) = a·x(k) + b with a, b fitted
function affineFits(points) {
  const m = new Map(points);
  const s = runStart(points, 3);
  if (s < 0) return false;
  const x0 = m.get(s), x1 = m.get(s + 1), x2 = m.get(s + 2);
  if (x1 === x0) return false;
  const a = (x2 - x1) / (x1 - x0), b = x1 - a * x0;
  return simulate(points, x => a * x + b);
}

// x(k+2) = p·x(k+1) + q·x(k) with p, q fitted (covers Fibonacci, geometric differences, …)
function lin2Fits(points) {
  const m = new Map(points);
  const s = runStart(points, 4);
  if (s < 0) return false;
  const [x0, x1, x2, x3] = [0, 1, 2, 3].map(i => m.get(s + i));
  const det = x1 * x1 - x0 * x2;
  if (Math.abs(det) < 1e-9) return false;
  const p = (x2 * x1 - x0 * x3) / det, q = (x1 * x3 - x2 * x2) / det;
  if (Math.abs(q) < 1e-9) return false;
  const kmin = points[0][0], kmax = points[points.length - 1][0];
  const val = new Map([[s, x0], [s + 1, x1]]);
  for (let k = s + 2; k <= kmax; k++) val.set(k, p * val.get(k - 1) + q * val.get(k - 2));
  for (let k = s - 1; k >= kmin; k--) val.set(k, (val.get(k + 2) - p * val.get(k + 1)) / q);
  return points.every(([k, v]) => near(val.get(k), v));
}

// x(k+3) = x(k) + x(k+1) + x(k+2), allowing one unknown position
function tribFits(points) {
  const m = new Map(points);
  const kmin = points[0][0], kmax = points[points.length - 1][0];
  let solved = null, checked = 0;
  for (let k = kmin; k + 3 <= kmax; k++) {
    const idx = [k, k + 1, k + 2, k + 3];
    const unknown = idx.filter(i => !m.has(i));
    if (unknown.length > 1) return false;
    if (!unknown.length) {
      if (!near(m.get(k) + m.get(k + 1) + m.get(k + 2), m.get(k + 3))) return false;
      checked++;
    } else {
      const u = unknown[0];
      const known = idx.filter(i => i !== u).map(i => m.get(i));
      const sol = u === k + 3 ? known[0] + known[1] + known[2] : known[2] - known[0] - known[1];
      if (solved === null) solved = sol;
      else if (!near(solved, sol)) return false;
    }
  }
  return checked >= 2;
}

function primesFits(points) {
  const [k1, v1] = points[0];
  const i1 = PRIMES.indexOf(v1);
  if (i1 < 0 || i1 - k1 < 0) return false;
  return points.every(([k, v]) => PRIMES[i1 - k1 + k] === v);
}

function diffPrimesFits(points) {
  const s = runStart(points, 2);
  if (s < 0) return false;
  const m = new Map(points);
  const q = PRIMES.indexOf(m.get(s + 1) - m.get(s));
  if (q < 0 || q - s < 0) return false;
  const q0 = q - s;
  return simulate(points, (x, k) => x + PRIMES[q0 + k]);
}

function mulincFits(points) {
  const s = runStart(points, 2);
  if (s < 0) return false;
  const m = new Map(points);
  const c0 = m.get(s + 1) / m.get(s) - s;
  if (!Number.isInteger(c0) || c0 < 1) return false;
  return simulate(points, (x, k) => x * (c0 + k));
}

// Odd and even positions each follow their own simple rule
function interleavedFits(points) {
  const side = par => points.filter(([k]) => k % 2 === par).map(([k, v]) => [Math.floor(k / 2), v]);
  // Each half has only 3–4 terms, so a straight line needs just one check here
  const line = pts => pts.slice(2).every(([k, v]) => near(pts[0][1] + ((pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0])) * (k - pts[0][0]), v));
  const simple = pts => pts.length >= 3 && (line(pts) || geomFits(pts, 3));
  return simple(side(0)) && simple(side(1));
}

// Two alternating steps, each "×a then +b" with a in 1..3
function altopsFits(points) {
  const m = new Map(points);
  const trans = par => points.find(([k]) => k % 2 === par && m.has(k + 1));
  const t0 = trans(0), t1 = trans(1);
  if (!t0 || !t1) return false;
  for (const a0 of [1, 2, 3]) {
    for (const a1 of [1, 2, 3]) {
      const b0 = m.get(t0[0] + 1) - a0 * t0[1];
      const b1 = m.get(t1[0] + 1) - a1 * t1[1];
      if (a0 === a1 && b0 === b1) continue;
      if (simulate(points, (x, k) => (k % 2 === 0 ? a0 * x + b0 : a1 * x + b1))) return true;
    }
  }
  return false;
}

const DETECTORS = [
  p => polyFits(p, 1), p => polyFits(p, 2), p => polyFits(p, 3),
  p => geomFits(p), affineFits, lin2Fits, tribFits, primesFits,
  diffPrimesFits, mulincFits, interleavedFits, altopsFits,
];
const fitsAny = pts => DETECTORS.some(f => f(pts));
const toPts = arr => arr.map((v, k) => [k, v]);

// Exactly one answer: only removing / replacing `ans` makes the rest fit a pattern
function isUnique(type, seq, ans) {
  if (fitsAny(toPts(seq))) return false;
  for (let j = 0; j < seq.length; j++) {
    const pts = type === 'x'
      ? toPts(seq.filter((_, i) => i !== j))
      : toPts(seq).filter(([k]) => k !== j);
    if (fitsAny(pts) !== (j === ans)) return false;
  }
  return true;
}

// ---------- making questions ----------
function makeExtra(fam) {
  const base = FAMILIES[fam](LEN - 1);
  if (!base) return null;
  const t = base.terms;
  const pos = rand() < 0.9 ? ri(1, LEN - 2) : pick([0, LEN - 1]);
  const prev = t[pos - 1], next = t[pos];
  let v;
  if (prev !== undefined && next !== undefined) {
    const lo = Math.min(prev, next), hi = Math.max(prev, next);
    v = hi - lo >= 2 ? ri(lo + 1, hi - 1) : hi + ri(1, 3);
    if (fam === 'primes') {   // an odd number that looks prime
      const odd = []; for (let n = lo + 1; n < hi; n++) if (n % 2 && !isPrime(n)) odd.push(n);
      if (odd.length) v = pick(odd);
    }
  } else if (pos === 0) {
    v = Math.max(1, t[0] - (t[1] - t[0]) + pick([-2, -1, 1, 2]));
  } else {
    v = t[t.length - 1] + (t[t.length - 1] - t[t.length - 2]) + pick([-2, -1, 1, 2]);
  }
  const seq = [...t.slice(0, pos), v, ...t.slice(pos)];
  return { type: 'x', seq, ans: pos, fixed: null, ...base };
}

function makeWrong(fam) {
  const base = FAMILIES[fam](LEN);
  if (!base) return null;
  const t = base.terms;
  const pos = rand() < 0.9 ? ri(1, LEN - 1) : 0;
  const gaps = [t[pos - 1], t[pos + 1]].filter(x => x !== undefined).map(x => Math.abs(x - t[pos]));
  const gap = Math.max(2, Math.min(...gaps));
  const delta = ri(1, Math.max(1, Math.min(9, Math.floor(gap * 0.6)))) * (rand() < 0.5 ? -1 : 1);
  const seq = [...t];
  seq[pos] = t[pos] + delta;
  return { type: 'w', seq, ans: pos, fixed: t[pos], ...base };
}

function acceptable(q) {
  if (!q) return false;
  const { seq, ans } = q;
  if (seq.some(v => !Number.isInteger(v) || v <= 0 || v > MAXV)) return false;
  if (new Set(seq).size !== seq.length) return false;   // no repeats: reads cleanly, typed answer is unambiguous
  return isUnique(q.type, seq, ans);
}

// ---------- self-tests ----------
function selfTest() {
  const cases = [
    ['user example: extra prime', 'x', [43, 47, 53, 57, 59, 61, 67, 71], 3, true],
    ['user example: wrong step', 'w', [7, 18, 29, 40, 54, 62, 73, 84], 4, true],
    ['ambiguous answer rejected', 'w', [2, 4, 6, 8, 11, 12, 15, 16], 4, false],
    ['clean sequence rejected', 'w', [3, 6, 9, 12, 15, 18, 21, 24], 2, false],
  ];
  let ok = true;
  for (const [name, type, seq, ans, want] of cases) {
    const got = isUnique(type, seq, ans);
    console.log(`${got === want ? 'PASS' : 'FAIL'} ${name}`);
    ok = ok && got === want;
  }
  for (const fam of Object.keys(FAMILIES)) {   // every family must be recognised by some detector
    let hits = 0;
    for (let i = 0; i < 30; i++) { const b = FAMILIES[fam](LEN - 1); if (b && fitsAny(toPts(b.terms))) hits++; }
    if (hits < 25) { console.log(`FAIL detector coverage for ${fam}: ${hits}/30`); ok = false; }
  }
  return ok;
}

// ---------- build ----------
if (!selfTest()) process.exit(1);
if (process.argv.includes('--check')) process.exit(0);

const fams = Object.keys(FAMILIES);
// Easy families get bigger quotas so every session has fresh level-1 questions
const QUOTA = { arith: 40, geom: 25, squares: 25 };
const quota = fam => QUOTA[fam] || 13;
const TARGET = fams.reduce((n, f) => n + quota(f), 0);
const bank = [], seen = new Set(), count = {};
let tries = 0;
while (bank.length < TARGET && tries < 200000) {
  tries++;
  const fam = fams[tries % fams.length];
  if ((count[fam] || 0) >= quota(fam)) continue;
  const q = rand() < 0.5 ? makeExtra(fam) : makeWrong(fam);
  if (!acceptable(q)) continue;
  const key = q.seq.join(',');
  if (seen.has(key)) continue;
  seen.add(key);
  count[fam] = (count[fam] || 0) + 1;
  bank.push(q);
}

const levels = [1, 2, 3].map(l => bank.filter(q => q.level === l).length);
const types = { extra: bank.filter(q => q.type === 'x').length, wrong: bank.filter(q => q.type === 'w').length };
console.log(`questions: ${bank.length} (tries ${tries})`);
console.log('by family:', count);
console.log('by level 1/2/3:', levels.join(' / '), '| by type:', types);

const rows = bank.map(q => `  [${JSON.stringify(q.type)}, [${q.seq.join(', ')}], ${q.ans}, ${q.fixed}, ${JSON.stringify(q.rule)}, ${q.level}]`);
fs.writeFileSync(new URL('../series-bank.js', import.meta.url), `// Generated by tools/build-series.mjs — do not edit by hand.
// Each question: [type ('x' = one extra number inserted, 'w' = one number wrong),
//                 numbers, index of the answer, correct value (wrong only), rule, level 1–3]
// Every question was checked to have exactly one valid answer.
const SERIES_BANK = [
${rows.join(',\n')},
];
`);
console.log('wrote series-bank.js');
