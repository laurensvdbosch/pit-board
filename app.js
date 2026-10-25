/* ===========================================================
   PIT BOARD — Market Making & Arbitrage Trainer
   ---------------------------------------------------------
   Two modes:
   - Arbitrage: a board of quotes (stocks, sometimes listed on two
     venues, plus baskets of stocks). Trade only what locks in
     risk-free profit and finish flat.
   - Market Making: quote a bid/ask on one stock with a hidden true
     value while noise traders and informed traders hit your quotes.

   HOW TO EXTEND THIS FILE:
   - DIFFICULTY holds every tunable number for both modes.
   - genArbRound() builds a board. findOpportunities() works out
     what is actually profitable from the final prices, so the
     generator can stay loose without the scoring getting it wrong.
   - mmArrival() is one trader showing up — tweak behavior there.
   =========================================================== */

'use strict';

const ROUND_SECONDS = 60;
const MAX_QTY = 5;           // per tile, per side
const MAX_HINTS = 3;         // per round
const CLOSEOUT_PENALTY = 3;  // $/share slippage when unhedged positions are force-closed
const INV_LIMIT = 10;        // market making: max |inventory|

const TICKERS = [
  { sym: 'ORCA', name: 'Orca Robotics',  color: '#3FA7D6' },
  { sym: 'ZNTH', name: 'Zenith Bio',     color: '#A77BF3' },
  { sym: 'KLVR', name: 'Kleaver Foods',  color: '#E3689B' },
  { sym: 'BRIX', name: 'Brixton Build',  color: '#D9824B' },
  { sym: 'NOVA', name: 'Nova Grid',      color: '#45C4B0' },
  { sym: 'QUIL', name: 'Quill Media',    color: '#8C9BFF' },
  { sym: 'VEXO', name: 'Vexo Mining',    color: '#C9B458' },
  { sym: 'HALO', name: 'Halo Health',    color: '#F07F89' },
  { sym: 'TRNX', name: 'Tronix Semis',   color: '#5DB2FF' },
  { sym: 'MYRA', name: 'Myra Apparel',   color: '#C58BFF' },
  { sym: 'FJRD', name: 'Fjord Shipping', color: '#7FB7BE' },
  { sym: 'LUMA', name: 'Luma Energy',    color: '#F2A65A' },
];
const BASKET_NAMES = ['PITX', 'KOMB', 'MIXR', 'PAKT', 'BNDL'];
const VENUES = ['PIT-A', 'PIT-B'];
const GOOD_NEWS = ['beats earnings', 'raises guidance', 'wins major contract', 'upgraded to Buy', 'announces buyback'];
const BAD_NEWS = ['misses earnings', 'cuts guidance', 'CFO resigns', 'downgraded to Sell', 'announces recall'];

const DIFFICULTY = {
  easy: {
    label: 'Easy',
    blurb: {
      arb: '3 stocks, one listed on two venues, one 2-stock basket. $1–2 edges on the same stock, bigger on baskets. No fees.',
      mm: 'Mostly noise traders, accurate estimate, calm price.',
    },
    arb: { stocks: 3, dualListings: 1, baskets: 1, basketSize: [2, 2], maxWeight: 1, crossEdge: [1, 2], basketEdge: [3, 6], fee: 0, arbChance: 0.8, trapChance: 0 },
    mm: { estimateNoise: 1, informed: 0.2, arrivalMs: 3000, drift: 0.25, newsChance: 0, newsJump: [0, 0], noiseTol: [3, 6], maxSize: 1 },
  },
  medium: {
    label: 'Medium',
    blurb: {
      arb: '4 stocks, one on two venues, two baskets of 2–3 stocks. Smaller basket edges. No fees.',
      mm: 'More informed flow, rougher estimate, occasional news.',
    },
    arb: { stocks: 4, dualListings: 1, baskets: 2, basketSize: [2, 3], maxWeight: 1, crossEdge: [1, 2], basketEdge: [2, 4], fee: 0, arbChance: 0.6, trapChance: 0 },
    mm: { estimateNoise: 3, informed: 0.35, arrivalMs: 2500, drift: 0.4, newsChance: 0.05, newsJump: [3, 6], noiseTol: [2, 5], maxSize: 1 },
  },
  hard: {
    label: 'Hard',
    blurb: {
      arb: '5 stocks, two on two venues, 3-stock baskets with 2× weights. $0.25/share fee — some edges are traps.',
      mm: 'Half the flow is informed, trades up to 2 lots, bigger news moves, faster arrivals.',
    },
    arb: { stocks: 5, dualListings: 2, baskets: 2, basketSize: [3, 3], maxWeight: 2, crossEdge: [1, 1], basketEdge: [1, 3], fee: 0.25, arbChance: 0.5, trapChance: 0.3 },
    mm: { estimateNoise: 5, informed: 0.45, arrivalMs: 2000, drift: 0.6, newsChance: 0.07, newsJump: [4, 9], noiseTol: [2, 4], maxSize: 2 },
  },
  expert: {
    label: 'Expert',
    blurb: {
      arb: '6 stocks, three baskets of 3–4 stocks with 2× weights, $0.50/share fee, lots of decoys.',
      mm: 'Mostly informed flow, up to 3 lots, wide estimate, sharp news jumps, fast tape.',
    },
    arb: { stocks: 6, dualListings: 2, baskets: 3, basketSize: [3, 4], maxWeight: 2, crossEdge: [1, 1], basketEdge: [1, 2], fee: 0.5, arbChance: 0.45, trapChance: 0.35 },
    mm: { estimateNoise: 8, informed: 0.55, arrivalMs: 1500, drift: 0.8, newsChance: 0.08, newsJump: [5, 12], noiseTol: [1, 4], maxSize: 3 },
  },
};

