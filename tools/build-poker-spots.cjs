/* ===========================================================
   Builds poker-spots.js: question banks for two poker puzzles.

     node tools/build-poker-spots.cjs

   SPOT (best action)
   - Opening spots: hand + seat, unopened pot → fold / limp / raise,
     checked against a standard 6-max opening chart. Only hands
     clearly inside or outside the chart (not on its edge).
   - All-in spots: a bot of a given style shoves; the style defines
     its range. Exact equity vs that range is compared with the pot
     odds; only spots with a clear margin are kept.
   READ (read the opponent)
   - Real bot-vs-you hands are simulated (you check and call). For
     the bot's betting line, many hole-card candidates are replayed
     through the same bot; those that play the line identically
     give the probability of each hand class. Only scenarios with
     a clear favourite are kept.
   =========================================================== */

const fs = require('fs');
const path = require('path');
const P = require('../poker-engine.js');
const B = require('../poker-bots.js');

let seed = 20261106;
const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = arr => arr[Math.floor(rng() * arr.length)];
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = x => Math.round(x * 100);
const cs = cards => cards.map(P.cardStr);
const R = P.RANKS;

// ============================================================
//  OPENING CHARTS (6-max, 100bb, raise-first-in)
// ============================================================
const CHARTS = {
  UTG: '22+,A2s+,KTs+,QTs+,JTs,T9s,98s,AJo+,KQo',
  HJ:  '22+,A2s+,K9s+,Q9s+,J9s+,T9s,98s,87s,ATo+,KJo+,QJo',
  CO:  '22+,A2s+,K6s+,Q8s+,J8s+,T8s+,97s+,86s+,76s,65s,A8o+,KTo+,QTo+,JTo',
  BTN: '22+,A2s+,K2s+,Q5s+,J7s+,T7s+,96s+,85s+,74s+,64s+,53s+,A2o+,K8o+,Q9o+,J9o+,T9o',
  SB:  '22+,A2s+,K5s+,Q7s+,J8s+,T8s+,97s+,86s+,75s+,65s,A4o+,K9o+,QTo+,JTo',
};
const BEHIND = { UTG: 5, HJ: 4, CO: 3, BTN: 2, SB: 1 };

// "A5s" style class names
function classOf([a, b]) {
  let r1 = P.rankOf(a), r2 = P.rankOf(b);
  if (r2 > r1) [r1, r2] = [r2, r1];
  if (r1 === r2) return R[r1] + R[r2];
  return R[r1] + R[r2] + (P.suitOf(a) === P.suitOf(b) ? 's' : 'o');
}
function parseRange(text) {
  const set = new Set();
  for (const tok of text.split(',')) {
    const plus = tok.endsWith('+');
    const t = plus ? tok.slice(0, -1) : tok;
    const hi = R.indexOf(t[0]), lo = R.indexOf(t[1]);
    if (hi === lo) {
      for (let r = lo; r <= (plus ? 12 : lo); r++) set.add(R[r] + R[r]);
    } else {
      for (let r = lo; r <= (plus ? hi - 1 : lo); r++) set.add(R[hi] + R[r] + t[2]);
    }
  }
  return set;
}
const comboCount = cls => (cls.length === 2 ? 6 : cls[2] === 's' ? 4 : 12);
const CHART_SETS = Object.fromEntries(Object.entries(CHARTS).map(([k, v]) => [k, parseRange(v)]));
const chartPct = pos => (100 * [...CHART_SETS[pos]].reduce((s, c) => s + comboCount(c), 0)) / 1326;

