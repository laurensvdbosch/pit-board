// Checks the Odds game engines against simulation. Run through test-odds.cjs.
'use strict';
const E = require('../odds-engine.js');
const { bad, mulberry } = require('./test-odds.cjs');

const QUICK = process.argv.includes('--quick');
const N = QUICK ? 30000 : 100000;
let seed = 900000;

// ---------- Take or Pass ----------
for (const level of [1, 2, 3]) {
  E.BETS[level].forEach((make, idx) => {
    for (let d = 0; d < (QUICK ? 3 : 8); d++) {
      const b = make();
      const u = mulberry(seed++);
      let s = 0, s2 = 0;
      for (let i = 0; i < N; i++) { const x = b.sim(u); s += x; s2 += x * x; }
      const mean = s / N, se = Math.sqrt(Math.max(s2 / N - mean * mean, 1e-9) / N);
      if (Math.abs(mean - b.fair) > Math.max(5 * se, 0.01)) bad(`take L${level}#${idx}: fair ${b.fair} vs sim ${mean} — ${b.desc}`);
    }
  });
}
{
  const streaks = [0, 3, 6, 12, 20];
  let pos = 0, n = 0, zero = 0;
  for (let i = 0; i < 30000; i++) {
    const b = E.takeBet(streaks[i % 5]);
    if (b.cost <= 0 || !Number.isFinite(b.edge)) bad(`take: bad cost ${b.cost}`);
    if (Math.abs(b.edge) < 0.2) zero++;
    if (b.edge > 0) pos++;
    n++;
    if (b.cost % 0.25 !== 0) bad(`take: cost off the grid ${b.cost}`);
  }
  const share = Math.round(100 * pos / n);
  console.log(`Take or Pass: ${share}% of bets are worth taking, ${zero} near-fair of ${n}`);
  if (share < 40 || share > 60) bad(`take: positive share ${share}%`);
  if (zero) bad(`take: ${zero} bets too close to fair`);
}

// ---------- Bank or Bust ----------
{
  // Solver vs simulating the optimal policy; a wrong threshold also makes other thresholds beat it
  for (let t = 0; t < (QUICK ? 12 : 40); t++) {
    const r = E.bankRound();
    const u = mulberry(seed++);
    const play = limit => { let p = r.start; while (p < limit) { const f = D6(u, r.d); if (r.bust.includes(f)) return p * (1 - r.loss); p += f; } return p; };
    let s = 0, s2 = 0; for (let i = 0; i < N; i++) { const x = play(r.threshold); s += x; s2 += x * x; }
    const est = s / N, se = Math.sqrt((s2 / N - est * est) / N);
    if (Math.abs(est - r.V(r.start)) > Math.max(5 * se, 0.02)) bad(`bank: V ${r.V(r.start)} vs sim ${est} — ${JSON.stringify({ d: r.d, b: r.bust, l: r.loss, s: r.start })}`);
    for (const m of [0.5, 0.75, 1.3, 2]) { let a = 0; for (let i = 0; i < N / 5; i++) a += play(r.threshold * m); if (a / (N / 5) > r.V(r.start) * 1.02) bad(`bank: threshold ×${m} beat the "optimal" policy`); }
  }
  // Perfect play scores 10 per round; rolling forever or stopping at once scores less
  let reckless = 0, timid = 0, n = 0;
  for (let t = 0; t < 2000; t++) {
    const r = E.bankRound();
    if (E.bankRegret(r, r.start, r.start < r.threshold) > 1e-9) bad('bank: optimal action has regret');
    if (E.bankRoundScore(r, 0) !== 10) bad('bank: zero regret should score 10');
    timid += E.bankRoundScore(r, E.bankRegret(r, r.start, false));
    // Keep rolling until the die actually busts
    let p = r.start, reg = 0;
    for (;;) { reg += E.bankRegret(r, p, true); const f = 1 + Math.floor(Math.random() * r.d); if (r.bust.includes(f)) break; p += f; }
    reckless += E.bankRoundScore(r, reg); n++;
  }
  console.log(`Bank or Bust: perfect 10.0/round, instant stop ${(timid / n).toFixed(1)}, never stopping ${(reckless / n).toFixed(1)}`);
  if (timid / n > 5) bad('bank: instantly stopping scores too well');
  if (reckless / n > 5) bad('bank: never stopping scores too well');
}
function D6(u, s) { return 1 + Math.floor(u() * s); }

