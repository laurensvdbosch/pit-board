/* ===========================================================
   PIT BOARD — Probability Paper question bank
   ---------------------------------------------------------
   Parametric templates: each draws fresh numbers and computes the exact
   answer. Every template also carries sim(u), an independent simulation
   of the same question; tools/test-odds.cjs compares the two.
   Options are "select the closest": a grid, a tight cluster with two
   outliers, or a doubling ladder.
   =========================================================== */

'use strict';

const PaperBank = (() => {
  let rnd = Math.random;
  const R = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
  const P = arr => arr[Math.floor(rnd() * arr.length)];
  const shuffled = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // -------------------- MATHS --------------------
  const logF = []; { let s = 0; for (let i = 0; i <= 1200; i++) { if (i) s += Math.log(i); logF[i] = s; } }
  const C = (n, k) => (k < 0 || k > n ? 0 : Math.round(Math.exp(logF[n] - logF[k] - logF[n - k]) * 1e6) / 1e6);
  const Cx = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= Math.min(k, n - k); i++) r = (r * (n - i + 1)) / i; return r; };
  const binom = (n, k, p) => (k < 0 || k > n ? 0 : Math.exp(logF[n] - logF[k] - logF[n - k] + (k ? k * Math.log(p) : 0) + (n - k ? (n - k) * Math.log(1 - p) : 0)));
  const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const sum = arr => arr.reduce((s, v) => s + v, 0);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  function convolve(a, b) {
    const out = new Map();
    a.forEach((pa, x) => b.forEach((pb, y) => out.set(x + y, (out.get(x + y) || 0) + pa * pb)));
    return out;
  }
  const uniform = (lo, hi) => new Map(range(lo, hi).map(v => [v, 1 / (hi - lo + 1)]));
  function sumDist(n, lo, hi) { let d = uniform(lo, hi); for (let i = 1; i < n; i++) d = convolve(d, uniform(lo, hi)); return d; }

  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }

  // Expected fair-coin flips until `pat` appears
  function waitFor(pat) {
    const next = (s, c) => { let t = pat.slice(0, s) + c; while (t && !pat.startsWith(t)) t = t.slice(1); return t.length; };
    const m = pat.length, A = [], b = [];
    for (let s = 0; s < m; s++) {
      const row = Array(m).fill(0); row[s] += 1;
      for (const c of 'HT') { const t = next(s, c); if (t < m) row[t] -= 0.5; }
      A.push(row); b.push(1);
    }
    return solve(A, b)[0];
  }
  // P(pattern a appears before pattern b), same length
  function race(a, b) {
    const L = a.length, states = [''];
    for (let i = 0; i < states.length; i++) for (const c of 'HT') {
      const t = (states[i] + c).slice(-(L - 1));
      const full = (states[i] + c).slice(-L);
      if (full !== a && full !== b && !states.includes(t)) states.push(t);
    }
    const idx = new Map(states.map((s, i) => [s, i]));
    const A = [], B = [];
    states.forEach((s, i) => {
      const row = Array(states.length).fill(0); row[i] = 1; let rhs = 0;
      for (const c of 'HT') {
        const full = (s + c).slice(-L);
        if (full === a) rhs += 0.5; else if (full === b) continue; else row[idx.get((s + c).slice(-(L - 1)))] -= 0.5;
      }
      A.push(row); B.push(rhs);
    });
    return solve(A, B)[0];
  }

  // Sim helpers (u is the simulation's own random source)
  const D = (u, s) => 1 + Math.floor(u() * s);
  const flip = u => u() < 0.5;
  function pickK(u, n, k) { const a = range(0, n - 1); for (let i = 0; i < k; i++) { const j = i + Math.floor(u() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); }
  const rankOf = c => c % 13, suitOf = c => Math.floor(c / 13);   // rank 0 = ace … 12 = king; suit 0 = hearts
  const isRed = c => suitOf(c) < 2;
  const ord = n => { const v = n % 100, s = ['th', 'st', 'nd', 'rd']; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  // -------------------- TEMPLATES --------------------
  const T = [];
  const add = (level, id, gen) => T.push({ level, id, gen });
  const Q = (text, value, kind, how, sim, extra) => ({ text, value, kind, how, sim, ...extra });

  // ================== EASY ==================
  add(1, 'sum2', () => { const s = R(3, 11), w = 6 - Math.abs(7 - s); return Q(`Two fair dice are rolled. What is the probability that the sum is ${s}?`, w / 36, 'p', `${w} of the 36 outcomes add to ${s}.`, u => +(D(u, 6) + D(u, 6) === s)); });
  add(1, 'sum2ge', () => { const k = R(5, 11); let w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= k) w++; return Q(`Two fair dice are rolled. What is the probability that the sum is at least ${k}?`, w / 36, 'p', `Count the outcomes: ${w} of 36.`, u => +(D(u, 6) + D(u, 6) >= k)); });
  add(1, 'atLeastFace', () => { const n = R(2, 5), f = R(1, 6); return Q(`A fair die is rolled ${n} times. What is the probability of seeing at least one ${f}?`, 1 - (5 / 6) ** n, 'p', `Complement: 1 − (5/6)^${n}.`, u => { for (let i = 0; i < n; i++) if (D(u, 6) === f) return 1; return 0; }); });
  add(1, 'prodEven', () => { const odd = rnd() < 0.5; return Q(`Two fair dice are rolled. What is the probability that their product is ${odd ? 'odd' : 'even'}?`, odd ? 0.25 : 0.75, 'p', `Odd needs both odd: (1/2)² = 1/4.`, u => { const v = (D(u, 6) * D(u, 6)) % 2; return odd ? v : 1 - v; }); });
  add(1, 'doubles', () => { const s = P([4, 6, 8, 10, 12, 20]); return Q(`Two fair ${s}-sided dice are rolled. What is the probability that they show the same number?`, 1 / s, 'p', `Whatever the first shows, the second matches with chance 1/${s}.`, u => +(D(u, s) === D(u, s))); });
  add(1, 'dieGt', () => { const s = P([6, 8, 10, 12, 20]), k = R(2, s - 2); return Q(`A fair ${s}-sided die is rolled. What is the probability of rolling more than ${k}?`, (s - k) / s, 'p', `${s - k} of the ${s} faces are above ${k}.`, u => +(D(u, s) > k)); });
  add(1, 'exactHeads', () => { const n = R(3, 8), k = R(1, n - 1); return Q(`A fair coin is flipped ${n} times. What is the probability of exactly ${k} heads?`, Cx(n, k) / 2 ** n, 'p', `C(${n},${k}) ÷ 2^${n} = ${Cx(n, k)}/${2 ** n}.`, u => { let h = 0; for (let i = 0; i < n; i++) if (flip(u)) h++; return +(h === k); }); });
  add(1, 'atLeastHead', () => { const n = R(2, 6); return Q(`A fair coin is flipped ${n} times. What is the probability of at least one head?`, 1 - 0.5 ** n, 'p', `1 − (1/2)^${n}.`, u => { for (let i = 0; i < n; i++) if (flip(u)) return 1; return 0; }); });
  add(1, 'atLeastK', () => { const n = R(4, 8), k = R(2, n - 1); const v = sum(range(k, n).map(i => Cx(n, i))) / 2 ** n; return Q(`A fair coin is flipped ${n} times. What is the probability of at least ${k} heads?`, v, 'p', `Add C(${n},i) for i = ${k} to ${n}, divide by 2^${n}.`, u => { let h = 0; for (let i = 0; i < n; i++) if (flip(u)) h++; return +(h >= k); }); });
  const CARD_SETS = [
    ['a heart or a king', c => suitOf(c) === 0 || rankOf(c) === 12, 16], ['a red card or an ace', c => isRed(c) || rankOf(c) === 0, 28],
    ['a face card (J, Q, K)', c => rankOf(c) >= 10, 12], ['a spade or a face card', c => suitOf(c) === 3 || rankOf(c) >= 10, 22],
    ['neither a heart nor an ace', c => suitOf(c) !== 0 && rankOf(c) !== 0, 36], ['a black 7', c => !isRed(c) && rankOf(c) === 6, 2],
  ];
  add(1, 'cardSet', () => { const [name, f, w] = P(CARD_SETS); return Q(`One card is drawn from a standard 52-card deck. What is the probability that it is ${name}?`, w / 52, 'p', `Count without double-counting: ${w} of 52 cards.`, u => +f(pickK(u, 52, 1)[0])); });
  add(1, 'twoCards', () => {
    const v = P([['both aces', 4, 3, c => rankOf(c) === 0], ['both hearts', 13, 12, c => suitOf(c) === 0], ['both red', 26, 25, isRed], ['both face cards', 12, 11, c => rankOf(c) >= 10]]);
    return Q(`Two cards are drawn without replacement from a standard deck. What is the probability that they are ${v[0]}?`, (v[1] * v[2]) / (52 * 51), 'p', `(${v[1]}/52) × (${v[2]}/51).`, u => +pickK(u, 52, 2).every(v[3]));
  });
  add(1, 'twoSame', () => { const rank = rnd() < 0.5; return Q(`Two cards are drawn without replacement from a standard deck. What is the probability that they have the same ${rank ? 'rank' : 'suit'}?`, rank ? 3 / 51 : 12 / 51, 'p', `The second must match the first: ${rank ? 3 : 12} of the remaining 51.`, u => { const [a, b] = pickK(u, 52, 2); return +(rank ? rankOf(a) === rankOf(b) : suitOf(a) === suitOf(b)); }); });
  add(1, 'urn2', () => { const r = R(3, 9), b = R(2, 9), n = r + b; return Q(`An urn holds ${r} red and ${b} blue balls. Two are drawn without replacement. What is the probability that both are red?`, (r * (r - 1)) / (n * (n - 1)), 'p', `(${r}/${n}) × (${r - 1}/${n - 1}).`, u => +pickK(u, n, 2).every(i => i < r)); });
  add(1, 'urnMixed', () => { const r = R(3, 9), b = R(2, 9), n = r + b; return Q(`An urn holds ${r} red and ${b} blue balls. Two are drawn without replacement. What is the probability of one of each colour?`, (2 * r * b) / (n * (n - 1)), 'p', `2 × (${r}/${n}) × (${b}/${n - 1}).`, u => { const [x, y] = pickK(u, n, 2); return +((x < r) !== (y < r)); }); });
  add(1, 'urnReplace', () => { const r = R(2, 7), b = R(2, 7), k = R(2, 4), n = r + b; return Q(`An urn holds ${r} red and ${b} blue balls. You draw ${k} times with replacement. What is the probability that every draw is red?`, (r / n) ** k, 'p', `(${r}/${n})^${k}.`, u => { for (let i = 0; i < k; i++) if (u() * n >= r) return 0; return 1; }); });
  add(1, 'evPayDie', () => { const c = R(1, 4); return Q(`Roll a fair die. If it is even you win the face value in dollars; if odd you lose $${c}. What is the expected value of the game?`, (2 + 4 + 6) / 6 - c / 2, 'ev', `(2 + 4 + 6)/6 − ${c}/2.`, u => { const d = D(u, 6); return d % 2 ? -c : d; }, { signed: true }); });
  add(1, 'evSum', () => { const n = R(2, 8), s = P([4, 6, 8, 10, 12]); return Q(`What is the expected value of the sum of ${n} fair ${s}-sided dice?`, (n * (s + 1)) / 2, 'ev', `Linearity: ${n} × ${(s + 1) / 2}.`, u => { let t = 0; for (let i = 0; i < n; i++) t += D(u, s); return t; }); });
  add(1, 'evProd', () => { const s = P([4, 6, 8, 10]); return Q(`Two fair ${s}-sided dice are rolled independently. What is the expected value of their product?`, ((s + 1) / 2) ** 2, 'ev', `Independent, so E[X]·E[Y] = ${(s + 1) / 2}².`, u => D(u, s) * D(u, s)); });
  add(1, 'evMax2', () => { const min = rnd() < 0.5, s = P([4, 6, 8]); let t = 0; for (let a = 1; a <= s; a++) for (let b = 1; b <= s; b++) t += min ? Math.min(a, b) : Math.max(a, b); return Q(`Two fair ${s}-sided dice are rolled. What is the expected value of the ${min ? 'smaller' : 'larger'} number?`, t / s ** 2, 'ev', `Sum over all ${s ** 2} outcomes, divide by ${s ** 2}.`, u => { const a = D(u, s), b = D(u, s); return min ? Math.min(a, b) : Math.max(a, b); }); });
  add(1, 'geom', () => { const s = P([2, 3, 4, 5, 6, 8, 10, 12, 20]); return Q(`You roll a fair ${s}-sided die until the first ${s}. On average, how many rolls does it take?`, s, 'ev', `Geometric with p = 1/${s}, mean ${s}.`, u => { let n = 1; while (D(u, s) !== s) n++; return n; }); });
  add(1, 'evHeads', () => { const n = R(5, 40), p = P([0.2, 0.25, 0.3, 0.4, 0.6, 0.7, 0.75]); return Q(`A coin lands heads with probability ${p}. It is flipped ${n} times. What is the expected number of heads?`, n * p, 'ev', `${n} × ${p}.`, u => { let h = 0; for (let i = 0; i < n; i++) if (u() < p) h++; return h; }); });
  add(1, 'divOr', () => { const N = P([100, 200, 500, 1000]), [a, b] = P([[2, 3], [3, 5], [4, 6], [5, 7], [2, 5], [6, 8]]); let w = 0; for (let i = 1; i <= N; i++) if (i % a === 0 || i % b === 0) w++; return Q(`An integer is chosen uniformly from 1 to ${N}. What is the probability it is divisible by ${a} or ${b}?`, w / N, 'p', `Inclusion-exclusion: ${w} of ${N}.`, u => { const i = D(u, N); return +(i % a === 0 || i % b === 0); }); });
  add(1, 'divNot', () => { const N = P([60, 120, 300, 600]), [a, b] = P([[2, 3], [3, 4], [3, 5], [2, 7]]); let w = 0; for (let i = 1; i <= N; i++) if (i % a === 0 && i % b !== 0) w++; return Q(`An integer is chosen uniformly from 1 to ${N}. What is the probability it is divisible by ${a} but not by ${b}?`, w / N, 'p', `${w} of ${N}.`, u => { const i = D(u, N); return +(i % a === 0 && i % b !== 0); }); });
  add(1, 'square', () => { const N = P([50, 100, 200, 500, 1000]); return Q(`An integer is chosen uniformly from 1 to ${N}. What is the probability it is a perfect square?`, Math.floor(Math.sqrt(N)) / N, 'p', `${Math.floor(Math.sqrt(N))} squares up to ${N}.`, u => { const i = D(u, N), r = Math.round(Math.sqrt(i)); return +(r * r === i); }); });
  add(1, 'allDiffCats', () => { const m = P([7, 12]), n = R(2, 4); let v = 1; for (let i = 0; i < n; i++) v *= (m - i) / m; const w = m === 7 ? 'day of the week' : 'month'; return Q(`${n} people are each equally likely to be born in any ${w}. What is the probability that no two share the same ${w}?`, v, 'p', `(${m}/${m})(${m - 1}/${m})… for ${n} people.`, u => { const s = new Set(); for (let i = 0; i < n; i++) s.add(D(u, m)); return +(s.size === n); }); });
  add(1, 'adjacent', () => { const n = R(4, 10); return Q(`${n} people line up in random order. What is the probability that two particular people stand next to each other?`, 2 / n, 'p', `${n - 1} adjacent slots × 2 orders × ${n - 2}! ÷ ${n}! = 2/${n}.`, u => { const p = pickK(u, n, n); return +(Math.abs(p.indexOf(0) - p.indexOf(1)) === 1); }); });
  add(1, 'committee', () => { const w = R(4, 8), m = R(4, 8), k = 3, n = w + m; return Q(`A committee of ${k} is chosen at random from ${w} women and ${m} men. What is the probability that all ${k} are women?`, Cx(w, k) / Cx(n, k), 'p', `C(${w},${k}) ÷ C(${n},${k}).`, u => +pickK(u, n, k).every(i => i < w)); });
  add(1, 'indep', () => { const a = R(2, 8) / 10, b = R(2, 8) / 10, one = rnd() < 0.5; return Q(`Independent events A and B have probabilities ${a} and ${b}. What is the probability that ${one ? 'exactly one' : 'at least one'} occurs?`, one ? a * (1 - b) + b * (1 - a) : 1 - (1 - a) * (1 - b), 'p', one ? `a(1−b) + b(1−a).` : `1 − (1−a)(1−b).`, u => { const x = u() < a, y = u() < b; return +(one ? x !== y : x || y); }); });
  add(1, 'condDice', () => { const k = R(8, 11); let all = 0, six = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= k) { all++; if (a === 6) six++; } return Q(`Two fair dice are rolled and the sum is at least ${k}. What is the probability that the first die shows a 6?`, six / all, 'p', `Restrict to the ${all} outcomes with sum ≥ ${k}: ${six} have a first-die 6.`, u => { for (;;) { const a = D(u, 6), b = D(u, 6); if (a + b >= k) return +(a === 6); } }); });
  add(1, 'netGame', () => { const m = R(2, 3), c = R(5, 10); return Q(`You pay $${c} to roll a fair die and receive ${m} times the face value in dollars. What is your expected profit?`, 3.5 * m - c, 'ev', `${m} × 3.5 − ${c}.`, u => m * D(u, 6) - c, { signed: true }); });
  add(1, 'aces', () => { const k = R(3, 13); return Q(`You are dealt ${k} cards from a standard deck. What is the expected number of aces?`, k / 13, 'ev', `Linearity: ${k} × 4/52.`, u => pickK(u, 52, k).filter(c => rankOf(c) === 0).length); });
  add(1, 'diffD', () => { const d = R(0, 4), w = d ? 2 * (6 - d) : 6; return Q(`Two fair dice are rolled. What is the probability that they differ by exactly ${d}?`, w / 36, 'p', `${w} of the 36 outcomes.`, u => +(Math.abs(D(u, 6) - D(u, 6)) === d)); });
  add(1, 'noZero', () => { const v = P([['contains no 0', 9 * 9 * 9, n => !String(n).includes('0')], ['has only odd digits', 125, n => [...String(n)].every(c => +c % 2)], ['has all digits equal', 9, n => new Set(String(n)).size === 1]]); return Q(`A three-digit number (100 to 999) is chosen uniformly. What is the probability that it ${v[0]}?`, v[1] / 900, 'p', `${v[1]} of the 900 numbers.`, u => +v[2](99 + D(u, 900))); });
  add(1, 'second', () => { const s = P([6, 8, 10, 12]); return Q(`A fair ${s}-sided die is rolled twice. What is the probability that the second roll is higher than the first?`, (1 - 1 / s) / 2, 'p', `Not equal has chance ${s - 1}/${s}; half of that by symmetry.`, u => { const a = D(u, s); return +(D(u, s) > a); }); });
  add(1, 'socks', () => { const b = R(3, 8), w = R(3, 8), n = b + w; return Q(`A drawer holds ${b} black and ${w} white socks. You pull out two at random. What is the probability that they match?`, (b * (b - 1) + w * (w - 1)) / (n * (n - 1)), 'p', `Both black plus both white.`, u => { const [x, y] = pickK(u, n, 2); return +((x < b) === (y < b)); }); });
  add(1, 'sixes', () => { const k = R(2, 6), s = P([4, 6]); return Q(`On average, how many rolls of a fair ${s}-sided die does it take to see the face ${s} a total of ${k} times?`, s * k, 'ev', `${k} × ${s}.`, u => { let n = 0, h = 0; while (h < k) { n++; if (D(u, s) === s) h++; } return n; }); });
  add(1, 'condCoins', () => { const n = R(2, 5); return Q(`${n} fair coins are flipped and at least one is heads. What is the probability that all are heads?`, 1 / (2 ** n - 1), 'p', `One outcome out of the ${2 ** n - 1} with at least one head.`, u => { for (;;) { let h = 0; for (let i = 0; i < n; i++) if (flip(u)) h++; if (h) return +(h === n); } }); });
  add(1, 'threeDice', () => { const v = P([['all different', 120], ['all the same', 6], ['exactly two the same', 90]]); return Q(`Three fair dice are rolled. What is the probability that the numbers are ${v[0]}?`, v[1] / 216, 'p', `${v[1]} of the 216 outcomes.`, u => { const n = new Set([D(u, 6), D(u, 6), D(u, 6)]).size; return +(n === { 'all different': 3, 'all the same': 1, 'exactly two the same': 2 }[v[0]]); }); });

  // ================== HARD ==================
  add(2, 'manySum', () => { const k = P([2, 3, 3]), T1 = k === 2 ? 100 : P([100, 130, 150, 170, 200]); const d = sumDist(k, 10, 99); let v = 0; d.forEach((p, s) => { if (s >= T1) v += p; }); const w = T1 === 100 ? 'a three digit number' : `at least ${T1}`; return Q(`${k === 2 ? 'Two' : 'Three'} two digit numbers are chosen at random. What is the probability that their sum is ${w}?`, v, 'p', `Each is uniform on 10–99. Convolve, or use mean ${54.5 * k} and sd ≈ ${(26 * Math.sqrt(k)).toFixed(0)}.`, u => { let s = 0; for (let i = 0; i < k; i++) s += 9 + D(u, 90); return +(s >= T1); }); });
  add(2, 'cardProd', () => { const k = P([2, 3, 3]); const e = Array(k + 1).fill(0); e[0] = 1; for (let c = 0; c < 52; c++) for (let j = k; j >= 1; j--) e[j] += e[j - 1] * (rankOf(c) + 1); return Q(`${k === 2 ? 'Two' : 'Three'} cards are pulled from a deck of 52 in which A = 1, 2 = 2, ..., K = 13. What is the expected value of the product?`, e[k] / Cx(52, k), 'ev', `Without replacement the values are slightly negatively correlated, so it's a little under 7^${k}.`, u => pickK(u, 52, k).reduce((p, c) => p * (rankOf(c) + 1), 1)); });
  add(2, 'distinctDigits', () => { const m = P([2, 3, 4, 4, 5]); let w = 0; for (let L = 1; L <= m; L++) { let c = 9; for (let i = 1; i < L; i++) c *= 10 - i; w += c; } const N = 10 ** m; return Q(`An integer is randomly chosen from one to ${N.toLocaleString('en-US')} inclusive. What is the probability that all of the digits of the number are different?`, w / N, 'p', `By length: 9 × 9 × 8 × …, summed over 1 to ${m} digits = ${w.toLocaleString('en-US')}.`, u => { const s = String(D(u, N)); return +(new Set(s).size === s.length); }); });
  add(2, 'walkAway', () => {
    const v = P([['Let X be the result of the dice roll. If X = 1, 2 or 3 then you move X to the right. If X = 4, 5, 6 then you move X - 3 to the left.', [1, 2, 3, -1, -2, -3]], ['If the roll is even you move one step right; if odd, one step left.', [1, -1, 1, -1, 1, -1]], ['A roll of 1 or 2 moves you 2 to the right, 3 or 4 moves you 2 to the left, and 5 or 6 leaves you where you are.', [2, 2, -2, -2, 0, 0]]]);
    const D1 = R(4, 12), n = 2 * D1 - 1, A = [], b = [];
    for (let i = 0; i < n; i++) { const row = Array(n).fill(0); row[i] = 1; for (const st of v[1]) { const j = i - (D1 - 1) + st; if (Math.abs(j) < D1) row[j + D1 - 1] -= 1 / 6; } A.push(row); b.push(1); }
    return Q(`Start at the origin of the number line and continuously roll a dice. ${v[0]} On average, how many rolls will it take before you are at least ${D1} steps away from the origin?`, solve(A, b)[D1 - 1], 'ev', `Set up E[k] = 1 + average of E[next] for each position with |k| < ${D1}, and solve. Rough guide: distance² ÷ variance per step.`, u => { let p = 0, t = 0; while (Math.abs(p) < D1) { p += v[1][D(u, 6) - 1]; t++; } return t; }, { ladder: true });
  });
  add(2, 'ruin', () => { const p = P([0.4, 0.45, 0.55, 0.6]), i = R(2, 6), N = i + R(2, 6), r = (1 - p) / p; return Q(`You start with $${i} and bet $1 at a time, winning each bet with probability ${p}. You stop at $${N} or $0. What is the probability of reaching $${N}?`, (r ** i - 1) / (r ** N - 1), 'p', `Gambler's ruin: (r^${i} − 1)/(r^${N} − 1) with r = q/p.`, u => { let x = i; while (x > 0 && x < N) x += u() < p ? 1 : -1; return +(x === N); }); });
  add(2, 'coupon', () => { const n = R(4, 12); return Q(`On average, how many rolls of a fair ${n}-sided die does it take to see every face at least once?`, n * sum(range(1, n).map(k => 1 / k)), 'ev', `Coupon collector: ${n} × (1 + 1/2 + … + 1/${n}).`, u => { const s = new Set(); let t = 0; while (s.size < n) { s.add(D(u, n)); t++; } return t; }); });
  add(2, 'sameTwice', () => { const s = P([4, 6, 8, 10, 12]); return Q(`A fair ${s}-sided die is rolled until two consecutive rolls are the same. What is the expected number of rolls?`, s + 1, 'ev', `One roll to start, then a geometric wait with p = 1/${s}.`, u => { let last = D(u, s), t = 1; for (;;) { const d = D(u, s); t++; if (d === last) return t; last = d; } }); });
  add(2, 'pattern', () => { const pat = P(['HH', 'HT', 'HHH', 'HTH', 'HHT', 'HTT', 'HHHH', 'HTHT', 'HHTT', 'HTHH']); return Q(`A fair coin is flipped until the sequence ${pat} first appears. What is the expected number of flips?`, waitFor(pat), 'ev', `Build a state machine on how much of ${pat} you've matched and solve. Self-overlapping patterns take longer.`, u => simWait(u, pat), { ladder: true }); });
  function simWait(u, pat) { let s = '', t = 0; while (!s.endsWith(pat)) { s = (s + (flip(u) ? 'H' : 'T')).slice(-pat.length); t++; } return t; }
  add(2, 'penney', () => { const [a, b] = P([['HH', 'TH'], ['HHH', 'THH'], ['HHT', 'THH'], ['HTH', 'THH'], ['HTT', 'HHT'], ['HTH', 'HHT'], ['TTH', 'HTT'], ['HT', 'HH']]); return Q(`A fair coin is flipped until either ${a} or ${b} appears. What is the probability that ${a} appears first?`, race(a, b), 'p', `States are the last flips so far; solve for the chance of hitting ${a} first.`, u => { let s = ''; for (;;) { s = (s + (flip(u) ? 'H' : 'T')).slice(-a.length); if (s === a) return 1; if (s === b) return 0; } }); });
  add(2, 'sumRace', () => { const s = R(4, 11); let t; do { t = R(3, 11); } while (t === s); const ws = 6 - Math.abs(7 - s), wt = 6 - Math.abs(7 - t); return Q(`Two dice are rolled repeatedly until the sum is ${s} or ${t}. What is the probability that ${s} comes first?`, ws / (ws + wt), 'p', `Other rolls don't matter: ${ws} ÷ (${ws} + ${wt}).`, u => { for (;;) { const v = D(u, 6) + D(u, 6); if (v === s) return 1; if (v === t) return 0; } }); });
  add(2, 'craps', () => { const w = v => (6 - Math.abs(7 - v)) / 36; let p = w(7) + w(11); [4, 5, 6, 8, 9, 10].forEach(v => { p += w(v) * (w(v) / (w(v) + w(7))); }); return Q('Two dice are rolled. A first-roll sum of 7 or 11 wins, and 2, 3 or 12 loses. Otherwise you keep rolling until you repeat your first sum (win) or roll a 7 (lose). What is the probability of winning?', p, 'p', `For each point v: P(v) × P(v) ÷ (P(v) + P(7)), plus the first-roll wins.`, u => { const r = () => D(u, 6) + D(u, 6); const f = r(); if (f === 7 || f === 11) return 1; if (f === 2 || f === 3 || f === 12) return 0; for (;;) { const v = r(); if (v === f) return 1; if (v === 7) return 0; } }); });
  add(2, 'bayesTest', () => { const pr = P([0.5, 1, 2, 5, 10]) / 100, se = P([90, 95, 99]) / 100, fp = P([1, 2, 5, 10]) / 100; return Q(`A disease affects ${+(pr * 100).toFixed(1)}% of people. A test detects it ${se * 100}% of the time and has a ${fp * 100}% false positive rate. You test positive. What is the probability that you have the disease?`, (pr * se) / (pr * se + (1 - pr) * fp), 'p', `True positives ÷ all positives.`, u => { for (;;) { const d = u() < pr; if (u() < (d ? se : fp)) return +d; } }); });
  add(2, 'bayesCoin', () => { const f = R(3, 9), m = R(1, 3), k = R(2, 6); return Q(`A bag holds ${f} fair coins and ${m} two-headed coin${m > 1 ? 's' : ''}. You draw one and flip it ${k} times, getting all heads. What is the probability that it is two-headed?`, m / (m + f / 2 ** k), 'p', `${m} ÷ (${m} + ${f} × (1/2)^${k}).`, u => { for (;;) { const two = D(u, f + m) > f; let ok = true; if (!two) for (let i = 0; i < k; i++) if (!flip(u)) ok = false; if (ok) return +two; } }); });
  add(2, 'twoSided', () => { const a = R(1, 4), b = R(1, 4), c = R(1, 4), n = a + b + c; return Q(`A box holds ${a} red/red, ${b} red/blue and ${c} blue/blue cards. A random card is placed on the table showing red. What is the probability that its other side is red?`, (2 * a) / (2 * a + b), 'p', `Count red faces: ${2 * a} on red/red cards out of ${2 * a + b}.`, u => { for (;;) { const i = D(u, n), up = flip(u); const top = i <= a ? 'R' : i > a + b ? 'B' : up ? 'R' : 'B'; if (top === 'R') return +(i <= a); } }); });
  add(2, 'monty', () => { const n = R(3, 8), m = R(1, n - 2); return Q(`There are ${n} doors with one prize. You pick one, then the host opens ${m} other door${m > 1 ? 's' : ''} without the prize. If you switch to one of the remaining closed doors at random, what is the probability of winning?`, ((n - 1) / n) * (1 / (n - m - 1)), 'p', `(${n - 1}/${n}) × 1/${n - m - 1}.`, u => { const prize = D(u, n); const closed = range(2, n).filter(d => d !== prize); const open = pickK(u, closed.length, m).map(i => closed[i]); const rest = range(2, n).filter(d => !open.includes(d)); return +(rest[Math.floor(u() * rest.length)] === prize); }); });
  add(2, 'birthday', () => { const n = R(10, 50); let v = 1; for (let i = 0; i < n; i++) v *= (365 - i) / 365; return Q(`In a group of ${n} people, what is the probability that at least two share a birthday? (365 equally likely days)`, 1 - v, 'p', `1 − (365/365)(364/365)…`, u => { const s = new Set(); for (let i = 0; i < n; i++) s.add(D(u, 365)); return +(s.size < n); }); });
  add(2, 'derange', () => { const n = R(3, 9); let v = 0; for (let k = 0; k <= n; k++) v += (k % 2 ? -1 : 1) / fact(k); return Q(`${n} letters are placed at random into ${n} addressed envelopes. What is the probability that no letter is in its correct envelope?`, v, 'p', `Derangements: Σ (−1)^k / k!, close to 1/e.`, u => +pickK(u, n, n).every((c, i) => c !== i)); });
  add(2, 'fixedPts', () => { const n = R(5, 52); return Q(`${n} numbered cards are shuffled and laid out in positions 1 to ${n}. On average, how many cards are in their own position?`, 1, 'ev', `Linearity: ${n} positions × 1/${n} = 1, whatever the size.`, u => pickK(u, n, n).filter((c, i) => c === i).length); });
  const HANDS = [
    ['exactly one pair (no better)', 13 * 6 * Cx(12, 3) * 64, h => h.join() === '2,1,1,1'], ['two pair', Cx(13, 2) * 36 * 44, h => h.join() === '2,2,1'],
    ['three of a kind (no full house)', 13 * 4 * Cx(12, 2) * 16, h => h.join() === '3,1,1'], ['a full house', 13 * 4 * 12 * 6, h => h.join() === '3,2'], ['four of a kind', 13 * 48, h => h.join() === '4,1'],
  ];
  add(2, 'pokerHand', () => { const [name, w, f] = P(HANDS); return Q(`You are dealt five cards from a standard deck. What is the probability of ${name}?`, w / Cx(52, 5), 'p', `${w.toLocaleString('en-US')} hands of C(52,5) = 2,598,960.`, u => { const c = {}; pickK(u, 52, 5).forEach(x => { c[rankOf(x)] = (c[rankOf(x)] || 0) + 1; }); return +f(Object.values(c).sort((a, b) => b - a)); }); });
  add(2, 'flush5', () => Q('You are dealt five cards from a standard deck. What is the probability that all five share a suit?', (4 * Cx(13, 5)) / Cx(52, 5), 'p', '4 × C(13,5) ÷ C(52,5).', u => +(new Set(pickK(u, 52, 5).map(suitOf)).size === 1)));
  add(2, 'atLeastAce', () => { const k = R(2, 13); return Q(`You are dealt ${k} cards from a standard deck. What is the probability of at least one ace?`, 1 - Cx(48, k) / Cx(52, k), 'p', `1 − C(48,${k})/C(52,${k}).`, u => +pickK(u, 52, k).some(c => rankOf(c) === 0)); });
  add(2, 'hyper', () => { const k = P([5, 7, 13]), h = R(1, 4); return Q(`You are dealt ${k} cards from a standard deck. What is the probability of exactly ${h} heart${h > 1 ? 's' : ''}?`, (Cx(13, h) * Cx(39, k - h)) / Cx(52, k), 'p', `C(13,${h}) × C(39,${k - h}) ÷ C(52,${k}).`, u => +(pickK(u, 52, k).filter(c => suitOf(c) === 0).length === h)); });
  add(2, 'firstSpecial', () => { const v = P([[52, 4, 'ace'], [52, 13, 'heart'], [52, 2, 'red ace'], [52, 12, 'face card']]); return Q(`Cards are turned over one at a time from a shuffled standard deck. On average, at what position does the first ${v[2]} appear?`, (v[0] + 1) / (v[1] + 1), 'ev', `The ${v[1]} special cards split the rest evenly: (${v[0]} + 1) ÷ (${v[1]} + 1).`, u => { const p = pickK(u, v[0], v[0]); return 1 + p.findIndex(c => c < v[1]); }); });
  add(2, 'evenSum', () => { const n = R(3, 5), mean = Math.round(3.5 * n), s = mean + R(-3, 2), d = sumDist(n, 1, 6); return Q(`${n} fair dice are rolled. What is the probability that the sum is exactly ${s}?`, d.get(s), 'p', `Convolve the dice, or count compositions of ${s}.`, u => { let t = 0; for (let i = 0; i < n; i++) t += D(u, 6); return +(t === s); }); });
  add(2, 'maxExact', () => { const n = R(2, 6), m = R(3, 6); return Q(`${n} fair dice are rolled. What is the probability that the highest number shown is exactly ${m}?`, (m ** n - (m - 1) ** n) / 6 ** n, 'p', `(${m}^${n} − ${m - 1}^${n}) ÷ 6^${n}.`, u => { let t = 0; for (let i = 0; i < n; i++) t = Math.max(t, D(u, 6)); return +(t === m); }); });
  add(2, 'evMaxN', () => { const n = R(2, 6), min = rnd() < 0.4; const mx = sum(range(1, 6).map(m => m * (m ** n - (m - 1) ** n))) / 6 ** n; return Q(`${n} fair dice are rolled. What is the expected value of the ${min ? 'lowest' : 'highest'} number shown?`, min ? 7 - mx : mx, 'ev', `E = Σ P(value ≥ k). The lowest mirrors the highest: 7 − E[max].`, u => { const r = range(1, n).map(() => D(u, 6)); return min ? Math.min(...r) : Math.max(...r); }); });
  add(2, 'uDiff', () => { const d = R(1, 5) / 10; return Q(`X and Y are independent and uniform on [0, 1]. What is the probability that |X − Y| < ${d}?`, 1 - (1 - d) ** 2, 'p', `Area of the band: 1 − (1 − ${d})².`, u => +(Math.abs(u() - u()) < d)); });
  add(2, 'meet', () => { const w = P([5, 10, 15, 20, 30]); return Q(`Two people arrive independently at random times within the same hour, and each waits ${w} minutes for the other. What is the probability that they meet?`, 1 - (1 - w / 60) ** 2, 'p', `1 − (1 − ${w}/60)².`, u => +(Math.abs(u() - u()) * 60 <= w)); });
  add(2, 'uMax', () => { const n = R(2, 9), a = P([1, 10, 100]); return Q(`${n} numbers are drawn independently and uniformly from [0, ${a}]. What is the expected value of the largest?`, (a * n) / (n + 1), 'ev', `${a} × ${n}/${n + 1}.`, u => a * Math.max(...range(1, n).map(() => u()))); });
  add(2, 'uSum', () => { const s = P([0.5, 0.8, 1.2, 1.5, 1.6]); return Q(`X and Y are independent and uniform on [0, 1]. What is the probability that X + Y < ${s}?`, s <= 1 ? s * s / 2 : 1 - (2 - s) ** 2 / 2, 'p', `Area of the region under the line X + Y = ${s}.`, u => +(u() + u() < s)); });
  add(2, 'uProd', () => { const t = P([0.1, 0.2, 0.25, 0.5, 0.75]); return Q(`X and Y are independent and uniform on [0, 1]. What is the probability that XY < ${t}?`, t - t * Math.log(t), 'p', `t − t·ln t, by integrating min(1, t/x).`, u => +(u() * u() < t)); });
  add(2, 'stick', () => Q('A stick is broken at two uniformly random points. What is the probability that the three pieces can form a triangle?', 0.25, 'p', 'Every piece must be under half the length: 1/4.', u => { const a = u(), b = u(), x = Math.min(a, b), y = Math.max(a, b); return +(x < 0.5 && y - x < 0.5 && 1 - y < 0.5); }));
  add(2, 'semicircle', () => { const n = R(3, 6); return Q(`${n} points are placed uniformly at random on a circle. What is the probability that they all lie within some semicircle?`, n / 2 ** (n - 1), 'p', `${n} ÷ 2^${n - 1}.`, u => { const a = range(1, n).map(() => u()).sort((x, y) => x - y); let g = a[0] + 1 - a[n - 1]; for (let i = 1; i < n; i++) g = Math.max(g, a[i] - a[i - 1]); return +(g >= 0.5); }); });
  add(2, 'kthAtR', () => { const k = R(2, 3), r = R(k + 1, 12); return Q(`A fair die is rolled repeatedly. What is the probability that the ${ord(k)} six occurs exactly on roll ${r}?`, Cx(r - 1, k - 1) * (1 / 6) ** k * (5 / 6) ** (r - k), 'p', `C(${r - 1},${k - 1}) (1/6)^${k} (5/6)^${r - k}.`, u => { let h = 0; for (let i = 1; i <= r; i++) { if (D(u, 6) === 6) { h++; if (h === k) return +(i === r); } } return 0; }); });
  function poissonDraw(u, l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= u(); } while (p > L); return k - 1; }
  add(2, 'poissonK', () => { const l = R(1, 6), k = R(0, 6), ge = rnd() < 0.4 && k > 0; let v = 0; const pmf = i => Math.exp(-l + i * Math.log(l) - logF[i]); if (ge) { for (let i = 0; i < k; i++) v += pmf(i); v = 1 - v; } else v = pmf(k); return Q(`Calls arrive at an average rate of ${l} per hour as a Poisson process. What is the probability of ${ge ? 'at least' : 'exactly'} ${k} call${k === 1 ? '' : 's'} in an hour?`, v, 'p', ge ? `1 − Σ P(N = i), i < ${k}.` : `e^−${l} × ${l}^${k} ÷ ${k}!`, u => { const n = poissonDraw(u, l); return +(ge ? n >= k : n === k); }); });
  add(2, 'binomGe', () => { const n = R(6, 14), [p, ptxt] = P([[1 / 6, 'rolling a six on a die'], [0.25, 'a 25% chance event'], [0.3, 'a 30% chance event'], [0.4, 'a 40% chance event']]), k = R(2, Math.min(5, n - 1)); return Q(`Over ${n} independent trials of ${ptxt}, what is the probability of at least ${k} successes?`, sum(range(k, n).map(i => binom(n, i, p))), 'p', `1 minus the chance of ${k - 1} or fewer.`, u => { let h = 0; for (let i = 0; i < n; i++) if (u() < p) h++; return +(h >= k); }); });
  add(2, 'binom100', () => { const n = P([100, 200, 400]), k = Math.round(n / 2 + P([0.5, 1, 1.5, 2]) * Math.sqrt(n) / 2); return Q(`A fair coin is flipped ${n} times. What is the probability of at least ${k} heads?`, sum(range(k, n).map(i => binom(n, i, 0.5))), 'p', `Normal approximation: mean ${n / 2}, sd ${(Math.sqrt(n) / 2).toFixed(1)}, with a continuity correction.`, u => { let h = 0; for (let i = 0; i < n; i++) if (flip(u)) h++; return +(h >= k); }); });
  function rerollValues(n, s) { const V = [(s + 1) / 2]; for (let i = 1; i < n; i++) { const p = V[i - 1]; V.push(sum(range(1, s).map(f => Math.max(f, p))) / s); } return V; }
  add(2, 'reroll', () => { const n = R(2, 5), s = P([6, 6, 8, 10]); const V = rerollValues(n, s); return Q(`You roll a fair ${s}-sided die and may re-roll, up to ${n} rolls in total, keeping only the last one. You are paid the final roll in dollars. What is the game worth with best play?`, V[n - 1], 'ev', `Backwards: keep a roll only if it beats the value of continuing (${V.slice(0, n - 1).map(v => v.toFixed(2)).join(', ')}).`, u => { for (let left = n; left >= 1; left--) { const f = D(u, s); if (left === 1 || f >= V[left - 2]) return f; } return 0; }); });
  add(2, 'rerollCost', () => { const c = P([0.5, 1, 1.5, 2]), s = P([6, 8, 10]); const m = (s + 1) / 2; const v = sum(range(1, s).map(f => Math.max(f, m - c))) / s; return Q(`You roll a fair ${s}-sided die and are paid the result in dollars. You may pay $${c} once to roll again, taking the new result. What is the game worth with best play?`, v, 'ev', `Re-roll only if your roll is below ${m} − ${c} = ${m - c}.`, u => { const f = D(u, s); return f < m - c ? D(u, s) - c : f; }); });
  add(2, 'stPete', () => { const n = R(3, 12), a = P([1, 2, 5]); return Q(`A fair coin is flipped up to ${n} times. If the first head comes on flip k you win $${a === 1 ? '' : a}2^k${a === 1 ? '' : ''}. If there is no head in ${n} flips you win nothing. What is the expected payout?`, a * n, 'ev', `Each flip contributes ${a} × 2^k × (1/2)^k = ${a}.`, u => { for (let k = 1; k <= n; k++) if (flip(u)) return a * 2 ** k; return 0; }); });
  add(2, 'firstWins', () => { const m = P([2, 2, 3, 4]), s = P([4, 6, 8, 10]); const q = 1 - 1 / s; return Q(`${m} players take turns rolling a fair ${s}-sided die. The first to roll a ${s} wins. What is the probability that the player going first wins?`, (1 / s) / (1 - q ** m), 'p', `Geometric series: p ÷ (1 − q^${m}).`, u => { for (let t = 0; ; t++) if (D(u, s) === s) return +(t % m === 0); }); });
  add(2, 'bestOf', () => { const n = P([3, 5, 7, 9]), p = P([0.55, 0.6, 0.65, 0.7]), w = (n + 1) / 2; return Q(`Team A wins each game with probability ${p}. What is the probability that A wins a best-of-${n} series?`, sum(range(w, n).map(i => binom(n, i, p))), 'p', `Same as winning at least ${w} of ${n} games played out in full.`, u => { let a = 0, b = 0; while (a < w && b < w) { if (u() < p) a++; else b++; } return +(a === w); }); });
  add(2, 'deuce', () => { const p = P([0.55, 0.6, 0.65, 0.7]); return Q(`At deuce in tennis you must win two points in a row more than your opponent. You win each point with probability ${p}. What is the probability that you win the game?`, p * p / (p * p + (1 - p) ** 2), 'p', `p² ÷ (p² + q²).`, u => { let d = 0; while (Math.abs(d) < 2) d += u() < p ? 1 : -1; return +(d === 2); }); });
  add(2, 'distinctFaces', () => { const n = R(3, 20); return Q(`A fair die is rolled ${n} times. What is the expected number of different faces seen?`, 6 * (1 - (5 / 6) ** n), 'ev', `Linearity: 6 × (1 − (5/6)^${n}).`, u => { const s = new Set(); for (let i = 0; i < n; i++) s.add(D(u, 6)); return s.size; }); });
  add(2, 'emptyBoxes', () => { const m = R(4, 15), n = R(4, 25); return Q(`${n} balls are thrown independently and uniformly into ${m} boxes. What is the expected number of empty boxes?`, m * (1 - 1 / m) ** n, 'ev', `${m} × (1 − 1/${m})^${n}.`, u => { const s = new Set(); for (let i = 0; i < n; i++) s.add(D(u, m)); return m - s.size; }); });
  add(2, 'pairsBday', () => { const n = R(10, 60); return Q(`In a group of ${n} people, what is the expected number of pairs sharing a birthday? (365 equally likely days)`, (n * (n - 1)) / 2 / 365, 'ev', `C(${n},2) ÷ 365.`, u => { const c = {}; let p = 0; for (let i = 0; i < n; i++) { const d = D(u, 365); p += c[d] || 0; c[d] = (c[d] || 0) + 1; } return p; }); });
  add(2, 'couples', () => { const n = R(3, 10); return Q(`${n} couples sit at random around a circular table. What is the expected number of couples sitting together?`, (2 * n) / (2 * n - 1), 'ev', `Linearity: ${n} × 2/${2 * n - 1}.`, u => { const p = pickK(u, 2 * n, 2 * n); let t = 0; for (let i = 0; i < 2 * n; i++) { const a = p[i], b = p[(i + 1) % (2 * n)]; if (Math.floor(a / 2) === Math.floor(b / 2)) t++; } return t; }); });
  add(2, 'runs', () => { const n = R(4, 40); return Q(`A fair coin is flipped ${n} times. What is the expected number of runs (maximal blocks of equal outcomes)?`, 1 + (n - 1) / 2, 'ev', `One run, plus a new one at each of ${n - 1} gaps with chance 1/2.`, u => { let r = 1, l = flip(u); for (let i = 1; i < n; i++) { const c = flip(u); if (c !== l) r++; l = c; } return r; }); });
  add(2, 'coprime', () => { const N = P([100, 300, 1000]), [a, b, c] = P([[2, 3, 5], [3, 5, 7], [2, 5, 7]]); let w = 0; for (let i = 1; i <= N; i++) if (i % a && i % b && i % c) w++; return Q(`An integer is chosen uniformly from 1 to ${N}. What is the probability that it is divisible by none of ${a}, ${b} and ${c}?`, w / N, 'p', `Inclusion-exclusion, or roughly (1−1/${a})(1−1/${b})(1−1/${c}): ${w} of ${N}.`, u => { const i = D(u, N); return +!!(i % a && i % b && i % c); }); });
  add(2, 'polya', () => { const r = R(1, 5), b = R(1, 5), n = R(3, 9); return Q(`An urn holds ${r} red and ${b} blue balls. Each draw, you return the ball and add one more of the same colour. What is the probability that draw number ${n} is red?`, r / (r + b), 'p', `By symmetry the chance stays ${r}/${r + b} at every draw.`, u => { let x = r, y = b, red = false; for (let i = 1; i <= n; i++) { red = u() * (x + y) < x; if (red) x++; else y++; } return +red; }); });
  add(2, 'markov', () => { const a = P([0.6, 0.7, 0.8]), c = P([0.2, 0.3, 0.4]), n = R(2, 5); let p = 1; for (let i = 0; i < n; i++) p = p * a + (1 - p) * c; return Q(`If it rains today, it rains tomorrow with probability ${a}; if it's dry today, it rains tomorrow with probability ${c}. It is raining now. What is the probability of rain in ${n} days?`, p, 'p', `Step forward: p → ${a}p + ${c}(1 − p), ${n} times.`, u => { let w = true; for (let i = 0; i < n; i++) w = u() < (w ? a : c); return +w; }); });
  add(2, 'modSum', () => { const n = R(2, 4), m = P([3, 4, 5, 7]); const d = sumDist(n, 1, 6); let v = 0; d.forEach((p, s) => { if (s % m === 0) v += p; }); return Q(`${n} fair dice are rolled. What is the probability that the sum is divisible by ${m}?`, v, 'p', `Add the chances of every multiple of ${m}.`, u => { let t = 0; for (let i = 0; i < n; i++) t += D(u, 6); return +(t % m === 0); }); });
  add(2, 'prodDiv', () => { const k = P([4, 6, 10, 12, 9]); let w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if ((a * b) % k === 0) w++; return Q(`Two fair dice are rolled. What is the probability that their product is divisible by ${k}?`, w / 36, 'p', `Count the outcomes: ${w} of 36.`, u => +((D(u, 6) * D(u, 6)) % k === 0)); });
  add(2, 'absDiff', () => { const s = P([4, 6, 8, 10, 12]), sq = rnd() < 0.4; let t = 0; for (let a = 1; a <= s; a++) for (let b = 1; b <= s; b++) t += sq ? (a - b) ** 2 : Math.abs(a - b); return Q(`Two fair ${s}-sided dice are rolled. What is the expected value of ${sq ? 'the square of their difference' : 'the absolute difference'}?`, t / s ** 2, 'ev', `Average over all ${s ** 2} outcomes.`, u => { const d = D(u, s) - D(u, s); return sq ? d * d : Math.abs(d); }); });
  add(2, 'varSum', () => { const n = R(2, 12), s = P([4, 6, 8, 12]); return Q(`What is the variance of the sum of ${n} fair ${s}-sided dice?`, (n * (s * s - 1)) / 12, 'ev', `Each die has variance (${s}² − 1)/12; independent variances add.`, u => { let t = 0; for (let i = 0; i < n; i++) t += D(u, s); return t; }, { variance: (n * (s + 1)) / 2 }); });
  add(2, 'callDie', () => { const two = rnd() < 0.6, k = two ? R(5, 10) : R(2, 5), d = two ? sumDist(2, 1, 6) : uniform(1, 6); let v = 0; d.forEach((p, x) => { v += p * Math.max(x - k, 0); }); return Q(`You hold an option paying max(S − ${k}, 0) dollars, where S is ${two ? 'the sum of two fair dice' : 'the roll of one fair die'}. What is its fair value?`, v, 'ev', `Σ P(S) × (S − ${k}) over outcomes above ${k}.`, u => Math.max((two ? D(u, 6) + D(u, 6) : D(u, 6)) - k, 0)); });
  add(2, 'untilSum', () => { const k = R(6, 30); const E = Array(k + 7).fill(0); for (let t = k - 1; t >= 0; t--) { E[t] = 1 + sum(range(1, 6).map(f => E[t + f])) / 6; } return Q(`You roll a fair die repeatedly and keep a running total. On average, how many rolls until the total is at least ${k}?`, E[0], 'ev', `Backwards: E[t] = 1 + average E[t + face]. Roughly (${k} + 1.7)/3.5.`, u => { let t = 0, n = 0; while (t < k) { t += D(u, 6); n++; } return n; }); });
  add(2, 'hitExact', () => { const k = R(4, 20); const H = [1]; for (let t = 1; t <= k; t++) { let s = 0; for (let f = 1; f <= 6; f++) if (t - f >= 0) s += H[t - f]; H[t] = s / 6; } return Q(`You roll a fair die repeatedly and keep a running total. What is the probability that the total ever equals exactly ${k}?`, H[k], 'p', `P[t] = average of the previous six P values. It settles near 2/7.`, u => { let t = 0; while (t < k) t += D(u, 6); return +(t === k); }); });
  add(2, 'firstRepeat', () => { const s = P([4, 6, 8, 10, 12, 20]); let v = 0, p = 1; for (let i = 0; i <= s; i++) { v += p; p *= (s - i) / s; } return Q(`A fair ${s}-sided die is rolled until some face comes up for the second time. What is the expected number of rolls?`, v, 'ev', `E[T] = Σ P(T > t), a product of (1 − i/${s}).`, u => { const seen = new Set(); let t = 0; for (;;) { const d = D(u, s); t++; if (seen.has(d)) return t; seen.add(d); } }); });
  add(2, 'allFaces', () => { const s = P([4, 6]), n = R(s + 1, s + 12); let v = 0; for (let k = 0; k <= s; k++) v += (k % 2 ? -1 : 1) * Cx(s, k) * ((s - k) / s) ** n; return Q(`A fair ${s}-sided die is rolled ${n} times. What is the probability that every face appears at least once?`, v, 'p', `Inclusion-exclusion on the missing faces.`, u => { const c = new Set(); for (let i = 0; i < n; i++) c.add(D(u, s)); return +(c.size === s); }); });
  add(2, 'together', () => { const n = R(5, 10), k = R(3, 4); return Q(`${n} people line up at random. What is the probability that ${k} particular people stand together in a block?`, (fact(k) * fact(n - k + 1)) / fact(n), 'p', `Treat them as one unit: ${k}! × ${n - k + 1}! ÷ ${n}!.`, u => { const p = pickK(u, n, n), pos = range(0, k - 1).map(i => p.indexOf(i)); return +(Math.max(...pos) - Math.min(...pos) === k - 1); }); });
  add(2, 'digitSum', () => { const k = R(3, 20); let w = 0; for (let i = 1; i <= 999; i++) if ([...String(i)].reduce((s, c) => s + +c, 0) === k) w++; return Q(`An integer is chosen uniformly from 1 to 999. What is the probability that its digits add up to ${k}?`, w / 999, 'p', `Count the digit triples: ${w}.`, u => +([...String(D(u, 999))].reduce((s, c) => s + +c, 0) === k)); });
  add(2, 'condSum', () => { const k = R(9, 11); let g = 0, w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a === 6 || b === 6) { g++; if (a + b >= k) w++; } return Q(`Two fair dice are rolled and at least one shows a 6. What is the probability that the sum is at least ${k}?`, w / g, 'p', `${g} outcomes contain a 6; ${w} of them reach ${k}.`, u => { for (;;) { const a = D(u, 6), b = D(u, 6); if (a === 6 || b === 6) return +(a + b >= k); } }); });
  add(2, 'orderDice', () => { const strict = rnd() < 0.5; return Q(`Three fair dice are rolled in order. What is the probability that the results are ${strict ? 'strictly increasing' : 'non-decreasing'}?`, (strict ? 20 : 56) / 216, 'p', strict ? `Choose 3 different faces, one order: C(6,3)/216.` : `Multisets of size 3: C(8,3)/216.`, u => { const a = D(u, 6), b = D(u, 6), c = D(u, 6); return +(strict ? a < b && b < c : a <= b && b <= c); }); });
  add(2, 'secondCardHigher', () => Q('Two cards are drawn in order from a standard deck, with aces low. What is the probability that the second has a strictly higher rank?', (1 - 3 / 51) / 2, 'p', 'Different rank has chance 48/51; half of that by symmetry.', u => { const [a, b] = pickK(u, 52, 2); return +(rankOf(b) > rankOf(a)); }));
  add(2, 'highCard', () => { const k = R(2, 6); let v = 0; for (let r = 1; r <= 13; r++) v += r * (Cx(4 * r, k) - Cx(4 * (r - 1), k)); return Q(`${k} cards are drawn from a deck where A = 1, ..., K = 13. What is the expected value of the highest card?`, v / Cx(52, k), 'ev', `P(max ≤ r) = C(4r,${k}) ÷ C(52,${k}).`, u => 1 + Math.max(...pickK(u, 52, k).map(rankOf))); });
  add(2, 'sumBeforeBust', () => { const f = R(1, 3); const others = range(1, 6).filter(x => x !== f); return Q(`You roll a fair die repeatedly, adding each result to a total, and stop as soon as you roll a ${f} (which isn't added). What is the expected total?`, sum(others), 'ev', `5 non-${f} rolls expected before stopping, averaging ${sum(others) / 5}: ${sum(others)}.`, u => { let t = 0; for (;;) { const d = D(u, 6); if (d === f) return t; t += d; } }); });
  add(2, 'nHeads', () => { const n = R(2, 6), p = P([0.5, 0.5, 0.6, 0.4]); return Q(`A coin lands heads with probability ${p}. On average, how many flips does it take to get ${n} heads in a row?`, (1 - p ** n) / ((1 - p) * p ** n), 'ev', `(1 − p^${n}) ÷ (q × p^${n}).`, u => { let r = 0, t = 0; while (r < n) { t++; r = u() < p ? r + 1 : 0; } return t; }, { ladder: true }); });
  add(2, 'differentBoxes', () => { const m = R(5, 14), n = R(3, Math.min(m, 7)); let v = 1; for (let i = 0; i < n; i++) v *= (m - i) / m; return Q(`${n} people each pick one of ${m} floors in a lift at random. What is the probability that they all pick different floors?`, v, 'p', `(${m}/${m})(${m - 1}/${m})… for ${n} people.`, u => { const s = new Set(); for (let i = 0; i < n; i++) s.add(D(u, m)); return +(s.size === n); }); });
  add(2, 'expoWait', () => { const m = P([2, 4, 5, 10]), t = R(1, 8), min = rnd() < 0.4; if (min) { const b = P([3, 6, 12, 15]); return Q(`Two independent exponential waiting times have means of ${m} and ${b} minutes. What is the expected time until the first of them finishes?`, 1 / (1 / m + 1 / b), 'ev', `Rates add: 1 ÷ (1/${m} + 1/${b}).`, u => Math.min(-m * Math.log(1 - u()), -b * Math.log(1 - u()))); } return Q(`Waiting times are exponential with a mean of ${m} minutes. You have already waited 3 minutes. What is the probability that you wait at least ${t} more?`, Math.exp(-t / m), 'p', `Memoryless: e^(−${t}/${m}). The 3 minutes don't matter.`, u => +(-m * Math.log(1 - u()) >= t)); });
  add(2, 'sumExceed', () => { const t = P([0.25, 0.5, 0.75, 1]); return Q(`You draw uniform numbers from [0, 1] until their running sum exceeds ${t}. What is the expected number of draws?`, Math.exp(t), 'ev', `e^${t}. For a threshold of 1 it's the classic e.`, u => { let s = 0, n = 0; while (s <= t) { s += u(); n++; } return n; }); });

  // -------------------- OPTIONS --------------------
  const nice = v => Number(v.toPrecision(10));
  const dpOf = step => { const s = String(nice(step)); return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0; };
  const fmt = (v, dp) => v.toFixed(dp);
  const STEPS = (() => { const out = []; for (let e = 4; e >= -5; e--) for (const m of [5, 2, 1]) out.push(nice(m * 10 ** e)); return out; })();

  function buildGrid(v, kind, step) {
    const n = Math.round(v / step);
    if (Math.abs(v - n * step) > 0.3 * step) return null;
    const lo = kind === 'p' ? step / 2 : -Infinity, hi = kind === 'p' ? 1 - step / 2 : Infinity;
    const valid = [];
    for (let off = 0; off <= 4; off++) {
      const w = range(n - off, n - off + 4).map(i => nice(i * step));
      if (w.every(x => x > lo && x < hi && (kind === 'p' || v <= 0 || x > 0))) valid.push(w);
    }
    if (!valid.length) return null;
    return { values: P(valid), dp: dpOf(step) };
  }

  function makeOptions(q) {
    const v = q.value;
    if (q.ladder && rnd() < 0.5 && v >= 2) {   // 4, 6, 12, 24, 48 style
      const sig = x => Number(x.toPrecision(2));
      const n = sig(v), off = R(0, 4);
      const values = range(-off, 4 - off).map(k => sig(n * 2 ** k));
      const dp = Math.min(...values) < 4 ? 1 : 0;
      if (new Set(values.map(x => x.toFixed(dp))).size === 5) return finish(v, values, dp);
    }
    const first = q.kind === 'p' ? STEPS.findIndex(s => s <= 0.1 && s <= Math.max(v * 0.6, 1e-5))
      : STEPS.findIndex(s => s <= Math.max(Math.abs(v) * 0.15, v === 0 ? 0.5 : 0));
    const start = first + (rnd() < 0.3 ? 1 : 0);
    for (let i = start; i < STEPS.length; i++) {
      const step = STEPS[i];
      const g = buildGrid(v, q.kind, step);
      if (!g) continue;
      if (q.kind === 'ev' && v > 0 && rnd() < 0.35) {     // tight cluster plus two outliers, like 200 / 340 / 350 / 360 / 500
        const n = Math.round(v / step), c = n + R(-1, 1), big = R(5, 15);
        const values = [c - big, c - 1, c, c + 1, c + big].map(k => nice(k * step));
        if (values[0] > 0) return finish(v, values, g.dp);
      }
      return finish(v, g.values, g.dp);
    }
    return null;
  }

  function finish(v, values, dp) {
    const sorted = [...values].sort((a, b) => a - b);
    const list = sorted.map(x => fmt(x, dp));
    let best = 0;
    sorted.forEach((x, i) => { if (Math.abs(x - v) < Math.abs(sorted[best] - v)) best = i; });
    return { list, answerIndex: best, values: sorted };
  }

  function exactText(v) {
    if (Number.isInteger(v)) return String(v);
    const s = Math.abs(v) >= 1 ? v.toFixed(3) : v.toPrecision(3);
    return String(Number(s));
  }

  // -------------------- PUBLIC --------------------
  function setRng(fn) { rnd = fn || Math.random; }

  // A question at level 1 or 2 (or null level = either), avoiding template ids in `avoid`
  function make(level, avoid) {
    const pool = T.filter(t => !level || t.level === level);
    const fresh = pool.filter(t => !avoid || !avoid.has(t.id));
    const list = fresh.length ? fresh : pool;
    for (;;) {
      const t = P(list);
      const q = t.gen();
      const o = makeOptions(q);
      if (!o) continue;
      return { id: t.id, level: t.level, text: q.text, value: q.value, kind: q.kind, how: q.how, sim: q.sim, variance: q.variance, ...o, exact: exactText(q.value) };
    }
  }

  return { make, setRng, templates: T, shuffled };
})();

if (typeof module !== 'undefined') module.exports = PaperBank;