const MODE_LABEL = { arb: 'Arbitrage', mm: 'Market Making' };

const HOWTO = {
  arb: `
    <p>Each tile is a live quote. <b>You sell @</b> is what you get for selling one; <b>You buy @</b> is what you pay. Tap a price or use the steppers.</p>
    <ul>
      <li><b>Same stock, two venues.</b> If one venue's sell price is above the other venue's buy price, buy on the cheap one and sell on the rich one.</li>
      <li><b>Baskets.</b> A basket is a bundle, e.g. <i>1× ORCA + 2× ZNTH</i>. If it's cheaper than its parts, buy the basket and sell the parts. If it's richer, do the reverse.</li>
      <li><b>Finish flat.</b> Anything unhedged is force-closed at a $${CLOSEOUT_PENALTY}/share penalty.</li>
      <li><b>Fees</b> (Hard+) are charged on every share and basket you trade. Some edges don't survive them.</li>
      <li>No arbitrage on the board? Tap <b>Pass</b>.</li>
      <li>Stuck? <b>Hint</b> gives up to 3 hints, each more specific. Nothing tells you if you're right until you submit.</li>
    </ul>`,
  mm: `
    <p>You're the market maker for one stock. Its true value is hidden; you get a rough street estimate.</p>
    <ul>
      <li>Set your <b>bid</b> (where you buy) and <b>ask</b> (where you sell). A trader arrives every few seconds.</li>
      <li><b>Noise traders</b> trade in a random direction if your price is reasonable — they pay you the spread.</li>
      <li><b>Informed traders</b> know the true value and only trade when your quote is wrong. Those fills cost you.</li>
      <li>One-sided flow is information: if everyone keeps buying, value is probably higher — shift up.</li>
      <li>Inventory is capped at ±${INV_LIMIT} and marked at the true value at the bell.</li>
      <li>Stuck? <b>Hint</b> gives up to 3 hints per round, each more specific.</li>
    </ul>`,
};

// -------------------- UTILITIES --------------------
const $ = id => document.getElementById(id);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const round2 = n => Math.round(n * 100) / 100;
const sum = arr => arr.reduce((s, n) => s + n, 0);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function money(n, signed = false) {
  n = round2(n);
  const abs = Math.abs(n);
  const body = Number.isInteger(abs)
    ? abs.toLocaleString('en-US')
    : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = n < 0 ? '−' : (signed && n > 0 ? '+' : '');
  return `${sign}$${body}`;
}

const pnlClass = n => (round2(n) > 0 ? 'pos' : round2(n) < 0 ? 'neg' : '');

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

const badge = (t, small = false) =>
  `<span class="badge${small ? ' sm' : ''}" style="--c:${t.color}">${t.sym}</span>`;

// -------------------- STATE --------------------
const settings = Object.assign({ mode: 'arb', difficulty: 'easy', rounds: 5 }, store.get('pitboard-settings', {}));
if (!MODE_LABEL[settings.mode]) settings.mode = 'arb';
if (!DIFFICULTY[settings.difficulty]) settings.difficulty = 'easy';
if (![3, 5, 10, 20].includes(settings.rounds)) settings.rounds = 5;

const state = {
  round: 0,
  results: [],      // P&L per finished round
  timeLeft: 0,
  timerId: null,
  arrivalId: null,
  roundOver: false,
  arb: null,
  mm: null,
};

const diff = () => DIFFICULTY[settings.difficulty];
const bestKey = () => `pitboard-best-${settings.mode}-${settings.difficulty}-${settings.rounds}`;

