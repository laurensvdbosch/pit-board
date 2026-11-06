/* ===========================================================
   PIT BOARD — mental math question generator
   ---------------------------------------------------------
   question(level)    level 1 easy · 2 medium · 3 hard, mixed kinds:
                      arithmetic, decimals, percentages, fractions,
                      squares and roots, missing numbers, and (multiple
                      choice only) "which is the largest?".
   drill(cfg)         the + − × ÷ speed drill with custom ranges.
   options(q)         5 multiple-choice answers in ascending order.
   parse(str)         typed answer → number ("," or "." as decimal mark).
   Typed questions never have negative answers, because a phone's
   decimal keypad has no minus key.
   Used by math.js; tools/test-math.cjs checks every kind.
   =========================================================== */

'use strict';

const MathGen = (() => {
  const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const P = arr => arr[Math.floor(Math.random() * arr.length)];
  const fx = x => Number(Number(x).toFixed(10)) + 0;   // drop floating-point dust and −0
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const places = n => { const s = String(fx(n)); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };

  function fmt(n) {
    n = fx(n);
    return (n < 0 ? '−' : '') + String(Math.abs(n));
  }
  const fixed = (n, dp) => (n < 0 ? '−' : '') + Math.abs(n).toFixed(dp);
  const frac = (n, d) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
  const sup = (b, e) => `${b}<sup>${e}</sup>`;
  const O = s => `<i class="mo">${s}</i>`;
  const eq = expr => `${expr} ${O('=')} ?`;
  const notTen = (a, b) => { let v; do { v = R(a, b); } while (v % 10 === 0); return v; };
  // A number with exactly `dp` decimals, last digit non-zero, between lo and hi
  const dec = (lo, hi, dp) => { const m = 10 ** dp; let v; do { v = R(Math.round(lo * m), Math.round(hi * m)); } while (v % 10 === 0); return v / m; };
  // A fraction n/d in lowest terms, 0 < n/d < 1
  const properFrac = d => { let n; do { n = R(1, d - 1); } while (gcd(n, d) !== 1); return n; };

  // Each generator returns { kind, html, answer, dist?: [likely wrong answers], choices?: [html], mcOnly? }
  const KINDS = {
    1: {
      add() { const a = R(11, 99), b = R(11, 99); return { kind: 'add', html: eq(`${a} ${O('+')} ${b}`), answer: a + b, dist: [a + b + 10, a + b - 10, a + b + 1, a + b - 1] }; },
      sub() { const a = R(31, 160), b = R(11, a - 6); return { kind: 'sub', html: eq(`${a} ${O('−')} ${b}`), answer: a - b, dist: [a - b + 10, a - b - 10, a - b + 2] }; },
      mul() { const a = R(3, 12), b = R(3, 12); return { kind: 'mul', html: eq(`${a} ${O('×')} ${b}`), answer: a * b, dist: [a * b + a, a * b - a, a * b + b, a * b - b] }; },
      div() { const b = R(3, 12), q = R(3, 12); return { kind: 'div', html: eq(`${b * q} ${O('÷')} ${b}`), answer: q, dist: [q + 1, q - 1, q + 2] }; },
      pct() {
        const p = P([10, 50, 25, 20]);
        const x = p === 10 ? R(3, 99) * 10 : p === 50 ? R(6, 99) * 2 : p === 25 ? R(3, 40) * 4 : R(3, 40) * 5;
        const a = x * p / 100;
        return { kind: 'pct', html: `${p}% of ${x}`, answer: a, dist: [a * 2, a / 2, a + 10, x / 10] };
      },
      decAdd() { const a = dec(1, 9.9, 1), b = dec(1, 9.9, 1); return { kind: 'decAdd', html: eq(`${a} ${O('+')} ${b}`), answer: fx(a + b), dist: [fx(a + b + 1), fx(a + b - 1), fx(a + b - 0.1)] }; },
      double() { const a = R(26, 499); return { kind: 'double', html: eq(`2 ${O('×')} ${a}`), answer: 2 * a, dist: [2 * a + 10, 2 * a - 10, 2 * a + 100] }; },
    },
    2: {
      add() { const a = R(120, 899), b = R(120, 899); return { kind: 'add3', html: eq(`${a} ${O('+')} ${b}`), answer: a + b, dist: [a + b + 10, a + b - 10, a + b + 100, a + b - 100, a + b + 80] }; },
      sub() { const a = R(320, 999), b = R(110, a - 40); return { kind: 'sub3', html: eq(`${a} ${O('−')} ${b}`), answer: a - b, dist: [a - b + 10, a - b - 10, a - b + 100, a - b - 100] }; },
      mul21() { const a = notTen(13, 99), b = R(3, 9); return { kind: 'mul21', html: eq(`${a} ${O('×')} ${b}`), answer: a * b, dist: [a * b + b, a * b - b, a * b + 10, a * b - 10, a * b + 20] }; },
      teens() { const a = R(11, 19), b = R(11, 19); return { kind: 'teens', html: eq(`${a} ${O('×')} ${b}`), answer: a * b, dist: [a * b + 10, a * b - 10, a * b + a, a * b - b] }; },
      square() { const n = notTen(11, 25); return { kind: 'square', html: eq(sup(n, 2)), answer: n * n, dist: [(n + 1) ** 2, (n - 1) ** 2, n * n + 10, n * n - 10] }; },
      div() { const d = R(3, 9), q = R(12, 45); return { kind: 'div2', html: eq(`${d * q} ${O('÷')} ${d}`), answer: q, dist: [q + 1, q - 1, q + 10, q - 10] }; },
      pct() {
        const p = P([5, 15, 20, 30, 40, 60, 75, 50]);
        let x;
        if (p === 50) x = R(21, 199);                       // may give a .5, like 50% of 51
        else { const step = 100 / gcd(p, 100); x = step * R(Math.ceil(20 / step), Math.floor(400 / step)); }
        const a = fx(x * p / 100);
        return { kind: 'pct2', html: `${p}% of ${x}`, answer: a, dist: [fx(a * 10), fx(a + 5), fx(a - 5), fx(a + 1), fx(x * (100 - p) / 100)] };
      },
      whatPct() {
        const p = P([10, 20, 25, 40, 60, 75, 80, 120, 150]);
        const y = 20 * R(2, 12);
        const x = y * p / 100;
        return { kind: 'whatPct', html: `${x} is what % of ${y}?`, answer: p, dist: [p + 5, p - 5, p + 10, p - 10, Math.round(100 * y / x)] };
      },
      decAdd() { const a = dec(2, 40, 2), b = dec(1, 30, 1); return { kind: 'decAdd2', html: eq(`${fixed(a, 2)} ${O('+')} ${b}`), answer: fx(a + b), dist: [fx(a + b + 1), fx(a + b - 1), fx(a + b + 0.1), fx(a + b - 0.1)] }; },
      decMul() {
        const m = P([0.5, 0.25, 1.5, 2.5, 0.2, 0.4, 0.75, 1.2]);
        const b = R(4, 60);
        const a = fx(m * b);
        return { kind: 'decMul1', html: eq(`${m} ${O('×')} ${b}`), answer: a, dist: [fx(a * 10), fx(a / 10), fx(a + m), fx(a - m), fx(a + 1)] };
      },
      fracOf() { const d = P([3, 4, 5, 6, 8]), n = properFrac(d), x = d * R(3, 15); return { kind: 'fracOf', html: `${frac(n, d)} of ${x}`, answer: x * n / d, dist: [x / d, x * n / d + n, x * n / d - n, x * (d - n) / d] }; },
      fracDec() { const d = P([4, 5, 8, 20, 25]), n = properFrac(d); return { kind: 'fracDec', html: `${frac(n, d)} as a decimal`, answer: fx(n / d), dist: [fx(n / d + 0.1), fx(n / d - 0.05), fx(d / 100 * n / 10), fx(n / d * 10)] }; },
      missing() {
        for (;;) {
          const ans = R(3, 30), c = R(2, 9), prod = c * ans;
          const as = [2, 3, 4, 5, 6, 8, 9, 12].filter(a => a !== c && prod % a === 0 && prod / a >= 4 && prod / a !== ans);
          if (!as.length) continue;
          const a = P(as);
          return { kind: 'missing', html: `${a} ${O('×')} ${prod / a} ${O('=')} ${c} ${O('×')} ?`, answer: ans, dist: [ans + 1, ans - 1, ans * 2, ans + c] };
        }
      },
    },
    3: {
      add() { const a = R(1200, 9899), b = P([R(105, 999), R(1050, 8999)]); return { kind: 'add4', html: eq(`${a} ${O('+')} ${b}`), answer: a + b, dist: [a + b + 10, a + b - 10, a + b + 100, a + b - 100, a + b + 1000, a + b + 90] }; },
      sub() { const a = R(2100, 9999), b = P([R(105, 999), R(1050, a - 300)]); return { kind: 'sub4', html: eq(`${a} ${O('−')} ${b}`), answer: a - b, dist: [a - b + 10, a - b - 10, a - b + 100, a - b - 100, a - b + 1000] }; },
      mul22() { const a = notTen(21, 99), b = notTen(13, 99); return { kind: 'mul22', html: eq(`${a} ${O('×')} ${b}`), answer: a * b, dist: [a * b + 10, a * b - 10, a * b + 100, a * b - 100, a * b + a, a * b - b] }; },
      mul31() { const a = notTen(112, 989), b = R(3, 9); return { kind: 'mul31', html: eq(`${a} ${O('×')} ${b}`), answer: a * b, dist: [a * b + 10, a * b - 10, a * b + 100, a * b - 100, a * b + b] }; },
      square() { const n = notTen(26, 99); return { kind: 'square2', html: eq(sup(n, 2)), answer: n * n, dist: [n * n + 10, n * n - 10, n * n + 100, n * n - 100, (n + 1) ** 2, (n - 1) ** 2] }; },
      root() { const n = notTen(13, 99); return { kind: 'root', html: eq(`√${n * n}`), answer: n, dist: [n + 1, n - 1, n + 2, n - 2, n + 10] }; },
      decMul() {
        const a = notTen(11, 99) / 10, b = notTen(11, 99) / 10;
        const v = fx(a * b);
        return { kind: 'decMul', html: eq(`${a} ${O('×')} ${b}`), answer: v, dist: [fx(v + 0.8), fx(v - 0.8), fx(v + 1), fx(v - 1), fx(v * 10), fx(v + 0.4)] };
      },
      pctSmall() {
        const p = P([0.2, 0.4, 0.5, 0.8, 1.5, 2.5, 12.5, 0.25, 7.5]);
        const x = R(12, 99);
        const v = fx(p * x / 100);
        return { kind: 'pctSmall', html: `${p}% of ${x}`, answer: v, dist: [fx(v * 10), fx(v * 100), fx(v / 10), fx(v + p / 100)] };
      },
      fracMinusDec() {
        const d = P([4, 5, 8, 10, 20, 25]);
        const n = R(1, d - 1);
        const e = R(5, 95) / 100;
        const v = fx(n / d + e);
        // n/d − −e  (subtracting a negative), shown the way online tests print it
        return { kind: 'fracMinusDec', html: eq(`${frac(n, d)} ${O('−')} −${e.toFixed(2)}`), answer: v, dist: [fx(Math.abs(n / d - e)), fx(v + 0.1), fx(v - 0.1), fx(v + 1)] };
      },
      missing() {
        for (;;) {
          const ans = R(12, 60), c = R(6, 24), prod = c * ans;
          const as = [2, 3, 4, 5, 6, 7, 8, 9].filter(a => a !== c && prod % a === 0 && prod / a >= 60);
          if (!as.length) continue;
          const a = P(as);
          return { kind: 'missing2', html: `${a} ${O('×')} ${prod / a} ${O('=')} ${c} ${O('×')} ?`, answer: ans, dist: [ans + 1, ans - 1, ans + 2, ans * 2, ans + 10] };
        }
      },
      divDec() {
        const b = P([0.2, 0.4, 0.5, 0.25, 0.08, 0.05, 0.3, 0.6, 0.04, 0.12]);
        const q = R(3, 99);
        const a = fx(q * b);
        return { kind: 'divDec', html: eq(`${a} ${O('÷')} ${b}`), answer: q, dist: [fx(q * 10), fx(q / 10), q + 1, q - 1] };
      },
      fracMul() {
        let d1, d2, n1, n2, v;
        do {   // at most 4 decimals
          d1 = P([2, 4, 5, 8]); d2 = P([4, 5, 10]);
          n1 = properFrac(d1); n2 = properFrac(d2);
          v = fx(n1 * n2 / (d1 * d2));
        } while (places(v) > 4);
        return { kind: 'fracMul', html: eq(`${frac(n1, d1)} ${O('×')} ${frac(n2, d2)}`), answer: v, dist: [fx(v * 10), fx(v + 0.1), fx(n1 / d1 + n2 / d2), fx(v + 0.05)] };
      },
      pctChange() {
        const old = P([20, 25, 40, 50, 80, 125, 160, 200, 250, 400]);
        const ps = [5, 10, 15, 20, 25, 30, 40, 60, 75, 12.5, 35].filter(p => Number.isInteger(old * p / 100));
        const p = P(ps);
        const nw = old + old * p / 100;
        return { kind: 'pctChange', html: `${old} → ${nw}: % increase?`, answer: p, dist: [fx(nw - old), fx(Math.round(1000 * (nw - old) / nw) / 10), p + 5, p - 5] };
      },
      largest() {
        // Powers that sit close together: compare exponents without a calculator
        if (Math.random() < 0.55) {
          for (;;) {
            const target = R(1500, 60000);
            const pool = [];
            for (let a = 2; a <= 9; a++) for (let b = 2; b <= 16; b++) {
              const v = a ** b;
              if (v > target * 0.45 && v < target * 1.6) pool.push({ html: sup(a, b), v });
            }
            const picked = [];
            for (const c of shuffleArr(pool)) if (picked.every(p => Math.abs(p.v - c.v) / Math.max(p.v, c.v) > 0.03)) picked.push(c);
            if (picked.length < 4) continue;
            const four = picked.slice(0, 4);
            const max = Math.max(...four.map(c => c.v));
            // One plain number as a decoy, clearly below the top
            const decoy = { html: String(Math.round(max * (0.2 + Math.random() * 0.6) / 10) * 10 + R(1, 9)), v: 0 };
            decoy.v = Number(decoy.html);
            const all = shuffleArr([...four, decoy]);
            return { kind: 'largestPow', html: 'Which is the largest?', mcOnly: true, choices: all.map(c => c.html), answerIndex: all.findIndex(c => c.v === max), answer: max };
          }
        }
        // Fractions vs decimals
        for (;;) {
          const vals = [];
          const items = [];
          while (items.length < 5) {
            let v, html;
            if (Math.random() < 0.55) { const d = R(3, 13), n = properFrac(d); v = n / d; html = frac(n, d); }
            else { v = R(30, 95) / 100; html = v.toFixed(R(0, 1) ? 2 : 1); v = Number(html); }
            if (vals.some(w => Math.abs(w - v) < 0.012)) continue;
            vals.push(v); items.push({ html, v });
          }
          const max = Math.max(...vals);
          const second = Math.max(...vals.filter(v => v !== max));
          if (max - second > 0.08) continue;   // keep it close
          return { kind: 'largestFrac', html: 'Which is the largest?', mcOnly: true, choices: items.map(c => c.html), answerIndex: items.findIndex(c => c.v === max), answer: max };
        }
      },
    },
  };

  function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Avoid the same kind twice in a row and the exact same question within a session
  function question(level, opts = {}) {
    const typed = Boolean(opts.typed);
    const recent = opts.recent || [];
    const seen = opts.seen || new Set();
    const names = Object.keys(KINDS[level]).filter(k => !(typed && k === 'largest'));
    for (let tries = 0; ; tries++) {
      const name = P(names);
      if (tries < 30 && recent.slice(-2).includes(`${level}.${name}`)) continue;
      const q = KINDS[level][name]();
      if (tries < 60 && seen.has(q.html + (q.choices || []).join())) continue;
      seen.add(q.html + (q.choices || []).join());
      recent.push(`${level}.${name}`);
      q.level = level;
      return q;
    }
  }

  // -------------------- MULTIPLE CHOICE --------------------
  // 5 options, ascending. Distractors keep the answer's last digit where they
  // can, so you have to actually work it out.
  function options(q) {
    if (q.choices) return { list: q.choices, answerIndex: q.answerIndex };
    const A = fx(q.answer);
    const dp = places(A);
    const ok = v => Number.isFinite(v) && v !== A && (A < 0 || v >= 0) && !(A > 0 && v === 0) && places(v) <= Math.max(4, dp);
    // Candidates by priority: typical mistakes first, then near misses that keep the last digit
    const pool = new Map();
    const fine = dp ? 10 ** -dp : 1;
    const add = (v, pri) => {
      v = fx(v);
      // Near misses stay near: no 5.4 next to 0.4
      if (pri && Math.abs(v - A) > 0.6 * Math.abs(A) && Math.abs(v - A) > 2 * fine) return;
      if (ok(v) && !pool.has(fmt(v))) pool.set(fmt(v), { v, pri });
    };
    (q.dist || []).forEach(v => add(v, 0));
    // Decimals: step one place above the last digit (57.2 → 56.2, 58.2); integers: tens from 50 up
    const step = dp ? 10 ** (1 - dp) : Math.abs(A) >= 50 ? 10 : 1;
    for (let k = 1; k <= 5; k++) { add(A + k * step, 1); add(A - k * step, 1); }
    for (let k = 1; k <= 4; k++) { add(A + k * fine, 2); add(A - k * fine, 2); }
    const ranked = side => shuffleArr([...pool.values()].filter(side)).sort((a, b) => a.pri - b.pri).map(c => c.v);
    const below = ranked(c => c.v < A), above = ranked(c => c.v > A);
    // Pick where the answer sits first, so it isn't always in the middle
    let nb = Math.min(R(0, 4), below.length);
    let na = 4 - nb;
    if (na > above.length) { na = above.length; nb = Math.min(4 - na, below.length); }
    const values = [...below.slice(0, nb), A, ...above.slice(0, na)].sort((a, b) => a - b);
    return { list: values.map(fmt), answerIndex: values.indexOf(A) };
  }

  // -------------------- SPEED DRILL --------------------
  const DRILL_STANDARD = { add: true, sub: true, mul: true, div: true, addA: [2, 100], addB: [2, 100], mulA: [2, 12], mulB: [2, 100], secs: 120 };
  function drill(cfg, last) {
    const ops = ['add', 'sub', 'mul', 'div'].filter(o => cfg[o]);
    for (let tries = 0; ; tries++) {
      const op = P(ops);
      let html, answer;
      if (op === 'add' || op === 'sub') {
        const a = R(cfg.addA[0], cfg.addA[1]), b = R(cfg.addB[0], cfg.addB[1]);
        if (op === 'add') { html = `${a} ${O('+')} ${b}`; answer = a + b; }
        else { html = `${a + b} ${O('−')} ${a}`; answer = b; }
      } else {
        const a = R(cfg.mulA[0], cfg.mulA[1]), b = R(cfg.mulB[0], cfg.mulB[1]);
        if (op === 'mul') { html = `${a} ${O('×')} ${b}`; answer = a * b; }
        else if (a === 0) continue;
        else { html = `${a * b} ${O('÷')} ${a}`; answer = b; }
      }
      html = `${html} ${O('=')}`;
      if (last && last.html === html && tries < 20) continue;   // tiny custom ranges may have to repeat
      return { op, html, answer };
    }
  }

  // -------------------- TYPED ANSWERS --------------------
  function parse(str) {
    const s = String(str).trim().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(',', '.');
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }
  const same = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

  return { question, options, drill, parse, same, fmt, DRILL_STANDARD, KINDS };
})();

if (typeof module !== 'undefined') module.exports = MathGen;