// Neighbouring classes one step weaker / stronger (same suitedness)
function neighbours(cls) {
  const hi = R.indexOf(cls[0]), lo = R.indexOf(cls[1]);
  if (hi === lo) return [lo > 0 ? R[lo - 1] + R[lo - 1] : null, lo < 12 ? R[lo + 1] + R[lo + 1] : null];
  return [lo > 0 ? R[hi] + R[lo - 1] + cls[2] : null, lo + 1 < hi ? R[hi] + R[lo + 1] + cls[2] : null];
}
const handWords = cls => {
  const name = r => P.RANK_NAME[R.indexOf(r)];
  if (cls.length === 2) return `pocket ${name(cls[0]).toLowerCase()}s`.replace('sixs', 'sixes');
  return `${name(cls[0])}-${name(cls[1])} ${cls[2] === 's' ? 'suited' : 'offsuit'}`;
};

function openingSpots(n) {
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < 20000) {
    const deck = P.shuffledDeck(rng);
    const hole = deck.slice(0, 2);
    const cls = classOf(hole);
    const pos = pick(Object.keys(CHARTS));
    const key = pos + cls;
    if (seen.has(key)) continue;
    const chart = CHART_SETS[pos];
    const inside = chart.has(cls);
    const [weaker, stronger] = neighbours(cls);
    // Skip the chart's edge: answer must not hinge on one hand class
    if (inside && weaker && !chart.has(weaker)) continue;
    if (!inside && stronger && chart.has(stronger)) continue;
    if (!inside && cls.endsWith('o') && chart.has(cls.slice(0, 2) + 's') && rng() < 0.5) continue;   // keep some "suited would be fine" lessons
    const raises = out.filter(s => s.answer !== 'Fold').length;
    if (inside ? raises >= n / 2 : out.length - raises >= n / 2) continue;   // half raises, half folds
    seen.add(key);
    const answer = inside ? 'Raise' : 'Fold';
    const share = chartPct(pos).toFixed(0);
    const explain = `From the ${pos === 'BTN' ? 'button' : pos === 'SB' ? 'small blind' : pos} there ${BEHIND[pos] === 1 ? 'is 1 player' : `are ${BEHIND[pos]} players`} left to act behind you, so a standard opening range is about ${share}% of hands. `
      + `${handWords(cls)} is ${inside ? 'comfortably inside it: open with a raise' : 'outside it: fold'}. `
      + 'Limping (just calling the big blind) is rarely right when you are first in — raise or fold.';
    out.push({
      kind: 'open', hole: cs(hole), pos, stack: 100,
      q: `Everyone folds to you in the ${pos === 'BTN' ? 'button' : pos === 'SB' ? 'small blind' : pos} seat. Blinds 5/10, 100 big blinds deep. What do you do?`,
      options: ['Fold', 'Limp (call 10)', 'Raise to 25'], answer: answer === 'Raise' ? 'Raise to 25' : 'Fold', explain,
    });
  }
  return out;
}

// ============================================================
//  ALL-IN CALL SPOTS
// ============================================================
// Villain ranges by style: predicates on villain hole + board
const cat = (hole, board) => P.categoryOf(P.evaluate([...hole, ...board]));
const topBoardRank = board => Math.max(...board.map(P.rankOf));
const pairWithHole = (hole, board) => {
  const ranks = board.map(P.rankOf);
  return hole.some(c => ranks.includes(P.rankOf(c))) || P.rankOf(hole[0]) === P.rankOf(hole[1]);
};
const flushDraw = (hole, board) => [0, 1, 2, 3].some(s => [...hole, ...board].filter(c => P.suitOf(c) === s).length === 4 && hole.some(c => P.suitOf(c) === s));
const RANGES = {
  rock: {
    style: 'Tight', text: 'two pair or better',
    test: (h, b) => cat(h, b) >= 2,
  },
  shark: {
    style: 'Solid', text: 'top pair or better',
    test: (h, b) => cat(h, b) >= 2 || (cat(h, b) === 1 && (h.some(c => P.rankOf(c) === topBoardRank(b)) || (P.rankOf(h[0]) === P.rankOf(h[1]) && P.rankOf(h[0]) > topBoardRank(b)))),
  },
  maniac: {
    style: 'Aggressive', text: 'any pair or a flush draw',
    test: (h, b) => (cat(h, b) >= 1 && pairWithHole(h, b)) || cat(h, b) >= 2 || flushDraw(h, b),
  },
  tourist: {
    style: 'Loose', text: 'any two cards',
    test: () => true,
  },
};