// ============================================================
//  ARBITRAGE — generation
// ============================================================
function genArbRound(cfg) {
  const stocks = shuffle(TICKERS).slice(0, cfg.stocks).map(t => ({
    ...t, mid: randInt(20, 120), half: randInt(1, 2),
  }));
  let cells = stocks.map((s, i) => ({ type: 'stock', stock: i, venue: null, bid: s.mid - s.half, ask: s.mid + s.half }));

  // Same stock quoted on a second venue — the classic "buy here, sell there"
  shuffle(stocks.map((_, i) => i)).slice(0, cfg.dualListings).forEach(i => {
    const primary = cells[i];
    primary.venue = VENUES[0];
    let bid, ask;
    const r = Math.random();
    if (r < cfg.arbChance || (r < cfg.arbChance + cfg.trapChance && cfg.fee >= 0.5)) {
      // Fee-trap rolls reuse the minimum edge; findOpportunities() decides whether fees eat it
      const trap = r >= cfg.arbChance;
      const edge = trap ? 1 : randInt(...cfg.crossEdge) + Math.ceil(2 * cfg.fee);
      if (Math.random() < 0.5) { bid = primary.ask + edge; ask = bid + randInt(1, 2); }
      else { ask = primary.bid - edge; bid = ask - randInt(1, 2); }
    } else {
      // Overlapping quotes: close to the primary but no free money
      const s = stocks[i];
      const d = randInt(-1, 1), h = randInt(1, 2);
      bid = s.mid + d - h;
      ask = s.mid + d + h;
    }
    cells.push({ type: 'stock', stock: i, venue: VENUES[1], bid, ask });
  });
  cells.sort((a, b) => a.stock - b.stock);

  const listings = i => cells.filter(c => c.type === 'stock' && c.stock === i);
  const bestAsk = i => Math.min(...listings(i).map(c => c.ask));
  const bestBid = i => Math.max(...listings(i).map(c => c.bid));

  const names = shuffle(BASKET_NAMES);
  const usedKeys = new Set();
  const baskets = [];
  for (let tries = 0; baskets.length < cfg.baskets && tries < 50; tries++) {
    const size = Math.min(randInt(...cfg.basketSize), stocks.length);
    const idx = shuffle(stocks.map((_, i) => i)).slice(0, size).sort((x, y) => x - y);
    const key = idx.join('-');
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    const comps = idx.map(i => ({ stock: i, w: cfg.maxWeight > 1 && Math.random() < 0.35 ? 2 : 1 }));
    const units = 1 + sum(comps.map(c => c.w));
    const compAsk = sum(comps.map(c => c.w * bestAsk(c.stock)));
    const compBid = sum(comps.map(c => c.w * bestBid(c.stock)));

    let bid, ask;
    const r = Math.random();
    if (r < cfg.arbChance) {
      const edge = randInt(...cfg.basketEdge) + Math.ceil(units * cfg.fee);
      if (Math.random() < 0.5) { bid = compAsk + edge; ask = bid + randInt(1, 3); }   // basket rich
      else { ask = compBid - edge; bid = ask - randInt(1, 3); }                        // basket cheap
    } else if (r < cfg.arbChance + cfg.trapChance) {
      // Looks mispriced, but the edge is zero or smaller than the fees
      const maxRaw = Math.floor(units * cfg.fee);
      const raw = maxRaw >= 1 ? randInt(1, maxRaw) : 0;
      if (Math.random() < 0.5) { bid = compAsk + raw; ask = bid + randInt(1, 3); }
      else { ask = compBid - raw; bid = ask - randInt(1, 3); }
    } else {
      bid = compBid - randInt(1, 3);
      ask = compAsk + randInt(1, 3);
    }
    // A component with its own cross-venue arb can push compBid above compAsk
    if (ask <= bid) ask = bid + randInt(1, 3);
    baskets.push({ type: 'basket', name: names[baskets.length], comps, bid, ask });
  }

  cells = [...cells, ...baskets];
  return { cells, stocks, fee: cfg.fee, cfg };
}

// Every trade combination that is profitable (or only looks it) at these prices
function findOpportunities(round) {
  const { cells, stocks, fee } = round;
  const opps = [], traps = [];
  const listingIdx = i => cells.map((c, idx) => idx).filter(idx => cells[idx].type === 'stock' && cells[idx].stock === i);
  const bestAskIdx = i => listingIdx(i).reduce((a, b) => (cells[b].ask < cells[a].ask ? b : a));
  const bestBidIdx = i => listingIdx(i).reduce((a, b) => (cells[b].bid > cells[a].bid ? b : a));
  const venueOf = idx => cells[idx].venue ? ` ${cells[idx].venue}` : '';

  const consider = (title, detail, legs, raw) => {
    const units = sum(legs.map(l => l.w));
    const net = round2(raw - units * fee);
    const opp = { title, detail, legs, raw, net, feePerUnit: round2(units * fee) };
    if (net > 0) opps.push(opp);
    else if (raw >= 0) traps.push(opp);
  };

  stocks.forEach((s, i) => {
    if (listingIdx(i).length < 2) return;
    const b = bestAskIdx(i), sIdx = bestBidIdx(i);
    if (b === sIdx) return;
    consider(
      `${s.sym} across venues`,
      `Buy${venueOf(b)} @ ${money(cells[b].ask)}, sell${venueOf(sIdx)} @ ${money(cells[sIdx].bid)}`,
      [{ cell: b, stock: i, side: 'buy', w: 1 }, { cell: sIdx, stock: i, side: 'sell', w: 1 }],
      cells[sIdx].bid - cells[b].ask,
    );
  });

  cells.forEach((c, idx) => {
    if (c.type !== 'basket') return;
    const recipe = c.comps.map(k => `${k.w}× ${stocks[k.stock].sym}`).join(' + ');
    const compAsk = sum(c.comps.map(k => k.w * cells[bestAskIdx(k.stock)].ask));
    const compBid = sum(c.comps.map(k => k.w * cells[bestBidIdx(k.stock)].bid));
    consider(
      `${c.name} rich vs. parts`,
      `Sell ${c.name} @ ${money(c.bid)}, buy ${recipe} for ${money(compAsk)}`,
      [{ cell: idx, side: 'sell', w: 1 }, ...c.comps.map(k => ({ cell: bestAskIdx(k.stock), stock: k.stock, side: 'buy', w: k.w }))],
      c.bid - compAsk,
    );
    consider(
      `${c.name} cheap vs. parts`,
      `Buy ${c.name} @ ${money(c.ask)}, sell ${recipe} for ${money(compBid)}`,
      [{ cell: idx, side: 'buy', w: 1 }, ...c.comps.map(k => ({ cell: bestBidIdx(k.stock), stock: k.stock, side: 'sell', w: k.w }))],
      compBid - c.ask,
    );
  });

  return { opps, traps };
}

