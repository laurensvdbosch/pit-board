/* ===========================================================
   PIT BOARD — Odds games: rules and exact maths (no DOM)
   ---------------------------------------------------------
   Every game is scored on decision quality, never on the luck of
   the dice, so a good player can't be beaten by a lucky one:
   - Take or Pass: sum of the true edge of every bet taken.
   - Bank or Bust: regret against the optimal stop/roll policy.
   - Next Card: expected log growth of your side and size.
   - Which Urn?: regret against the optimal draw/commit policy.
   - Likelier?: survive picking the more probable event.
   Checked by tools/test-odds-games.cjs.
   =========================================================== */

'use strict';

const OddsEngine = (() => {
  let rnd = Math.random;
  const setRng = fn => { rnd = fn || Math.random; };
  const R = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
  const P = arr => arr[Math.floor(rnd() * arr.length)];
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const sum = arr => arr.reduce((s, v) => s + v, 0);
  const Cx = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= Math.min(k, n - k); i++) r = (r * (n - i + 1)) / i; return r; };
  const money = v => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;

  // Sim helpers
  const D = (u, s) => 1 + Math.floor(u() * s);
  const flip = u => u() < 0.5;
  function pickK(u, n, k) { const a = range(0, n - 1); for (let i = 0; i < k; i++) { const j = i + Math.floor(u() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); }
  const rank = c => c % 13, suit = c => Math.floor(c / 13);

  // ================== TAKE OR PASS ==================
  // Each returns { desc, fair, sim(u) }; desc is what you get for the price
  const BETS = {
    1: [
      () => { const m = R(1, 4); return { desc: `Roll a die. Win ${m === 1 ? 'the face value' : `${m}× the face value`} in dollars.`, fair: 3.5 * m, sim: u => m * D(u, 6) }; },
      () => { const w = R(2, 10) * 2; return { desc: `Flip a coin. Win $${w} on heads.`, fair: w / 2, sim: u => (flip(u) ? w : 0) }; },
      () => { const w = R(2, 8) * 4; return { desc: `Draw a card. Win $${w} on a heart.`, fair: w / 4, sim: u => (suit(pickK(u, 52, 1)[0]) === 0 ? w : 0) }; },
      () => { const k = R(3, 5), w = R(2, 6) * 6; return { desc: `Roll a die. Win $${w} on ${k} or higher.`, fair: (w * (7 - k)) / 6, sim: u => (D(u, 6) >= k ? w : 0) }; },
      () => { const w = R(2, 8) * 6; return { desc: `Roll a die. Win $${w} on a six.`, fair: w / 6, sim: u => (D(u, 6) === 6 ? w : 0) }; },
    ],
    2: [
      () => ({ desc: 'Roll two dice. Win the sum in dollars.', fair: 7, sim: u => D(u, 6) + D(u, 6) }),
      () => ({ desc: 'Roll two dice. Win the higher number in dollars.', fair: 161 / 36, sim: u => Math.max(D(u, 6), D(u, 6)) }),
      () => { const n = R(2, 6), a = R(1, 5); return { desc: `Flip ${n} coins. Win $${a} per head.`, fair: (n * a) / 2, sim: u => { let h = 0; for (let i = 0; i < n; i++) if (flip(u)) h++; return h * a; } }; },
      () => { const w = R(3, 9) * 6; return { desc: `Roll two dice. Win $${w} on doubles.`, fair: w / 6, sim: u => (D(u, 6) === D(u, 6) ? w : 0) }; },
      () => ({ desc: 'Draw a card (A = 1, K = 13). Win its value in dollars.', fair: 7, sim: u => rank(pickK(u, 52, 1)[0]) + 1 }),
      () => { const w = R(2, 7) * 13; return { desc: `Draw a card. Win $${w} on a red card or an ace.`, fair: (w * 28) / 52, sim: u => { const c = pickK(u, 52, 1)[0]; return suit(c) < 2 || rank(c) === 0 ? w : 0; } }; },
      () => { const s = R(4, 10), w = R(4, 12) * 6, ways = 6 - Math.abs(7 - s); return { desc: `Roll two dice. Win $${w} if the sum is ${s}.`, fair: (w * ways) / 36, sim: u => (D(u, 6) + D(u, 6) === s ? w : 0) }; },
    ],
    3: [
      () => ({ desc: 'Roll two dice. Win their product in dollars.', fair: 12.25, sim: u => D(u, 6) * D(u, 6) }),
      () => ({ desc: 'Roll two dice. Win the lower number in dollars.', fair: 91 / 36, sim: u => Math.min(D(u, 6), D(u, 6)) }),
      () => { const n = R(3, 7); return { desc: `Flip until tails, at most ${n} flips. Win $2 for each head doubled: $1, $2, $4…`, fair: sum(range(1, n).map(k => 2 ** (k - 1) * 0.5 ** (k + (k === n ? 0 : 1)))), sim: u => { let h = 0; while (h < n && flip(u)) h++; return h ? 2 ** (h - 1) : 0; } }; },
      () => ({ desc: 'Roll a die. You may re-roll once. Win the final roll in dollars.', fair: 4.25, sim: u => { const a = D(u, 6); return a >= 4 ? a : D(u, 6); } }),
      () => { const k = R(3, 6); return { desc: `Draw ${k === 3 ? 'three' : k === 4 ? 'four' : k === 5 ? 'five' : 'six'} cards. Win $10 per ace.`, fair: (10 * k) / 13, sim: u => 10 * pickK(u, 52, k).filter(c => rank(c) === 0).length }; },
      () => { const w = R(4, 10) * 5; return { desc: `Roll three dice. Win $${w} if all differ.`, fair: (w * 5) / 9, sim: u => (new Set([D(u, 6), D(u, 6), D(u, 6)]).size === 3 ? w : 0) }; },
      () => { const k = R(5, 9); let v = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) v += Math.max(a + b - k, 0); return { desc: `Roll two dice. Win max(sum − ${k}, 0) in dollars.`, fair: v / 36, sim: u => Math.max(D(u, 6) + D(u, 6) - k, 0) }; },
      () => { const w = R(3, 9) * 10; return { desc: `Roll a die four times. Win $${w} on at least one six.`, fair: w * (1 - (5 / 6) ** 4), sim: u => { for (let i = 0; i < 4; i++) if (D(u, 6) === 6) return w; return 0; } }; },
    ],
  };
  const takeLevel = streak => (streak < 4 ? 1 : streak < 9 ? 2 : 3);

  // A price close enough to fair to need thinking, never exactly fair
  function takeBet(streak) {
    const level = takeLevel(streak);
    for (;;) {
      const b = P(BETS[level])();
      const minEdge = Math.max(0.25, b.fair * 0.05), maxEdge = Math.max(1, b.fair * (level === 1 ? 0.4 : level === 2 ? 0.28 : 0.18));
      const sign = rnd() < 0.5 ? 1 : -1;
      const grid = 0.25;
      const cost = Math.round((b.fair + sign * (minEdge + rnd() * (maxEdge - minEdge))) / grid) * grid;
      if (cost <= 0) continue;
      const edge = b.fair - cost;       // what taking the bet is worth
      if (Math.abs(edge) < minEdge * 0.95) continue;
      return { text: `Pay ${money(cost)}.`, desc: b.desc, fair: b.fair, cost, edge, level, sim: b.sim };
    }
  }

  // ================== BANK OR BUST ==================
  // A die with some bust faces. Non-bust faces add to the pot; a bust loses `loss` of it.
  function bankRound() {
    for (;;) {
      const d = P([6, 6, 8, 10, 12]);
      const nBust = d === 6 ? 1 : R(1, Math.max(2, Math.floor(d / 4)));
      const bust = range(1, d).sort(() => rnd() - 0.5).slice(0, nBust).sort((a, b) => a - b);
      const loss = rnd() < 0.3 ? 0.5 : 1;
      // Start near the turning point so every round has a real decision in it
      const safeSum = range(1, d).filter(f => !bust.includes(f)).reduce((a, f) => a + f, 0);
      const turn = safeSum / (bust.length * loss);
      const start = Math.max(1, Math.round(turn * (0.45 + rnd() * 0.75)));
      const r = bankSolve({ d, bust, loss, start });
      if (Math.abs(r.rollValue(start) - start) > start * 0.01) return r;   // no coin-flip first calls
    }
  }

  // One-step-ahead is optimal here: the gain from a roll only falls as the pot grows
  function bankSolve(round) {
    const { d, bust, loss } = round;
    const safe = range(1, d).filter(f => !bust.includes(f));
    const threshold = sum(safe) / (bust.length * loss);   // roll while pot < threshold
    const memo = new Map();
    const V = p => {
      if (p >= threshold) return p;
      if (memo.has(p)) return memo.get(p);
      const v = rollValue(p);
      memo.set(p, v);
      return v;
    };
    function rollValue(p) { return (sum(safe.map(f => V(p + f))) + bust.length * p * (1 - loss)) / d; }
    return { ...round, safe, threshold, V, rollValue };
  }
  // Regret of an action at pot p; roll ? choose to roll : choose to stop
  function bankRegret(r, p, roll) {
    const q = r.rollValue(p), best = Math.max(q, p);
    return best - (roll ? q : p);
  }
  const bankRoundScore = (r, regret) => 10 * (1 - Math.min(1, regret / (0.05 * r.V(r.start))));

  // ================== NEXT CARD ==================
  const SIZES = [0.1, 0.25, 0.5];
  function shuffledDeck(n) { const a = range(0, 51); for (let i = 0; i < n && i < 51; i++) { const j = i + Math.floor(rnd() * (52 - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
  // Odds from the unseen cards; matching ranks lose. seen includes the current card.
  function nextOdds(seen, current) {
    const left = Array(13).fill(4);
    seen.forEach(c => { left[rank(c)]--; });
    const total = sum(left), r = rank(current);
    return {
      higher: sum(left.slice(r + 1)) / total,
      lower: sum(left.slice(0, r)) / total,
      total,
    };
  }
  const growth = (p, f) => (f ? p * Math.log(1 + f) + (1 - p) * Math.log(1 - f) : 0);
  // Expected log growth (×100) of betting side with fraction f
  const nextPoints = (odds, side, f) => 100 * growth(side === 'higher' ? odds.higher : odds.lower, f);
  function nextBest(odds) {
    let best = { side: null, f: 0, pts: 0 };
    for (const side of ['higher', 'lower']) for (const f of SIZES) {
      const pts = nextPoints(odds, side, f);
      if (pts > best.pts) best = { side, f, pts };
    }
    return best;
  }

  // ================== WHICH URN? ==================
  const URN_SETS = [[7, 3], [6, 4], [8, 3], [8, 4], [9, 4], [7, 4], [6, 3]];
  const URN_N = 10, URN_MAX = 12, URN_WIN = 100;
  function urnRound() {
    for (;;) {
      const [hi, lo] = P(URN_SETS);
      const flipSides = rnd() < 0.5;
      const pA = (flipSides ? lo : hi) / URN_N, pB = (flipSides ? hi : lo) / URN_N;
      const prior = P([0.5, 0.5, 0.5, 0.3, 0.7, 0.4, 0.6]);
      const cost = P([1, 2, 3, 4, 5, 6]);
      const r = urnSolve({ pA, pB, prior, cost });
      if (r.drawValue(0, 0) > r.commit(0, 0).value + 1) return { ...r, truthA: rnd() < prior };
    }
  }
  function urnSolve(round) {
    const { pA, pB, prior, cost } = round;
    const post = (n, m) => {       // P(urn A | n red, m blue drawn)
      const a = prior * pA ** n * (1 - pA) ** m, b = (1 - prior) * pB ** n * (1 - pB) ** m;
      return a / (a + b);
    };
    const commit = (n, m) => {
      const p = post(n, m), side = p >= 0.5 ? 'A' : 'B', sure = Math.max(p, 1 - p);
      return { side, value: URN_WIN * (2 * sure - 1) };
    };
    const memo = new Map();
    const V = (n, m) => {
      const k = `${n},${m}`;
      if (memo.has(k)) return memo.get(k);
      const c = commit(n, m).value;
      const v = n + m >= URN_MAX ? c : Math.max(c, drawValue(n, m));
      memo.set(k, v);
      return v;
    };
    function drawValue(n, m) {
      if (n + m >= URN_MAX) return -Infinity;
      const p = post(n, m), red = p * pA + (1 - p) * pB;
      return -cost + red * V(n + 1, m) + (1 - red) * V(n, m + 1);
    }
    return { ...round, post, commit, V, drawValue };
  }
  function urnRegret(r, n, m, action) {     // action: 'draw' | 'A' | 'B'
    const best = r.V(n, m), p = r.post(n, m);
    if (action === 'draw') return best - r.drawValue(n, m);
    const sure = action === 'A' ? p : 1 - p;
    return best - URN_WIN * (2 * sure - 1);
  }
  const urnRoundScore = regret => 10 * (1 - Math.min(1, regret / (URN_WIN * 0.3)));

  // ================== LIKELIER? ==================
  function binomGE(n, k, p) { let s = 0; for (let i = k; i <= n; i++) s += Cx(n, i) * p ** i * (1 - p) ** (n - i); return s; }
  const WAYS3 = (() => { const m = {}; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) m[a + b + c] = (m[a + b + c] || 0) + 1; return m; })();
  const count = (n, f, u) => { let h = 0; for (let i = 0; i < n; i++) if (f(u)) h++; return h; };
  const EVENT_MAKERS = [
    () => { const s = R(2, 12); return { id: `s2${s}`, text: `Two dice sum to ${s}`, p: (6 - Math.abs(7 - s)) / 36, sim: u => +(D(u, 6) + D(u, 6) === s) }; },
    () => { const k = R(5, 11); let w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= k) w++; return { id: `g2${k}`, text: `Two dice sum to at least ${k}`, p: w / 36, sim: u => +(D(u, 6) + D(u, 6) >= k) }; },
    () => ({ id: 'dbl', text: 'Two dice show doubles', p: 1 / 6, sim: u => +(D(u, 6) === D(u, 6)) }),
    () => { const n = R(2, 8); return { id: `six${n}`, text: `At least one six in ${n} rolls`, p: 1 - (5 / 6) ** n, sim: u => +(count(n, v => D(v, 6) === 6, u) > 0) }; },
    () => { const n = R(2, 8); return { id: `nos${n}`, text: `No sixes in ${n} rolls`, p: (5 / 6) ** n, sim: u => +(count(n, v => D(v, 6) === 6, u) === 0) }; },
    () => { const n = R(2, 10), k = R(1, n - 1); return { id: `xh${n}.${k}`, text: `Exactly ${k} head${k > 1 ? 's' : ''} in ${n} flips`, p: Cx(n, k) / 2 ** n, sim: u => +(count(n, flip, u) === k) }; },
    () => { const n = R(3, 10), k = R(2, n); return { id: `gh${n}.${k}`, text: `At least ${k} heads in ${n} flips`, p: binomGE(n, k, 0.5), sim: u => +(count(n, flip, u) >= k) }; },
    () => { const n = R(2, 6); return { id: `same${n}`, text: `${n} coins all land the same way`, p: 2 / 2 ** n, sim: u => { const h = count(n, flip, u); return +(h === 0 || h === n); } }; },
    () => { const v = P([['a heart', 13, c => suit(c) === 0], ['a face card', 12, c => rank(c) >= 10], ['an ace', 4, c => rank(c) === 0], ['red', 26, c => suit(c) < 2], ['a red face card', 6, c => suit(c) < 2 && rank(c) >= 10], ['a heart or an ace', 16, c => suit(c) === 0 || rank(c) === 0], ['a 2, 3 or 4', 12, c => rank(c) >= 1 && rank(c) <= 3]]); return { id: `c${v[0]}`, text: `A drawn card is ${v[0]}`, p: v[1] / 52, sim: u => +v[2](pickK(u, 52, 1)[0]) }; },
    () => { const v = P([['both red', 650, c => suit(c) < 2], ['both hearts', 156, c => suit(c) === 0], ['both aces', 12, c => rank(c) === 0], ['both face cards', 132, c => rank(c) >= 10]]); return { id: `2c${v[0]}`, text: `Two drawn cards are ${v[0]}`, p: v[1] / (52 * 51), sim: u => +pickK(u, 52, 2).every(v[2]) }; },
    () => ({ id: '3diff', text: 'Three dice all differ', p: 5 / 9, sim: u => +(new Set([D(u, 6), D(u, 6), D(u, 6)]).size === 3) }),
    () => { const s = R(5, 16); return { id: `s3${s}`, text: `Three dice sum to ${s}`, p: WAYS3[s] / 216, sim: u => +(D(u, 6) + D(u, 6) + D(u, 6) === s) }; },
    () => { const m = R(2, 6); return { id: `max${m}`, text: `The higher of two dice is ${m}`, p: (2 * m - 1) / 36, sim: u => +(Math.max(D(u, 6), D(u, 6)) === m) }; },
    () => { const n = R(5, 45); let v = 1; for (let i = 0; i < n; i++) v *= (365 - i) / 365; return { id: `bd${n}`, text: `A shared birthday among ${n} people`, p: 1 - v, sim: u => { const s = new Set(); for (let i = 0; i < n; i++) s.add(D(u, 365)); return +(s.size < n); } }; },
    () => ({ id: 'podd', text: 'The product of two dice is odd', p: 0.25, sim: u => (D(u, 6) * D(u, 6)) % 2 }),
    () => { const k = P([2, 3, 4, 5, 6]); let w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if ((a + b) % k === 0) w++; return { id: `m${k}`, text: `The sum of two dice is divisible by ${k}`, p: w / 36, sim: u => +((D(u, 6) + D(u, 6)) % k === 0) }; },
    () => { const k = R(2, 5); return { id: `fa${k}`, text: `An ace in ${k} drawn cards`, p: 1 - Cx(48, k) / Cx(52, k), sim: u => +pickK(u, 52, k).some(c => rank(c) === 0) }; },
  ];
  const GAPS = [[0.15, 0.6], [0.07, 0.15], [0.03, 0.07], [0.012, 0.03]];
  const likelyTier = solved => (solved < 5 ? 0 : solved < 12 ? 1 : solved < 20 ? 2 : 3);
  const likelySeconds = solved => Math.max(5, 12 - Math.floor(solved / 4));
  function likelyPair(solved) {
    let [lo, hi] = GAPS[likelyTier(solved)];
    for (let tries = 0; ; tries++) {
      const a = P(EVENT_MAKERS)(), b = P(EVENT_MAKERS)();
      const gap = Math.abs(a.p - b.p);
      if (a.id !== b.id && gap >= lo && gap <= hi && a.p > 0.001 && b.p > 0.001) return rnd() < 0.5 ? [a, b] : [b, a];
      if (tries % 400 === 399) { lo = Math.max(0.012, lo * 0.7); hi = Math.min(0.9, hi * 1.3); }
    }
  }

  return {
    setRng, takeBet, takeLevel, BETS,
    bankRound, bankSolve, bankRegret, bankRoundScore,
    SIZES, shuffledDeck, nextOdds, nextPoints, nextBest, rank, suit,
    urnRound, urnSolve, urnRegret, urnRoundScore, URN_WIN, URN_MAX, URN_N,
    likelyPair, likelySeconds, likelyTier, EVENT_MAKERS,
  };
})();

if (typeof module !== 'undefined') module.exports = OddsEngine;