// Exact equity of hero vs every villain combo in range, all run-outs
function equityVsRange(hero, board, test) {
  const used = new Set([...hero, ...board]);
  const rest = [];
  for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
  const combos = [];
  for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
    const v = [rest[i], rest[j]];
    if (test(v, board)) combos.push(v);
  }
  if (combos.length < 6) return null;
  let won = 0, n = 0;
  const need = 5 - board.length;
  for (const v of combos) {
    const deck = rest.filter(c => c !== v[0] && c !== v[1]);
    const runs = need === 1 ? deck.map(c => [c]) : deck.flatMap((c, i) => deck.slice(i + 1).map(d => [c, d]));
    for (const run of runs) {
      const full = [...board, ...run];
      const h = P.evaluate([...hero, ...full]), vs = P.evaluate([...v, ...full]);
      won += h > vs ? 1 : h === vs ? 0.5 : 0;
      n++;
    }
  }
  return { eq: won / n, combos: combos.length };
}

function allinSpots(n) {
  const out = [];
  let guard = 0, calls = 0;
  while (out.length < n && guard++ < 4000) {
    const deck = P.shuffledDeck(rng);
    const hero = deck.slice(0, 2);
    const street = rng() < 0.75 ? 'turn' : 'flop';
    const board = deck.slice(2, street === 'turn' ? 6 : 5);
    const heroCat = cat(hero, board);
    // Interesting hero hands: a pair using a hole card, or a draw
    if (!(heroCat >= 1 && pairWithHole(hero, board)) && !flushDraw(hero, board)) continue;
    if (heroCat >= 4) continue;   // straights and better are too easy
    const style = pick(Object.keys(RANGES));
    const range = RANGES[style];
    const res = equityVsRange(hero, board, range.test);
    if (!res) continue;
    const pot = ri(6, 30) * 10;
    const bet = Math.round((pot * (0.5 + rng())) / 10) * 10;
    const needed = bet / (pot + 2 * bet);
    if (Math.abs(res.eq - needed) < 0.07) continue;       // too close to call either way
    const call = res.eq > needed;
    if (call ? calls > n / 2 + 2 : out.length - calls > n / 2 + 2) continue;   // keep it balanced
    if (call) calls++;
    const name = pick(['Dusty', 'Marge', 'Big Earl', 'Lucky Lou', 'Rosa', 'Slim', 'Duke', 'Ivy', 'The Prof', 'Nina', 'Tex', 'Pearl']);
    const mine = P.describe(P.evaluate([...hero, ...board]));
    out.push({
      kind: 'allin', hole: cs(hero), board: cs(board), pot, bet, villain: name, style: range.style,
      q: `${street === 'turn' ? 'Turn' : 'Flop'}. Pot is ${pot}. ${name} (${range.style}) moves all-in for ${bet}. A ${range.style.toLowerCase()} player only does this with ${range.text}. Call or fold?`,
      options: ['Fold', `Call ${bet}`], answer: call ? `Call ${bet}` : 'Fold',
      explain: `You'd pay ${bet} to win ${pot + bet}, so you need ${pct(needed)}% equity. `
        + `Against ${range.text} (${res.combos} possible hands) your ${mine.toLowerCase()}${flushDraw(hero, board) && heroCat < 5 ? ' plus flush draw' : ''} wins ${pct(res.eq)}% of the time. `
        + (call ? `${pct(res.eq)}% > ${pct(needed)}%: calling makes money over time.` : `${pct(res.eq)}% < ${pct(needed)}%: fold, even though it hurts.`),
      equity: pct(res.eq), needed: pct(needed),
    });
  }
  return out;
}