// Rough ceiling for the round: greedily fill the best edges within the per-tile limit
function targetProfit(opps, cellCount) {
  const cap = Array.from({ length: cellCount }, () => ({ buy: MAX_QTY, sell: MAX_QTY }));
  let total = 0;
  [...opps].sort((a, b) => b.net - a.net).forEach(o => {
    const units = Math.min(...o.legs.map(l => Math.floor(cap[l.cell][l.side] / l.w)));
    if (units <= 0) return;
    o.legs.forEach(l => { cap[l.cell][l.side] -= units * l.w; });
    total += units * o.net;
  });
  return round2(total);
}

// ============================================================
//  ARBITRAGE — play
// ============================================================
function startArbRound() {
  const round = genArbRound(diff().arb);
  state.arb = { ...round, ...findOpportunities(round), qty: round.cells.map(() => ({ buy: 0, sell: 0 })), hints: 0 };
  $('board').classList.remove('locked');
  renderBoard();
  resetHints('arb');
}

const stepper = (i, side) => `
  <div class="stepper ${side}">
    <button data-idx="${i}" data-side="${side}" data-d="-1" aria-label="${side} one less">−</button>
    <span class="qty" id="q-${side}-${i}">0</span>
    <button data-idx="${i}" data-side="${side}" data-d="1" aria-label="${side} one more">+</button>
  </div>`;

function renderBoard() {
  const { cells, stocks } = state.arb;
  $('board').innerHTML = cells.map((c, i) => {
    let head;
    if (c.type === 'stock') {
      const s = stocks[c.stock];
      head = `
        <div class="tile-head">${badge(s)}${c.venue ? `<span class="venue">${c.venue}</span>` : ''}</div>
        <div class="tile-name">${s.name}</div>`;
    } else {
      head = `
        <div class="tile-head"><span class="badge basket">${c.name}</span><span class="venue">Basket</span></div>
        <div class="recipe"><span class="eq">=</span>${c.comps.map(k =>
          `<span class="recipe-part"><span class="w${k.w > 1 ? ' hi' : ''}">${k.w}×</span>${badge(stocks[k.stock], true)}</span>`
        ).join('<span class="plus">+</span>')}</div>`;
    }
    return `
      <div class="tile ${c.type}" id="tile-${i}">
        ${head}
        <div class="quotes">
          <button class="quote sell" data-idx="${i}" data-side="sell" data-d="1"><span class="lbl">You sell @</span><span class="px">${money(c.bid)}</span></button>
          <button class="quote buy" data-idx="${i}" data-side="buy" data-d="1"><span class="lbl">You buy @</span><span class="px">${money(c.ask)}</span></button>
        </div>
        <div class="qty-row">${stepper(i, 'sell')}${stepper(i, 'buy')}</div>
      </div>`;
  }).join('');
}

function onBoardClick(e) {
  const btn = e.target.closest('button[data-idx]');
  if (!btn || state.roundOver || !state.arb) return;
  const i = Number(btn.dataset.idx), side = btn.dataset.side;
  const q = state.arb.qty[i];
  q[side] = Math.min(MAX_QTY, Math.max(0, q[side] + Number(btn.dataset.d)));
  $(`q-${side}-${i}`).textContent = q[side];
  $(`q-${side}-${i}`).parentElement.classList.toggle('on', q[side] > 0);
}

function resetArb() {
  if (state.roundOver || !state.arb) return;
  state.arb.qty.forEach((q, i) => {
    ['buy', 'sell'].forEach(side => {
      q[side] = 0;
      $(`q-${side}-${i}`).textContent = '0';
      $(`q-${side}-${i}`).parentElement.classList.remove('on');
    });
  });
}

// Cash from trades, fees and net share position per stock (baskets unpacked)
function arbTotals(a) {
  let gross = 0, units = 0;
  const net = a.stocks.map(() => 0);
  a.cells.forEach((c, i) => {
    const q = a.qty[i];
    gross += q.sell * c.bid - q.buy * c.ask;
    units += q.buy + q.sell;
    const delta = q.buy - q.sell;
    if (c.type === 'stock') net[c.stock] += delta;
    else c.comps.forEach(k => { net[k.stock] += delta * k.w; });
  });
  return { gross: round2(gross), units, fees: round2(units * a.fee), net };
}

// Progressive hints, only when asked: count → which tiles → the full trade
function arbHint() {
  const a = state.arb;
  if (!a || state.roundOver || a.hints >= MAX_HINTS) return;
  a.hints += 1;
  const best = [...a.opps].sort((x, y) => y.net - x.net)[0];
  const n = a.opps.length;
  let msg;
  if (!best) {
    msg = a.hints === 1
      ? 'Compare every stock across venues and every basket against the sum of its parts.'
      : a.hints === 2
        ? `Remember ${a.fee ? 'fees and ' : ''}that you need to beat the buy price, not the midpoint.`
        : 'There is no profitable arbitrage on this board.';
  } else if (a.hints === 1) {
    msg = `There ${n === 1 ? 'is 1 opportunity' : `are ${n} opportunities`} on this board${a.fee ? ' after fees' : ''}.`;
  } else if (a.hints === 2) {
    const cells = [...new Set(best.legs.map(l => l.cell))];
    cells.forEach(i => $(`tile-${i}`).classList.add('hinted'));
    const names = cells.map(i => {
      const c = a.cells[i];
      return c.type === 'basket' ? c.name : `${a.stocks[c.stock].sym}${c.venue ? ` (${c.venue})` : ''}`;
    });
    msg = `The biggest edge involves the highlighted tiles: ${names.join(', ')}.`;
  } else {
    msg = `${best.title}: ${best.detail} — ${money(best.net, true)}/unit${a.fee ? ' after fees' : ''}.`;
  }
  addHint('arb', a.hints, msg);
}