// ---------- Next Card ----------
{
  let tot = 0, best = 0, worstSide = 0;
  for (let t = 0; t < 1500; t++) {
    const deck = E.shuffledDeck(26);
    if (new Set(deck).size !== 26) bad('next: repeated card');
    const seen = [];
    for (let i = 0; i < 25; i++) {
      seen.push(deck[i]);
      const o = E.nextOdds(seen, deck[i]);
      if (o.total !== 52 - seen.length) bad('next: wrong number of unseen cards');
      if (o.higher + o.lower > 1 + 1e-9 || o.higher < 0 || o.lower < 0) bad('next: bad odds');
      const b = E.nextBest(o);
      if (b.pts < 0) bad('next: best option is negative');
      best += b.pts;
      worstSide += E.nextPoints(o, o.higher >= o.lower ? 'lower' : 'higher', 0.5);
      // Verify the odds by brute force from the actual unseen deck
      if (t < 30) {
        const unseen = []; for (let c = 0; c < 52; c++) if (!seen.includes(c)) unseen.push(c);
        const hi = unseen.filter(c => E.rank(c) > E.rank(deck[i])).length / unseen.length;
        if (Math.abs(hi - o.higher) > 1e-9) bad('next: higher odds differ from brute force');
      }
      tot++;
    }
  }
  console.log(`Next Card: best play averages ${(best / 1500).toFixed(0)} pts a run, always backing the wrong side big ${(worstSide / 1500).toFixed(0)}`);
}

// ---------- Which Urn? ----------
{
  for (let t = 0; t < (QUICK ? 10 : 30); t++) {
    const r = E.urnRound();
    const u = mulberry(seed++);
    // Play the optimal policy against the real urn
    let s = 0;
    for (let i = 0; i < N / 2; i++) {
      const a = u() < r.prior; const pRed = a ? r.pA : r.pB;
      let n = 0, m = 0, pay = 0;
      for (;;) {
        const c = r.commit(n, m);
        if (n + m >= E.URN_MAX || c.value >= r.drawValue(n, m)) { pay += (c.side === 'A') === a ? E.URN_WIN : -E.URN_WIN; break; }
        pay -= r.cost;
        if (u() < pRed) n++; else m++;
      }
      s += pay;
    }
    const est = s / (N / 2);
    if (Math.abs(est - r.V(0, 0)) > 2.5) bad(`urn: V ${r.V(0, 0)} vs sim ${est} — ${JSON.stringify({ a: r.pA, b: r.pB, p: r.prior, c: r.cost })}`);
  }
  let instant = 0, always = 0, n = 0;
  for (let t = 0; t < 1500; t++) {
    const r = E.urnRound();
    if (E.urnRoundScore(0) !== 10) bad('urn: zero regret should score 10');
    instant += E.urnRoundScore(E.urnRegret(r, 0, 0, r.commit(0, 0).side));
    // Draw every ball allowed from the real urn, then make the call
    let reg = 0, a = 0, b = 0;
    for (let i = 0; i < E.URN_MAX; i++) { reg += E.urnRegret(r, a, b, 'draw'); if (Math.random() < (r.truthA ? r.pA : r.pB)) a++; else b++; }
    reg += E.urnRegret(r, a, b, r.commit(a, b).side);
    always += E.urnRoundScore(reg); n++;
  }
  console.log(`Which Urn?: perfect 10.0/round, instant guess ${(instant / n).toFixed(1)}, never committing ${(always / n).toFixed(1)}`);
}

// ---------- Likelier? ----------
{
  const seenIds = new Set();
  E.EVENT_MAKERS.forEach((make, idx) => {
    for (let d = 0; d < (QUICK ? 4 : 14); d++) {
      const ev = make();
      seenIds.add(ev.id);
      const u = mulberry(seed++);
      let s = 0; for (let i = 0; i < N; i++) s += ev.sim(u);
      const est = s / N, se = Math.sqrt(ev.p * (1 - ev.p) / N);
      if (Math.abs(est - ev.p) > Math.max(5 * se, 2e-4)) bad(`likely #${idx}: p ${ev.p} vs sim ${est} — ${ev.text}`);
    }
  });
  for (const solved of [0, 6, 14, 25, 60]) {
    let minGap = 1;
    for (let i = 0; i < 2000; i++) {
      const [a, b] = E.likelyPair(solved);
      if (a.id === b.id || !a.text || !b.text) bad('likely: bad pair');
      minGap = Math.min(minGap, Math.abs(a.p - b.p));
    }
    if (minGap < 0.012 - 1e-9) bad(`likely: gap ${minGap} too small at ${solved} solved`);
  }
  console.log(`Likelier?: ${seenIds.size} distinct events sampled`);
}