// ============================================================
//  READ THE OPPONENT
// ============================================================
const CLASSES = ['Two pair or better', 'Top pair or an overpair', 'A weaker pair', 'No pair'];
function handClass(hole, board) {
  const c = cat(hole, board);
  if (c >= 2) return 0;
  if (c === 1) {
    const top = topBoardRank(board);
    const pr = P.rankOf(hole[0]) === P.rankOf(hole[1]) ? P.rankOf(hole[0]) : hole.map(P.rankOf).find(r => board.some(b => P.rankOf(b) === r));
    if (pr === undefined) return 3;   // the pair is on the board only
    return pr >= top ? 1 : 2;
  }
  return 3;
}

// Play one hand: villain on the button (bot), you in the big blind checking and calling.
// Returns villain's action types per street, or null if it folds / the hand ends early.
function playLine(villainHole, heroHole, board, prof, r) {
  const players = [{ id: 'v', name: 'V', stack: 1000 }, { id: 'h', name: 'H', stack: 1000 }];
  const g = new P.Game({ players, sb: 5, bb: 10, button: 1, rng: r });
  g.startHand();
  players[0].hole = villainHole; players[1].hole = heroHole;
  // deck pops from the end: burn, flop×3, burn, turn, burn, river
  g.deck = [board[4], -3, board[3], -2, board[2], board[1], board[0], -1];
  const line = [];
  while (!g.over) {
    if (g.toAct === 0) {
      const a = B.decide(g, prof, r);
      const facing = g.legal().toCall > 0;
      const t = a.type === 'raise' ? (g.street === 'preflop' ? 'raise' : facing ? 'raise' : 'bet') : a.type === 'call' && g.street === 'preflop' && g.currentBet === g.bb ? 'limp' : a.type;
      if (t === 'fold') return null;
      line.push(`${g.street}:${t}`);
      g.act(a);
    } else {
      const L = g.legal();
      g.act(L.canCheck ? { type: 'check' } : { type: 'call' });
    }
    if (g.street === 'river' && line.some(x => x.startsWith('river:'))) break;
  }
  return line.filter(x => !x.endsWith(':check') || !x.startsWith('preflop'));
}

function readSpots(n, maxTries = 1800) {
  const out = [];
  const lineSeen = new Map();
  let guard = 0;
  const perAnswer = Math.ceil(n / 3);   // no single answer dominates the bank
  while (out.length < n && guard++ < maxTries) {
    const deck = P.shuffledDeck(rng);
    const villainHole = deck.slice(0, 2), heroHole = deck.slice(2, 4), board = deck.slice(4, 9);
    const style = pick(['rock', 'shark', 'maniac', 'station', 'tourist']);
    const prof = { ...B.STYLES[style], style, iters: 120, noise: 0.06, level: 'medium' };
    const line = playLine(villainHole, heroHole, board, prof, rng);
    if (!line || line.length < 3) continue;
    const key = style + line.join();
    if ((lineSeen.get(key) || 0) >= 2) continue;
    // Posterior: replay many candidate hands through the same bot
    const counts = [0, 0, 0, 0];
    let accepted = 0;
    const known = new Set([...heroHole, ...board]);
    const pool = [];
    for (let c = 0; c < 52; c++) if (!known.has(c)) pool.push(c);
    for (let it = 0; it < 2500 && accepted < 900; it++) {
      const i = Math.floor(rng() * pool.length);
      let j = Math.floor(rng() * (pool.length - 1)); if (j >= i) j++;
      const cand = [pool[i], pool[j]];
      const l2 = playLine(cand, heroHole, board, prof, rng);
      if (!l2 || l2.join() !== line.join()) continue;
      accepted++;
      counts[handClass(cand, board)]++;
    }
    if (accepted < 200) continue;
    const probs = counts.map(c => c / accepted);
    const order = probs.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
    if (order[0][0] - order[1][0] < 0.10) continue;   // no clear favourite
    if (out.filter(r => r.answer === CLASSES[order[0][1]]).length >= perAnswer) continue;
    lineSeen.set(key, (lineSeen.get(key) || 0) + 1);
    const name = pick(['Dusty', 'Marge', 'Big Earl', 'Lucky Lou', 'Rosa', 'Slim', 'Duke', 'Ivy', 'The Prof', 'Nina', 'Tex', 'Pearl']);
    out.push({
      kind: 'read', hole: cs(heroHole), board: cs(board), villain: name, style: B.STYLES[style].label,
      line: line.map(x => x.split(':')),
      actual: CLASSES[handClass(villainHole, board)], actualHole: cs(villainHole),
      options: CLASSES, answer: CLASSES[order[0][1]], probs: probs.map(pct),
    });
  }
  return out;
}