function scoreArb(a) {
  const { gross, units, fees, net } = arbTotals(a);
  let closeout = 0;
  const open = [];
  net.forEach((n, i) => {
    if (!n) return;
    const ls = a.cells.filter(c => c.type === 'stock' && c.stock === i);
    const px = n > 0
      ? Math.max(...ls.map(c => c.bid)) - CLOSEOUT_PENALTY
      : Math.min(...ls.map(c => c.ask)) + CLOSEOUT_PENALTY;
    closeout += n * px;
    open.push({ stock: a.stocks[i], n, px });
  });
  return { gross, units, fees, closeout: round2(closeout), open, total: round2(gross - fees + closeout) };
}

// A leg counts as taken if you traded that side on that tile (or any listing of that stock)
function oppTaken(a, opp) {
  return opp.legs.every(l => {
    const idxs = l.stock === undefined
      ? [l.cell]
      : a.cells.map((c, i) => i).filter(i => a.cells[i].type === 'stock' && a.cells[i].stock === l.stock);
    return sum(idxs.map(i => a.qty[i][l.side])) >= l.w;
  });
}

function submitArb(timedOut) {
  if (state.roundOver || !state.arb) return;
  state.roundOver = true;
  stopTimers();
  const a = state.arb;
  const s = scoreArb(a);
  state.results.push(s.total);
  updateScore();
  $('board').classList.add('locked');

  const target = targetProfit(a.opps, a.cells.length);
  const rows = [
    ['Trades', money(s.gross, true)],
    ...(a.fee ? [[`Fees (${s.units} × ${money(a.fee)})`, money(-s.fees)]] : []),
    ...(s.open.length ? [['Forced close-out', money(s.closeout, true)]] : []),
  ];

  let oppHtml;
  if (a.opps.length) {
    oppHtml = a.opps.map(o => {
      const took = oppTaken(a, o);
      return `<li class="${took ? 'hit' : 'miss'}"><span class="mark">${took ? '✓' : '✗'}</span>
        <div><b>${o.title}</b> <span class="edge">${money(o.net, true)}/unit${a.fee ? ' after fees' : ''}</span><br><small>${o.detail}</small></div></li>`;
    }).join('');
  } else {
    oppHtml = `<li class="${s.units ? 'miss' : 'hit'}"><span class="mark">${s.units ? '✗' : '✓'}</span>
      <div><b>No arbitrage this round</b><br><small>${s.units ? 'Passing was the right call.' : 'Correct pass.'}</small></div></li>`;
  }
  const trapHtml = a.traps.map(o => `<li class="trap"><span class="mark">⚠</span>
    <div><b>${o.title}</b> <span class="edge">${money(o.raw, true)} raw${a.fee ? ` − ${money(o.feePerUnit)} fees` : ''} = ${money(o.net)}</span><br><small>${o.detail}</small></div></li>`).join('');
  const openHtml = s.open.length
    ? `<p class="note warn-note">Left unhedged: ${s.open.map(o => `${o.n > 0 ? 'long' : 'short'} ${Math.abs(o.n)} ${o.stock.sym} (closed @ ${money(o.px)})`).join(', ')}. Always finish flat.</p>`
    : '';

  showSheet(`
    <div class="sheet-title">${timedOut ? "Time's up" : `Round ${state.round}`} — P&amp;L</div>
    <div class="big-pnl ${pnlClass(s.total)}">${money(s.total, true)}</div>
    <table class="breakdown">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
    ${openHtml}
    <h4>Opportunities</h4><ul class="opps">${oppHtml}</ul>
    ${trapHtml ? `<h4>Traps</h4><ul class="opps">${trapHtml}</ul>` : ''}
    ${a.hints ? `<p class="note">Hints used: ${a.hints}</p>` : ''}
    ${target > 0 ? `<p class="note">Max at ${MAX_QTY} per tile: about ${money(target)} (you captured ${Math.max(0, Math.round((s.total / target) * 100))}%).</p>` : ''}
  `);
}

// ============================================================
//  MARKET MAKING
// ============================================================
function startMmRound() {
  const cfg = diff().mm;
  const t = pick(TICKERS);
  const V = randInt(40, 150);
  const est = Math.round(V + (Math.random() * 2 - 1) * cfg.estimateNoise);
  state.mm = { cfg, t, V, V0: V, est, bid: est - 2, ask: est + 2, inv: 0, cash: 0, history: [], fills: [], hints: 0 };
  const m = state.mm;
  m.history.push({ V, bid: m.bid, ask: m.ask, fill: null });

  $('mmBadge').innerHTML = badge(t);
  $('mmName').textContent = t.name;
  $('mmEst').textContent = `~${money(est)}`;
  $('mmTape').innerHTML = '<div class="tape-row dim">Waiting for the first trader…</div>';
  $('mmNews').hidden = true;
  $('mmView').classList.remove('locked');
  resetHints('mm');
  renderMm();
  state.arrivalId = setInterval(mmArrival, cfg.arrivalMs);
}

