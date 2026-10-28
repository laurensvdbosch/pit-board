/* ===========================================================
   Builds series-bank.js — the question bank for Tape Audit (AUDT).

     node tools/build-series.mjs            → writes series-bank.js
     node tools/build-series.mjs --check    → only runs the self-tests

   Format (Optiver-style number logic): a sequence is shown, you pick
   the next value from 5 options. Terms can be negative, fractions or
   mixed numbers. All arithmetic is exact (fractions, never floats).

   A question is kept only if no simpler pattern (polynomial,
   geometric, a·x+b, two-term recurrence, interleaved halves) fits the
   shown terms and predicts a different next value — so the intended
   rule is the only reasonable one among the options.
   =========================================================== */

import fs from 'fs';

const QUOTA = 14;   // questions per family

// ---------- seeded RNG (same bank every build) ----------
let seed = 20261028;
const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = arr => arr[Math.floor(rand() * arr.length)];
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const PRIMES = [];
for (let n = 2; PRIMES.length < 120; n++) if (PRIMES.every(p => p * p > n || n % p)) PRIMES.push(n);

// ---------- exact fractions ----------
const LIMIT = 1e7;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
class Q {
  constructor(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error('bad fraction');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    this.n = n / g; this.d = d / g;
    if (Math.abs(this.n) > LIMIT || this.d > LIMIT) throw new Error('too big');
  }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { return new Q(this.n * o.d, this.d * o.n); }
  eq(o) { return this.n === o.n && this.d === o.d; }
  get val() { return this.n / this.d; }
  get isInt() { return this.d === 1; }
  get isZero() { return this.n === 0; }
  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`; }
}
const q = (n, d = 1) => new Q(n, d);
const safe = fn => { try { return fn(); } catch { return null; } };

// term = { v: exact value, s: how it is displayed ("p/q" or integer) }
const T = v => ({ v, s: v.toString() });
const raw = (p, d) => ({ v: q(p, d), s: d === 1 ? `${p}` : `${p}/${d}` });   // unreduced on purpose

const OP = {
  add: k => ({ f: x => x.add(q(k)), label: `+${k}` }),
  sub: k => ({ f: x => x.sub(q(k)), label: `−${k}` }),
  mul: k => ({ f: x => x.mul(q(k)), label: `×${k}` }),
  div: k => ({ f: x => x.div(q(k)), label: `÷${k}` }),
};
const run = (x0, n, step) => { const t = [x0]; for (let k = 1; k < n; k++) t.push(step(t[k - 1], k - 1, t)); return t; };
const small = (t, maxAbs = 50000, maxDen = 64) => t.every(v => Math.abs(v.val) <= maxAbs && v.d <= maxDen);
const fmtQ = v => v.toString();

// ---------- pattern families ----------
// Each returns { terms (last = answer), rule, mode: 'mixed'|'frac', level, traps } or null.
// traps: wrong answers that come from a typical mistake.
const FAMILIES = {
  // ---- level 2 ----
  opcycle2() {
    const a = ri(1, 9), b = ri(2, 9);
    const pairs = [
      [OP.add(a), OP.mul(2)], [OP.mul(2), OP.sub(a)], [OP.div(2), OP.mul(3)], [OP.mul(3), OP.div(2)],
      [OP.add(b), OP.mul(3)], [OP.sub(a), OP.mul(2)], [OP.mul(2), OP.add(a)], [OP.mul(3), OP.sub(b)],
    ];
    const ops = pick(pairs);
    const t = safe(() => run(q(ri(2, 30)), 7, (x, k) => ops[k % 2].f(x)));
    if (!t || !small(t, 20000, 8)) return null;
    return { terms: t.map(T), rule: `Alternate ${ops[0].label}, ${ops[1].label}`, mode: 'mixed', level: 2,
      traps: [ops[1].f(t[5]), ops[0].f(t[4])] };
  },
  addcycle4() {
    const steps = shuffle([ri(2, 9), -ri(1, 8), -ri(2, 9), ri(1, 8)]);
    if (new Set(steps).size < 4) return null;
    const t = run(q(ri(5, 40)), 8, (x, k) => x.add(q(steps[k % 4])));
    const lbl = steps.map(s => (s > 0 ? `+${s}` : `−${-s}`)).join(', ');
    return { terms: t.map(T), rule: `Repeating cycle ${lbl}`, mode: 'mixed', level: 2,
      traps: [t[6].add(q(steps[(6 + 1) % 4])), t[6].add(q(steps[(6 + 3) % 4])), t[6].sub(q(steps[6 % 4]))] };
  },
  quad() {
    const c = ri(2, 8), d0 = ri(6, 30);
    const t = run(q(ri(5, 60)), 7, (x, k) => x.add(q(d0 + c * k)));
    return { terms: t.map(T), rule: `Differences grow by ${c}: +${d0}, +${d0 + c}, +${d0 + 2 * c}, …`, mode: 'mixed', level: 2,
      traps: [t[5].add(q(d0 + c * 4)), t[5].add(q(d0 + c * 6))] };
  },
  diffgeom() {
    const r = pick([2, 3]), d = ri(2, 6);
    const t = run(q(ri(3, 40)), 7, (x, k) => x.add(q(d * r ** k)));
    if (!small(t)) return null;
    return { terms: t.map(T), rule: `Differences multiply by ${r}: +${d}, +${d * r}, +${d * r * r}, …`, mode: 'mixed', level: 2,
      traps: [t[5].add(q(d * r ** 4)), t[5].mul(q(r))] };
  },
  trib() {
    const t = run(q(ri(1, 5)), 7, (x, k, s) => (k < 2 ? q([ri(1, 6), ri(2, 7)][k]) : s[k].add(s[k - 1]).add(s[k - 2])));
    return { terms: t.map(T), rule: 'Each term is the sum of the previous three', mode: 'mixed', level: 2,
      traps: [t[5].add(t[4]), t[5].add(t[4]).add(t[3]).add(q(1))] };
  },
  polyMix() {
    const forms = [
      [n => n * n + n, 'n² + n'], [n => n ** 3 - n, 'n³ − n'], [n => n ** 3 + n * n, 'n³ + n²'],
      [n => 2 * n * n - 1, '2n² − 1'], [n => n * (n + 1) * (n + 2), 'n(n+1)(n+2)'], [n => n ** 3 + 1, 'n³ + 1'],
      [n => 3 * n * n - n, '3n² − n'], [n => n * n * n - 2 * n, 'n³ − 2n'],
    ];
    const [f, lbl] = pick(forms);
    const n0 = ri(1, 5);
    const t = Array.from({ length: 7 }, (_, k) => q(f(n0 + k)));
    return { terms: t.map(T), rule: `Term = ${lbl} for n = ${n0}, ${n0 + 1}, ${n0 + 2}, …`, mode: 'mixed', level: 2,
      traps: [q(f(n0 + 7)), t[5].add(t[5].sub(t[4]))] };
  },
  altSign() {
    const m = pick([-2, -3]), c = ri(1, 6) * pick([1, -1]);
    const t = run(q(ri(1, 6)), 7, x => x.mul(q(m)).add(q(c)));
    if (!small(t)) return null;
    return { terms: t.map(T), rule: `Multiply by ${m}, then ${c > 0 ? 'add' : 'subtract'} ${Math.abs(c)}`, mode: 'mixed', level: 2,
      traps: [t[5].mul(q(-m)).add(q(c)), t[5].mul(q(m)).sub(q(c))] };
  },

  // ---- level 3 ----
  opcycle3() {
    const mults = [OP.mul(2), OP.mul(3), OP.div(2), OP.div(4), OP.div(3)];
    const adds = [OP.add(ri(2, 12)), OP.sub(ri(2, 9))];
    const ops = shuffle([pick(mults), pick(adds), pick([...mults, ...adds])]);
    if (new Set(ops.map(o => o.label)).size < 3) return null;
    const t = safe(() => run(q(ri(2, 24)), 7, (x, k) => ops[k % 3].f(x)));
    if (!t || !small(t, 5000, 12)) return null;
    return { terms: t.map(T), rule: `Repeating cycle ${ops.map(o => o.label).join(', ')}`, mode: 'mixed', level: 3,
      traps: [ops[1].f(t[5]), ops[2].f(t[5])] };
  },
  incAlt() {
    // Two operations alternate and their argument grows: ×1, +1, ×2, +2, … or ÷6, ×5, ÷4, …
    const kind = pick(['mulAdd', 'addMul', 'mulSub', 'divMulDown']);
    let ops, rule;
    if (kind === 'divMulDown') {
      const k0 = 6;
      ops = Array.from({ length: 6 }, (_, i) => (i % 2 === 0 ? OP.div(k0 - i) : OP.mul(k0 - i)));
      rule = `Operations ${ops.map(o => o.label).join(', ')} (counting down)`;
      const start = q(pick([60, 180, 240, 360, 480, 720, 900]));
      const t = safe(() => run(start, 7, (x, k) => ops[k].f(x)));
      if (!t || !small(t, 5000, 16)) return null;
      return { terms: t.map(T), rule, mode: 'mixed', level: 3, traps: [t[5].add(q(1)), t[5].mul(q(2)), t[5].div(q(2))] };
    }
    const mk = (i) => {
      const k = Math.floor(i / 2) + 1;
      if (kind === 'mulAdd') return i % 2 === 0 ? OP.mul(k + 1) : OP.add(k);
      if (kind === 'addMul') return i % 2 === 0 ? OP.add(k) : OP.mul(k + 1);
      return i % 2 === 0 ? OP.mul(k + 1) : OP.sub(k);
    };
    ops = Array.from({ length: 6 }, (_, i) => mk(i));
    const t = run(q(ri(1, 6)), 7, (x, k) => ops[k].f(x));
    if (!small(t)) return null;
    return { terms: t.map(T), rule: `Operations ${ops.map(o => o.label).join(', ')}`, mode: 'mixed', level: 3,
      traps: [mk(4).f(t[5]), mk(6).f(t[5]), mk(7).f(t[5])] };
  },
  cubicdiff() {
    const c = ri(1, 4), s0 = ri(2, 8), d0 = ri(2, 12);
    const t = run(q(ri(2, 30)), 7, (x, k) => x.add(q(d0 + s0 * k + (c * k * (k - 1)) / 2)));
    return { terms: t.map(T), rule: `Second differences grow by ${c} (differences of differences: ${s0}, ${s0 + c}, ${s0 + 2 * c}, …)`, mode: 'mixed', level: 3,
      traps: [t[5].add(t[5].sub(t[4])).add(t[5].sub(t[4]).sub(t[4].sub(t[3])))] };
  },
  diffAltSign() {
    const d = ri(1, 5), r = pick([-2, -3]);
    const t = run(q(ri(5, 40)), 7, (x, k) => x.add(q(d * r ** k)));
    if (!small(t)) return null;
    return { terms: t.map(T), rule: `Differences multiply by ${r}: ${d}, ${d * r}, ${d * r * r}, …`, mode: 'mixed', level: 3,
      traps: [t[5].sub(q(d * r ** 5)), t[5].add(q(d * Math.abs(r) ** 5))] };
  },
  primesStep() {
    const sign = pick([1, -1]), q0 = ri(0, 6);
    const t = run(q(ri(5, 60)), 7, (x, k) => x.add(q(sign * PRIMES[q0 + k])));
    return { terms: t.map(T), rule: `${sign > 0 ? 'Add' : 'Subtract'} consecutive primes ${PRIMES.slice(q0, q0 + 4).join(', ')}, …`, mode: 'mixed', level: 3,
      traps: [t[5].add(q(sign * PRIMES[q0 + 6])), t[5].add(q(sign * PRIMES[q0 + 4])), t[5].add(q(sign * (PRIMES[q0 + 5] + 2)))] };
  },
  everyOtherPrime() {
    const step = pick([2, 3]), p0 = ri(2, 12);
    const t = Array.from({ length: 7 }, (_, k) => q(PRIMES[p0 + step * k]));
    return { terms: t.map(T), rule: `Every ${step === 2 ? 'other' : 'third'} prime`, mode: 'mixed', level: 3,
      traps: [q(PRIMES[p0 + step * 6 - 1]), q(PRIMES[p0 + step * 6 + 1]), q(PRIMES[p0 + step * 5 + 1])] };
  },
  primePowers() {
    const kind = pick(['sq', 'sqm1', 'twice']), k0 = ri(0, 3);
    const f = { sq: p => p * p, sqm1: p => p * p - 1, twice: p => 2 * p + 1 }[kind];
    const lbl = { sq: 'Squares of consecutive primes', sqm1: 'Squares of consecutive primes, minus 1', twice: 'Twice a prime plus 1, consecutive primes' }[kind];
    const t = Array.from({ length: 7 }, (_, k) => q(f(PRIMES[k0 + k])));
    return { terms: t.map(T), rule: lbl, mode: 'mixed', level: 3,
      traps: [q(f(PRIMES[k0 + 6] + 2)), q(f(PRIMES[k0 + 7])), t[5].add(t[5].sub(t[4]))] };
  },
  prodPrev() {
    const three = rand() < 0.4;
    const starts = three ? pick([[1, 1, 2], [1, 2, 1], [2, 1, 1], [1, 1, 3], [1, 2, 2], [2, 1, 2]]) : pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 2], [1, 4], [4, 1]]);
    const neg = rand() < 0.3;
    const st = starts.map((v, i) => q(neg && i === 0 ? -v : v));
    const t = run(st[0], 7, (x, k, s) => (k + 1 < st.length ? st[k + 1] : three ? s[k].mul(s[k - 1]).mul(s[k - 2]) : s[k].mul(s[k - 1])));
    if (!small(t, 1e6)) return null;
    return { terms: t.map(T), rule: `Each term is the product of the previous ${three ? 'three' : 'two'}`, mode: 'mixed', level: 3,
      traps: [t[5].add(t[4]), t[5].mul(t[5]), three ? t[5].mul(t[4]) : t[5].mul(t[4]).mul(t[3])] };
  },
  recurrence() {
    const recs = [
      [(a, b) => a.sub(q(1)).mul(b), 'a(n+2) = (a(n) − 1) × a(n+1)', (a, b) => a.mul(b)],
      [(a, b) => a.mul(b).sub(q(1)), 'a(n+2) = a(n) × a(n+1) − 1', (a, b) => a.mul(b)],
      [(a, b) => a.mul(b).add(q(1)), 'a(n+2) = a(n) × a(n+1) + 1', (a, b) => a.add(b).add(q(1))],
      [(a, b) => b.add(a.mul(q(2))), 'a(n+2) = a(n+1) + 2·a(n)', (a, b) => b.add(a)],
      [(a, b) => a.add(b).add(q(1)), 'a(n+2) = a(n) + a(n+1) + 1', (a, b) => a.add(b)],
      [(a, b) => b.mul(b).sub(a), 'a(n+2) = a(n+1)² − a(n)', (a, b) => b.mul(b)],
      [(a, b) => a.add(b).mul(q(2)), 'a(n+2) = 2 × (a(n) + a(n+1))', (a, b) => a.add(b)],
    ];
    const [f, lbl, wrong] = pick(recs);
    const a0 = q(ri(1, 5)), b0 = q(ri(2, 6));
    const t = safe(() => run(a0, 7, (x, k, s) => (k === 0 ? b0 : f(s[k - 1], s[k]))));
    if (!t || !small(t, 1e6) || t.slice(0, 4).some((v, i, arr) => i && v.eq(arr[i - 1]))) return null;
    return { terms: t.map(T), rule: lbl, mode: 'mixed', level: 3, traps: [wrong(t[4], t[5]), f(t[5], t[4])] };
  },
  lin2() {
    const [p, r] = pick([[3, -1], [2, 1], [3, 1], [1, 2], [2, 2], [3, -2], [1, 3]]);
    const t = run(q(ri(1, 5)), 7, (x, k, s) => (k === 0 ? q(ri(2, 7)) : s[k].mul(q(p)).add(s[k - 1].mul(q(r)))));
    if (!small(t)) return null;
    return { terms: t.map(T), rule: `a(n+2) = ${p === 1 ? '' : p}·a(n+1) ${r > 0 ? '+' : '−'} ${Math.abs(r) === 1 ? '' : Math.abs(r)}·a(n)`.replace('= ·', '= ').replace(/ ·a/, ' a'), mode: 'mixed', level: 3,
      traps: [t[5].mul(q(p)).add(t[4]), t[5].add(t[4].mul(q(r)))] };
  },
  indexDep() {
    const forms = [
      [(x, k) => x.mul(q(2)).add(q(k + 1)), 'Double, then add 1, 2, 3, …'],
      [(x, k) => x.mul(q(k + 1)).add(q(1)), 'Multiply by 1, 2, 3, …, then add 1'],
      [(x, k) => x.mul(q(k + 2)).sub(q(k + 2)), 'Multiply by 2, 3, 4, …, then subtract the same number'],
      [(x, k) => x.mul(q(2)).sub(q(k + 1)), 'Double, then subtract 1, 2, 3, …'],
      [(x, k) => x.add(q((k + 1) * (k + 1))).mul(q(1)), 'Add 1², 2², 3², …'],
      [(x, k) => x.mul(q(3)).sub(q(2 * k + 1)), 'Triple, then subtract 1, 3, 5, …'],
    ];
    const [f, lbl] = pick(forms);
    const t = run(q(ri(2, 8)), 7, f);
    if (!small(t, 1e5)) return null;
    return { terms: t.map(T), rule: lbl, mode: 'mixed', level: 3, traps: [f(t[5], 4), f(t[5], 6)] };
  },
  powMix() {
    const forms = [
      [n => 2 ** n + n, '2ⁿ + n'], [n => 2 ** n - n * n, '2ⁿ − n²'], [n => 3 ** n - 2 ** n, '3ⁿ − 2ⁿ'],
      [n => n * n + 2 ** n, 'n² + 2ⁿ'], [n => 2 ** n - n, '2ⁿ − n'], [n => n * 2 ** n, 'n × 2ⁿ'],
    ];
    const [f, lbl] = pick(forms);
    const n0 = ri(1, 4);
    const t = Array.from({ length: 7 }, (_, k) => q(f(n0 + k)));
    if (!small(t, 1e5)) return null;
    return { terms: t.map(T), rule: `Term = ${lbl} for n = ${n0}, ${n0 + 1}, …`, mode: 'mixed', level: 3,
      traps: [t[5].mul(q(2)), q(f(n0 + 7)), t[5].add(t[5].sub(t[4]))] };
  },
  interleaved() {
    const rules = [
      ['×2', x => x.mul(q(2))], ['×3', x => x.mul(q(3))], ['×3/2', x => x.mul(q(3, 2))], ['×2/3', x => x.mul(q(2, 3))],
      ['÷2', x => x.div(q(2))], ['+5', x => x.add(q(5))], ['−4', x => x.sub(q(4))], ['+7', x => x.add(q(7))],
    ];
    const [la, fa] = pick(rules), [lb, fb] = pick(rules);
    if (la === lb) return null;
    const A = run(q(ri(2, 9) * pick([4, 9, 8, 6])), 4, fa);
    const B = run(q(ri(2, 20)), 3, fb);
    const t = [A[0], B[0], A[1], B[1], A[2], B[2], A[3]];
    if (!small(t, 5000, 32)) return null;
    return { terms: t.map(T), rule: `Two interleaved sequences: 1st/3rd/5th terms ${la}, 2nd/4th/6th terms ${lb}`, mode: rand() < 0.5 ? 'mixed' : 'frac', level: 3,
      traps: [fb(B[2]), fb(A[2]), fa(A[3])] };
  },
  altProdQuot() {
    const a = q(ri(2, 6)), b = q(ri(2, 7));
    if (a.eq(b)) return null;
    const t = run(a, 7, (x, k, s) => (k === 0 ? b : k % 2 === 1 ? s[k - 1].mul(s[k]) : s[k].div(s[k - 1])));
    return { terms: t.map(T), rule: 'Alternately multiply and divide the previous two terms (a·b, then b÷a, …)', mode: 'frac', level: 3,
      traps: [t[4].mul(t[5]), t[4].div(t[5]), t[5].mul(q(1, 2))] };
  },
  fracNumDen() {
    const seqs = [
      [n => 2 * n + 1, '+2'], [n => n + 1, '+1'], [n => 3 * n + 1, '+3'],
      [n => 2 * Math.floor(n / 2) + 3, 'repeats each value twice, then +2'], [n => (n + 1) * (n + 1), 'squares'],
      [n => PRIMES[n], 'primes'], [n => 2 ** n, 'doubles'],
    ];
    const ia = ri(0, seqs.length - 1);
    let ib = ri(0, seqs.length - 1);
    if (ib === ia) ib = (ib + 1) % seqs.length;
    const [N, ln] = seqs[ia], [D, ld] = seqs[ib];
    const off = ri(0, 2), shift = ri(1, 3);
    const t = Array.from({ length: 7 }, (_, k) => raw(N(k + off), D(k + off) + shift));
    const n6 = N(6 + off), d6 = D(6 + off) + shift;
    return { terms: t, rule: `Numerators ${ln}; denominators ${ld} (shown unreduced)`, mode: 'frac', level: 3, rawAnswer: [n6, d6],
      rawTraps: [[N(5 + off), d6], [n6, D(5 + off) + shift], [n6 + 1, d6], [n6, d6 + 1]] };
  },
  fracFormula() {
    const fns = [[n => n, 'n'], [n => n + 1, 'n+1'], [n => n + 2, 'n+2'], [n => 2 * n - 1, '2n−1'], [n => 2 * n, '2n'],
      [n => 2 * n + 1, '2n+1'], [n => n * n, 'n²'], [n => 3 * n - 1, '3n−1']];
    const [f, lf] = pick(fns), [g, lg] = pick(fns);
    if (lf === lg) return null;
    const t = Array.from({ length: 7 }, (_, k) => T(q(f(k + 1), g(k + 1))));
    if (t.filter(x => x.v.d !== g(t.indexOf(x) + 1)).length < 1) return null;   // want at least one term shown reduced
    return { terms: t, rule: `Term n = (${lf})/(${lg}), shown in lowest terms`, mode: 'frac', level: 3,
      traps: [q(f(8), g(7)), q(f(7), g(8)), q(f(7) + 1, g(7))] };
  },
  fracProduct() {
    const starts = [[q(1, 2), q(2, 3)], [q(2, 3), q(3, 4)], [q(1, 2), q(3)], [q(3, 4), q(2)], [q(2), q(1, 3)], [q(3, 2), q(2, 3)], [q(1, 3), q(3, 2)]];
    const [a, b] = pick(starts);
    const t = safe(() => run(a, 7, (x, k, s) => (k === 0 ? b : s[k].mul(s[k - 1]))));
    if (!t || !small(t, 1e6, 1e6) || t.slice(1).some((v, i) => v.eq(t[i]))) return null;
    return { terms: t.map(T), rule: 'Each term is the product of the previous two', mode: 'frac', level: 3,
      traps: [t[5].add(t[4]), t[5].mul(t[5]), t[5].div(t[4])] };
  },
  numDenFib() {
    const n0 = ri(1, 5), n1 = ri(1, 6), d0 = ri(2, 9), d1 = ri(2, 9);
    const N = run(n0, 7, (x, k, s) => (k === 0 ? n1 : s[k] + s[k - 1]));
    const D = run(d0, 7, (x, k, s) => (k === 0 ? d1 : s[k] + s[k - 1]));
    const t = N.map((n, k) => raw(n, D[k]));
    return { terms: t, rule: 'Numerators and denominators each follow "sum of the previous two" (shown unreduced)', mode: 'frac', level: 3,
      rawAnswer: [N[6], D[6]], rawTraps: [[N[6], D[5]], [N[5], D[6]], [N[6] + 1, D[6]], [N[6], D[6] - 1]] };
  },
};

// ---------- ambiguity detectors (exact) ----------
// Each fits the shown terms; if it fits it returns its predicted next value, else null.
function predPoly(vs, deg) {
  const n = vs.length;
  if (n < deg + 3) return null;
  const at = x => vs.slice(0, deg + 1).reduce((s, yi, i) => {
    let term = yi;
    for (let j = 0; j <= deg; j++) if (j !== i) term = term.mul(q(x - j, i - j));
    return s.add(term);
  }, q(0));
  for (let x = deg + 1; x < n; x++) if (!at(x).eq(vs[x])) return null;
  return at(n);
}
function predGeom(vs) {
  if (vs[0].isZero) return null;
  const r = vs[1].div(vs[0]);
  if (r.eq(q(1))) return null;
  for (let k = 1; k < vs.length; k++) if (!vs[k - 1].mul(r).eq(vs[k])) return null;
  return vs[vs.length - 1].mul(r);
}
function predAffine(vs) {
  if (vs[1].eq(vs[0])) return null;
  const a = vs[2].sub(vs[1]).div(vs[1].sub(vs[0])), b = vs[1].sub(a.mul(vs[0]));
  for (let k = 1; k < vs.length; k++) if (!vs[k - 1].mul(a).add(b).eq(vs[k])) return null;
  return vs[vs.length - 1].mul(a).add(b);
}
function predLin2(vs) {
  if (vs.length < 6) return null;
  const [x0, x1, x2, x3] = vs;
  const det = x1.mul(x1).sub(x0.mul(x2));
  if (det.isZero) return null;
  const p = x2.mul(x1).sub(x0.mul(x3)).div(det), r = x1.mul(x3).sub(x2.mul(x2)).div(det);
  for (let k = 2; k < vs.length; k++) if (!vs[k - 1].mul(p).add(vs[k - 2].mul(r)).eq(vs[k])) return null;
  const n = vs.length;
  return vs[n - 1].mul(p).add(vs[n - 2].mul(r));
}
function predInterleaved(vs) {
  const half = par => vs.filter((_, k) => k % 2 === par);
  const nextOf = h => {
    if (h.length < 3) return null;
    const d = h[1].sub(h[0]);
    if (h.every((v, i) => !i || v.sub(h[i - 1]).eq(d))) return h[h.length - 1].add(d);
    if (!h[0].isZero) {
      const r = h[1].div(h[0]);
      if (h.every((v, i) => !i || h[i - 1].mul(r).eq(v))) return h[h.length - 1].mul(r);
    }
    return null;
  };
  const e = nextOf(half(0)), o = nextOf(half(1));
  if (!e || !o) return null;
  return vs.length % 2 === 0 ? e : o;
}
const DETECTORS = [vs => predPoly(vs, 1), vs => predPoly(vs, 2), vs => predPoly(vs, 3), predGeom, predAffine, predLin2, predInterleaved];
const predictions = vs => DETECTORS.map(f => safe(() => f(vs))).filter(Boolean);

// ---------- options ----------
function buildOptions(item) {
  const shown = item.terms.slice(0, -1), answer = item.terms[item.terms.length - 1];
  const anyNeg = shown.some(t => t.v.val <= 0);
  const allInt = !item.rawAnswer && answer.v.isInt && shown.every(t => t.v.isInt);
  const ok = v => v && Math.abs(v.val) <= Math.max(50, Math.abs(answer.v.val) * 4) && (anyNeg || v.val > 0)
    && (!allInt || v.isInt) && !v.eq(answer.v);
  const picked = [];
  const add = term => {
    if (!term || !ok(term.v) || picked.some(p => p.v.eq(term.v))) return;
    picked.push(term);
  };

  if (item.rawAnswer) {
    const [p, d] = item.rawAnswer;
    shuffle(item.rawTraps).forEach(([a, b]) => b > 0 && add(raw(a, b)));
    shuffle([[p + 2, d], [p, d + 2], [p - 1, d], [d, p], [p + 1, d + 1]]).forEach(([a, b]) => b > 0 && a !== 0 && add(raw(a, b)));
  } else {
    shuffle(item.traps.filter(Boolean)).forEach(v => add(T(v)));
    const a = answer.v, last = shown[shown.length - 1].v, prev = shown[shown.length - 2].v;
    const diff = last.sub(prev);
    const extra = [
      a.add(q(1)), a.sub(q(1)), a.add(q(2)), a.sub(q(2)), last.add(diff),
      safe(() => last.mul(last.div(prev))), a.mul(q(2)), safe(() => a.div(q(2))), a.add(diff.isZero ? q(3) : diff),
    ];
    if (!a.isInt) extra.push(safe(() => q(a.n + 1, a.d)), safe(() => q(a.n - 1, a.d)), safe(() => q(a.n, a.d + 1)), safe(() => q(a.d, a.n)));
    shuffle(extra.filter(Boolean)).forEach(v => add(T(v)));
  }
  if (picked.length < 4) return null;
  const opts = [answer, ...picked.slice(0, 4)];
  return opts.sort((x, y) => x.v.val - y.v.val).map(o => o.s);
}

// Opening terms of the practice-set questions the user shared: never reproduce those
const BLOCKED = ['7,14,24', '22,42,66', '7,9,18', '24,12,36', '120,20,100', '12,10,7', '2,3,3', '2,7,6', '9,8,6',
  '3,1,2', '8,4,5', '11,17,23', '17,23,22', '15,35,45', '4,3,12', '3/2,3/4,5/4', '1/2,2/3,3/5', '2/4,4/6,6/18', '4/9,2/3,6/12'];

function acceptable(item) {
  if (!item) return null;
  const shown = item.terms.slice(0, -1).map(t => t.v), answer = item.terms[item.terms.length - 1].v;
  if (BLOCKED.includes(item.terms.slice(0, 3).map(t => t.s).join(','))) return null;
  if (safe(() => predPoly(shown, 1))) return null;                  // plain constant step: too easy
  if (predictions(shown).some(p => !p.eq(answer))) return null;   // a simpler rule disagrees
  const options = buildOptions(item);
  if (!options) return null;
  return options;
}

// ---------- self-tests ----------
function selfTest() {
  let ok = true;
  const check = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); ok = ok && cond; };
  const vs = arr => arr.map(x => (Array.isArray(x) ? q(x[0], x[1]) : q(x)));
  check('fractions reduce', q(10, 4).toString() === '5/2' && q(-6, -3).toString() === '2');
  check('poly predicts quadratic', predPoly(vs([22, 42, 66, 94, 126]), 2)?.eq(q(162)));
  check('lin2 predicts tribonacci-free fib', predLin2(vs([1, 1, 2, 3, 5, 8]))?.eq(q(13)));
  check('interleaved predicts', predInterleaved(vs([3, 10, 6, 20, 12, 40]))?.eq(q(24)));
  check('cycle is not explained by simple rules', predictions(vs([7, 14, 24, 6, 12, 22])).length === 0);
  for (const fam of Object.keys(FAMILIES)) {
    let made = 0;
    for (let i = 0; i < 300 && made < 3; i++) { const it = safe(() => FAMILIES[fam]()); if (it && acceptable(it)) made++; }
    if (made < 3) { console.log(`FAIL family ${fam} rarely produces valid questions`); ok = false; }
  }
  return ok;
}

// ---------- build ----------
if (!selfTest()) process.exit(1);
if (process.argv.includes('--check')) process.exit(0);

const bank = [], seen = new Set(), count = {};
for (const fam of Object.keys(FAMILIES)) {
  count[fam] = 0;
  for (let tries = 0; count[fam] < QUOTA && tries < 5000; tries++) {
    const item = safe(() => FAMILIES[fam]());
    const options = item && acceptable(item);
    if (!options) continue;
    const shown = item.terms.slice(0, -1).map(t => t.s);
    const key = shown.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    count[fam]++;
    const rule = item.rule.replace(/(^|[\s(:,])-(\d)/g, '$1−$2');   // proper minus signs in the explanation
    bank.push([item.mode, shown, item.terms[item.terms.length - 1].s, options, rule, item.level]);
  }
}

const levels = [2, 3].map(l => bank.filter(b => b[5] === l).length);
console.log(`questions: ${bank.length}`);
console.log('by family:', count);
console.log('level 2 / 3:', levels.join(' / '));

fs.writeFileSync(new URL('../series-bank.js', import.meta.url), `// Generated by tools/build-series.mjs — do not edit by hand.
// Each question: [display ('mixed' = whole numbers with fraction parts, 'frac' = fractions),
//                 shown terms, answer, 5 options (sorted), rule, level 2–3]
// Terms are integers or "p/q". No simpler pattern fits the shown terms with a different answer.
const SERIES_BANK = [
${bank.map(b => '  ' + JSON.stringify(b)).join(',\n')},
];
`);
console.log('wrote series-bank.js');