// ============================================================
//  BUILD
// ============================================================
//   node tools/build-poker-spots.cjs                         full rebuild of both banks
//   node tools/build-poker-spots.cjs --read-only --seed 7 --target 40 --out part.json
//        → extra READ scenarios only (run several seeds in parallel)
//   node tools/build-poker-spots.cjs --merge part1.json part2.json …
//        → add them to the current READ_BANK (deduplicated), SPOT_BANK unchanged
const arg = (name, def) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : def; };
const OUT_FILE = path.join(__dirname, '..', 'poker-spots.js');
const writeBanks = (spots, reads) => fs.writeFileSync(OUT_FILE, `// Generated by tools/build-poker-spots.cjs — do not edit by hand.
// SPOT_BANK: best-action spots (opening chart + all-in calls with exact equity vs range).
// READ_BANK: bot betting lines with the probability of each hand class (from replaying the bots).
const SPOT_BANK = ${JSON.stringify(spots)};
const READ_BANK = ${JSON.stringify(reads)};
`);

if (process.argv.includes('--read-only')) {
  seed = Number(arg('--seed', 1)) * 7919 + 13;
  const reads = readSpots(Number(arg('--target', 40)), Number(arg('--guard', 1800)));
  fs.writeFileSync(arg('--out'), JSON.stringify(reads));
  console.log(`seed ${arg('--seed')}: ${reads.length} read scenarios`);
  process.exit(0);
}
if (process.argv.includes('--merge')) {
  const current = new Function(`${fs.readFileSync(OUT_FILE, 'utf8')}; return { SPOT_BANK, READ_BANK };`)();
  const key = r => r.style + r.board.join('') + r.hole.join('') + r.line.flat().join();
  const seenKeys = new Set(current.READ_BANK.map(key));
  const reads = [...current.READ_BANK];
  for (const file of process.argv.slice(process.argv.indexOf('--merge') + 1)) {
    for (const r of JSON.parse(fs.readFileSync(file, 'utf8'))) if (!seenKeys.has(key(r))) { seenKeys.add(key(r)); reads.push(r); }
  }
  writeBanks(current.SPOT_BANK, reads);
  const byAns = {}; reads.forEach(r => { byAns[r.answer] = (byAns[r.answer] || 0) + 1; });
  console.log(`read scenarios: ${reads.length}`, byAns);
  process.exit(0);
}

const t0 = Date.now();
const opens = openingSpots(36);
console.log(`opening spots: ${opens.length} (raise ${opens.filter(s => s.answer !== 'Fold').length})`);
const allins = allinSpots(54);
console.log(`all-in spots: ${allins.length} (call ${allins.filter(s => s.answer !== 'Fold').length})`);
const reads = readSpots(60);
const byAns = {}; reads.forEach(r => { byAns[r.answer] = (byAns[r.answer] || 0) + 1; });
console.log(`read spots: ${reads.length}`, byAns);
console.log(`built in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

writeBanks([...opens, ...allins], reads);
console.log('wrote poker-spots.js');