function onMmControl(e) {
  const btn = e.target.closest('button[data-mm]');
  const m = state.mm;
  if (!btn || !m || state.roundOver) return;
  switch (btn.dataset.mm) {
    case 'bid-': m.bid = Math.max(1, m.bid - 1); break;
    case 'bid+': m.bid = Math.min(m.ask - 1, m.bid + 1); break;
    case 'ask-': m.ask = Math.max(m.bid + 1, m.ask - 1); break;
    case 'ask+': m.ask += 1; break;
    case 'shift-': if (m.bid > 1) { m.bid -= 1; m.ask -= 1; } break;
    case 'shift+': m.bid += 1; m.ask += 1; break;
  }
  renderMm();
}

function renderMm() {
  const m = state.mm;
  $('mmBid').textContent = money(m.bid);
  $('mmAsk').textContent = money(m.ask);
  $('mmSpread').textContent = money(m.ask - m.bid);
  const inv = $('mmInv');
  inv.textContent = `${m.inv > 0 ? '+' : ''}${m.inv}`;
  inv.className = 'stat-val ' + (m.inv > 0 ? 'pos' : m.inv < 0 ? 'neg' : '');
  $('mmCash').textContent = money(m.cash);
  const mark = m.cash + m.inv * (m.bid + m.ask) / 2;
  $('mmMark').textContent = money(mark, true);
  $('mmMark').className = 'stat-val ' + pnlClass(mark);
  const fill = $('mmInvFill');
  const pct = Math.min(1, Math.abs(m.inv) / INV_LIMIT) * 50;
  fill.style.left = m.inv >= 0 ? '50%' : `${50 - pct}%`;
  fill.style.width = `${pct}%`;
  fill.className = 'inv-fill ' + (m.inv >= 0 ? 'long' : 'short');
}

function mmArrival() {
  const m = state.mm, cfg = m.cfg;
  if (!m || state.roundOver) return;

  // True value wanders, occasionally jumps on news
  m.V = round2(Math.max(5, m.V + gauss() * cfg.drift));
  if (cfg.newsChance && Math.random() < cfg.newsChance) {
    const up = Math.random() < 0.5;
    m.V = round2(Math.max(5, m.V + (up ? 1 : -1) * randInt(...cfg.newsJump)));
    const news = $('mmNews');
    news.textContent = `NEWS · ${m.t.sym} ${pick(up ? GOOD_NEWS : BAD_NEWS)}`;
    news.className = `news ${up ? 'up' : 'down'}`;
    news.hidden = false;
  }

  const informed = Math.random() < cfg.informed;
  const size = randInt(1, cfg.maxSize);
  const want = Math.random() < 0.5 ? 'buy' : 'sell';
  let side = null;   // 'buy' = trader lifts your ask, 'sell' = trader hits your bid
  if (informed) {
    if (m.ask < m.V) side = 'buy';
    else if (m.bid > m.V) side = 'sell';
  } else {
    const tol = randInt(...cfg.noiseTol);
    if (want === 'buy' && m.ask <= m.V + tol) side = 'buy';
    if (want === 'sell' && m.bid >= m.V - tol) side = 'sell';
  }

  let row;
  if (side && Math.abs(m.inv + (side === 'buy' ? -size : size)) > INV_LIMIT) {
    row = `<div class="tape-row dim">${side === 'buy' ? 'Buyer' : 'Seller'} blocked — you're at the ±${INV_LIMIT} inventory limit</div>`;
    side = null;
  } else if (side === 'buy') {
    m.inv -= size; m.cash += m.ask * size;
    m.fills.push({ side, price: m.ask, size, V: m.V, informed });
    row = `<div class="tape-row sold"><span>Buyer lifts your ask</span><b>${size} @ ${money(m.ask)}</b></div>`;
  } else if (side === 'sell') {
    m.inv += size; m.cash -= m.bid * size;
    m.fills.push({ side, price: m.bid, size, V: m.V, informed });
    row = `<div class="tape-row bought"><span>Seller hits your bid</span><b>${size} @ ${money(m.bid)}</b></div>`;
  } else {
    row = '<div class="tape-row dim">No trade</div>';
  }

  m.history.push({ V: m.V, bid: m.bid, ask: m.ask, fill: side, informed });
  const tape = $('mmTape');
  if (tape.firstElementChild && tape.children.length === 1 && tape.firstElementChild.textContent.startsWith('Waiting')) tape.innerHTML = '';
  tape.insertAdjacentHTML('afterbegin', row);
  while (tape.children.length > 30) tape.lastElementChild.remove();
  if (side) {
    const box = $(side === 'buy' ? 'mmAskBox' : 'mmBidBox');
    box.classList.remove('flash');
    void box.offsetWidth;
    box.classList.add('flash');
  }
  renderMm();
}

function mmHint() {
  const m = state.mm;
  if (!m || state.roundOver || m.hints >= MAX_HINTS) return;
  m.hints += 1;
  const mid = (m.bid + m.ask) / 2;
  let msg;
  if (m.hints === 1) {
    const recent = m.fills.slice(-6);
    const buys = recent.filter(f => f.side === 'buy').length;
    msg = recent.length
      ? `Last ${recent.length} fills: ${buys} buyer${buys === 1 ? '' : 's'} lifted your ask, ${recent.length - buys} seller${recent.length - buys === 1 ? '' : 's'} hit your bid.`
      : 'No fills yet. If nobody trades for a while, your spread may be too wide.';
  } else if (m.hints === 2) {
    msg = Math.abs(m.V - mid) < 0.5
      ? 'True value is right around your mid right now.'
      : `True value is ${m.V > mid ? 'above' : 'below'} your mid right now.`;
  } else {
    const lo = Math.floor(m.V) - 2;
    msg = `True value is between ${money(lo)} and ${money(lo + 4)} right now.`;
  }
  addHint('mm', m.hints, msg);
}

function mmChart(history) {
  const W = 320, H = 130, P = 8;
  const vals = history.flatMap(h => [h.V, h.bid, h.ask]);
  const lo = Math.min(...vals) - 1, hi = Math.max(...vals) + 1;
  const x = i => P + (history.length < 2 ? 0 : (i * (W - 2 * P)) / (history.length - 1));
  const y = v => H - P - ((v - lo) * (H - 2 * P)) / (hi - lo);
  const line = key => history.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(h[key]).toFixed(1)}`).join('');
  const dots = history.map((h, i) => (h.fill
    ? `<circle cx="${x(i).toFixed(1)}" cy="${y(h.fill === 'buy' ? h.ask : h.bid).toFixed(1)}" r="3.5" class="dot ${h.fill}${h.informed ? ' inf' : ''}"/>`
    : '')).join('');
  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="True value against your bid and ask over the round">
      <path d="${line('ask')}" class="ln ask"/><path d="${line('bid')}" class="ln bid"/><path d="${line('V')}" class="ln val"/>${dots}
    </svg>
    <div class="legend"><span class="lg val">True value</span><span class="lg bid">Your bid</span><span class="lg ask">Your ask</span><span class="lg inf">Informed fill</span></div>`;
}

function endMmRound() {
  if (state.roundOver || !state.mm) return;
  state.roundOver = true;
  stopTimers();
  const m = state.mm;
  $('mmView').classList.add('locked');
  const pnl = round2(m.cash + m.inv * m.V);
  state.results.push(pnl);
  updateScore();

  // Edge at the moment of each fill vs. the true value; the rest came from price moving while you held inventory
  let noiseEdge = 0, informedEdge = 0, nNoise = 0, nInf = 0;
  m.fills.forEach(f => {
    const e = (f.side === 'buy' ? f.price - f.V : f.V - f.price) * f.size;
    if (f.informed) { informedEdge += e; nInf++; } else { noiseEdge += e; nNoise++; }
  });
  const inventoryPnl = pnl - noiseEdge - informedEdge;

  const tips = [];
  if (m.fills.length <= 2) tips.push('Very few fills — your spread was probably too wide for noise traders.');
  if (informedEdge < -Math.max(4, noiseEdge)) tips.push('Informed traders picked you off. After a run of one-sided fills, shift your quotes toward that side.');
  if (Math.abs(m.inv) >= 6) tips.push('Big inventory at the bell. Skew quotes to get flat: if long, lower both so buyers take stock off you.');
  if (!tips.length && pnl > 0) tips.push('Nice — you earned the spread without getting run over.');

  showSheet(`
    <div class="sheet-title">Round ${state.round} — ${m.t.sym} P&amp;L</div>
    <div class="big-pnl ${pnlClass(pnl)}">${money(pnl, true)}</div>
    <p class="note">True value finished at <b>${money(m.V)}</b> (started ${money(m.V0)}, estimate was ${money(m.est)}).</p>
    ${mmChart(m.history)}
    <table class="breakdown">
      <tr><td>Edge vs. noise traders (${nNoise} fills)</td><td>${money(noiseEdge, true)}</td></tr>
      <tr><td>Lost to informed traders (${nInf} fills)</td><td>${money(informedEdge, true)}</td></tr>
      <tr><td>Price moves on inventory (ended ${m.inv > 0 ? '+' : ''}${m.inv})</td><td>${money(inventoryPnl, true)}</td></tr>
    </table>
    ${m.hints ? `<p class="note">Hints used: ${m.hints}</p>` : ''}
    ${tips.map(t => `<p class="note">${t}</p>`).join('')}
  `);
}

// -------------------- HINT UI --------------------
function resetHints(mode) {
  const box = $(`${mode}Hint`), btn = $(`${mode}HintBtn`);
  box.innerHTML = '';
  box.hidden = true;
  btn.disabled = false;
  btn.textContent = `Hint (${MAX_HINTS})`;
}

function addHint(mode, n, msg) {
  const box = $(`${mode}Hint`), btn = $(`${mode}HintBtn`);
  box.insertAdjacentHTML('beforeend', `<div><span class="hint-n">Hint ${n}</span><br>${msg}</div>`);
  box.hidden = false;
  btn.textContent = n >= MAX_HINTS ? 'No hints left' : `Hint (${MAX_HINTS - n})`;
  btn.disabled = n >= MAX_HINTS;
}

// ============================================================
//  SESSION FLOW
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });
  window.scrollTo(0, 0);
}

function startSession() {
  state.round = 0;
  state.results = [];
  showScreen('game');
  $('arbView').hidden = settings.mode !== 'arb';
  $('mmView').hidden = settings.mode !== 'mm';
  const fee = diff().arb.fee;
  $('feeChip').hidden = !(settings.mode === 'arb' && fee > 0);
  $('feeChip').textContent = `Fee ${money(fee)}/share`;
  nextRound();
}

function nextRound() {
  $('roundSheet').hidden = true;
  if (state.round >= settings.rounds) { endSession(); return; }
  state.round += 1;
  state.roundOver = false;
  $('roundIndicator').textContent = `${diff().label} · Round ${state.round}/${settings.rounds}`;
  updateScore();
  startTimer();
  if (settings.mode === 'arb') startArbRound(); else startMmRound();
  window.scrollTo(0, 0);
}

function startTimer() {
  stopTimers();
  state.timeLeft = ROUND_SECONDS;
  updateTimer();
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    updateTimer();
    if (state.timeLeft <= 0) {
      if (settings.mode === 'arb') submitArb(true); else endMmRound();
    }
  }, 1000);
}

function stopTimers() {
  clearInterval(state.timerId);
  clearInterval(state.arrivalId);
  state.timerId = state.arrivalId = null;
}

function updateTimer() {
  const t = Math.max(0, state.timeLeft);
  const el = $('timer');
  el.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  el.classList.toggle('low', t <= 10);
}

function updateScore() {
  const total = sum(state.results);
  const el = $('totalScore');
  el.textContent = money(total, true);
  el.className = 'score-value ' + pnlClass(total);
}

function showSheet(html) {
  $('sheetBody').innerHTML = html;
  $('nextBtn').textContent = state.round >= settings.rounds ? 'See results' : 'Next round';
  $('roundSheet').hidden = false;
  $('roundSheet').scrollTop = 0;
}

function endSession() {
  stopTimers();
  const total = round2(sum(state.results));
  const prev = store.get(bestKey(), null);
  const isBest = prev === null || total > prev;
  if (isBest) store.set(bestKey(), total);

  $('resultsSub').textContent = `${MODE_LABEL[settings.mode]} · ${diff().label} · ${settings.rounds} rounds`;
  $('resultsTotal').textContent = money(total, true);
  $('resultsTotal').className = 'big-pnl ' + pnlClass(total);
  $('resultsBest').innerHTML = isBest
    ? '<span class="ok">New best at this setting!</span>'
    : `Best at this setting: ${money(prev, true)}`;
  const maxAbs = Math.max(1, ...state.results.map(Math.abs));
  $('resultsRounds').innerHTML = state.results.map((r, i) => `
    <div class="rb-row"><span class="rb-n">R${i + 1}</span>
      <div class="rb-track"><div class="rb-bar ${r >= 0 ? 'pos' : 'neg'}" style="width:${(Math.abs(r) / maxAbs) * 100}%"></div></div>
      <span class="rb-v ${pnlClass(r)}">${money(r, true)}</span></div>`).join('');
  showScreen('results');
  if (typeof Online !== 'undefined') Online.recordSession(total);
}

function quitSession() {
  if (!state.roundOver && !confirm('Quit this session? Progress will be lost.')) return;
  stopTimers();
  state.arb = state.mm = null;
  showScreen('home');
  renderHome();
}

// -------------------- HOME --------------------
function renderHome() {
  document.querySelectorAll('.seg[data-setting]').forEach(seg => {
    const key = seg.dataset.setting;
    seg.querySelectorAll('button').forEach(b => {
      const on = String(settings[key]) === b.dataset.value;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
  });
  $('diffDesc').textContent = diff().blurb[settings.mode];
  $('howtoText').innerHTML = HOWTO[settings.mode];
  const best = store.get(bestKey(), null);
  $('bestLine').textContent = best === null ? 'No sessions at this setting yet' : `Best at this setting: ${money(best, true)}`;
  if (typeof Online !== 'undefined') Online.homeExtras();
}

function buildTape() {
  const items = TICKERS.map(t => {
    const px = randInt(20, 180) + randInt(0, 99) / 100;
    const ch = round2((Math.random() * 6 - 3));
    return `<span class="tape-item"><b style="color:${t.color}">${t.sym}</b> ${px.toFixed(2)} <i class="${ch >= 0 ? 'pos' : 'neg'}">${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(2)}</i></span>`;
  }).join('');
  $('brandTape').innerHTML = items + items;
}

// -------------------- INIT --------------------
document.querySelectorAll('.seg[data-setting]').forEach(seg => {
  seg.addEventListener('click', e => {
    const btn = e.target.closest('button[data-value]');
    if (!btn) return;
    const key = seg.dataset.setting;
    settings[key] = key === 'rounds' ? Number(btn.dataset.value) : btn.dataset.value;
    store.set('pitboard-settings', settings);
    renderHome();
  });
});
$('startBtn').addEventListener('click', startSession);
$('quitBtn').addEventListener('click', quitSession);
$('board').addEventListener('click', onBoardClick);
$('resetBtn').addEventListener('click', resetArb);
$('passBtn').addEventListener('click', () => { resetArb(); submitArb(false); });
$('submitBtn').addEventListener('click', () => submitArb(false));
$('arbHintBtn').addEventListener('click', arbHint);
$('mmHintBtn').addEventListener('click', mmHint);
$('mmView').addEventListener('click', onMmControl);
$('nextBtn').addEventListener('click', nextRound);
$('againBtn').addEventListener('click', startSession);
$('menuBtn').addEventListener('click', () => { showScreen('home'); renderHome(); });

buildTape();
renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
