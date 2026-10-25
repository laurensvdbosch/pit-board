/* ===========================================================
   PIT BOARD — game lobby, board registry, shared summary screen
   ---------------------------------------------------------
   Every game posts to boards identified by (mode, difficulty, rounds):
   - arb / mm:  difficulty easy…expert, rounds 3/5/10/20
   - digits:    difficulty fwd-easy | fwd-hard | bwd-easy | bwd-hard, rounds 0
   - switch:    difficulty standard | hard | super, rounds = seconds 30/60/120
   The server validates the same combinations (supabase/schema.sql).
   Loaded after app.js; digits.js, switch.js and online.js use this.
   =========================================================== */

'use strict';

const TRADE_FILTERS = [
  { key: 'difficulty', options: [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['expert', 'Expert']] },
  { key: 'rounds', options: [[3, '3 rds'], [5, '5 rds'], [10, '10 rds'], [20, '20 rds']] },
];

const GAMES = {
  arb: {
    sym: 'ARBT', short: 'Arb', name: 'Arbitrage', color: '#E8A33D',
    blurb: 'Spot mispriced quotes & baskets',
    filters: TRADE_FILTERS,
    fmt: s => money(s, true),
  },
  mm: {
    sym: 'MKMK', short: 'MM', name: 'Market Making', color: '#4CAF6E',
    blurb: 'Quote a bid/ask, manage inventory',
    filters: TRADE_FILTERS,
    fmt: s => money(s, true),
  },
  digits: {
    sym: 'DGTS', short: 'Digits', name: 'Digit Span', color: '#5DB2FF',
    blurb: 'Memorise the tape, type it back',
    filters: [{ key: 'difficulty', options: [['fwd-easy', 'Fwd · Easy'], ['fwd-hard', 'Fwd · Hard'], ['bwd-easy', 'Bwd · Easy'], ['bwd-hard', 'Bwd · Hard']] }],
    fmt: s => `${s} digit${Number(s) === 1 ? '' : 's'}`,
  },
  switch: {
    sym: 'SWCH', short: 'Switch', name: 'Task Switch', color: '#C58BFF',
    blurb: 'Read the signal, switch tasks fast',
    filters: [
      { key: 'difficulty', options: [['standard', 'Standard'], ['hard', 'Hard'], ['super', 'Super hard']] },
      { key: 'rounds', options: [[30, '30s'], [60, '60s'], [120, '120s']] },
    ],
    fmt: s => `${Number(s) > 0 ? '+' : ''}${s} pts`,
  },
};

// The board each game is currently set to on this device
function currentBoard(game) {
  if (game === 'digits') return { mode: 'digits', difficulty: settings.digits, rounds: 0 };
  if (game === 'switch') return { mode: 'switch', difficulty: settings.switchMode, rounds: settings.switchSecs };
  return { mode: game, difficulty: settings.difficulty, rounds: settings.rounds };
}

function boardLabel(b) {
  const g = GAMES[b.mode];
  if (!g) return b.mode;
  const parts = g.filters.map(f => {
    const opt = f.options.find(o => String(o[0]) === String(b[f.key]));
    return opt ? opt[1] : b[f.key];
  });
  return [g.name, ...parts].join(' · ');
}

const fmtScore = (mode, s) => (GAMES[mode] ? GAMES[mode].fmt(Number(s)) : String(s));
const scoreClass = (mode, s) => (mode === 'digits' ? '' : pnlClass(Number(s)));
const boardBestKey = b => `pitboard-best-${b.mode}-${b.difficulty}-${b.rounds}`;

// Local personal best per board (works offline, mirrors the server)
function saveBest(board, score) {
  const prev = store.get(boardBestKey(board), null);
  const isBest = prev === null || score > prev;
  if (isBest) store.set(boardBestKey(board), score);
  return { isBest, prev };
}

const saveSettings = () => store.set('pitboard-settings', settings);

// -------------------- LOBBY --------------------
function renderLobby() {
  $('gameList').innerHTML = Object.entries(GAMES).map(([id, g]) => {
    const b = currentBoard(id);
    const best = store.get(boardBestKey(b), null);
    const variant = boardLabel(b).split(' · ').slice(1).join(' · ');
    return `
      <button class="book-row" data-game="${id}">
        <span class="badge" style="--c:${g.color}">${g.sym}</span>
        <span class="book-name"><b>${g.name}<span class="new-tag" id="new-${id}" hidden></span></b><small>${g.blurb}</small></span>
        <span class="book-best ${best === null ? 'dim' : scoreClass(id, best)}">${best === null ? '—' : g.fmt(best)}<small>${variant}</small></span>
      </button>`;
  }).join('');
  if (typeof Online !== 'undefined') Online.homeExtras();
}

function goHome() {
  showScreen('home');
  renderLobby();
}

function openGame(id) {
  settings.lastGame = id;
  if (id === 'arb' || id === 'mm') {
    settings.mode = id;
    saveSettings();
    renderTradeSetup();
    showScreen('tradeSetup');
  } else {
    saveSettings();
    (id === 'digits' ? Digits : Switch).openSetup();
  }
}

const openLeadersFor = board => { if (typeof Online !== 'undefined') Online.openLeaders(board); };

// -------------------- SHARED SUMMARY --------------------
let summaryAgain = null;
let summaryBoard = null;

// opts: { board, score, title, bodyHtml, again }
function showSummary(opts) {
  const { isBest, prev } = saveBest(opts.board, opts.score);
  const mode = opts.board.mode;
  summaryAgain = opts.again;
  summaryBoard = opts.board;
  $('summarySub').textContent = boardLabel(opts.board);
  $('summaryTitle').textContent = opts.title;
  $('summaryScore').textContent = fmtScore(mode, opts.score);
  $('summaryScore').className = 'big-pnl ' + scoreClass(mode, opts.score);
  $('summaryBest').innerHTML = isBest
    ? '<span class="ok">New personal best!</span>'
    : `Your best: ${fmtScore(mode, prev)}`;
  $('summaryBody').innerHTML = opts.bodyHtml;
  $('summaryRank').textContent = '';
  showScreen('summary');
  if (typeof Online !== 'undefined') Online.recordScore(opts.board, opts.score, $('summaryRank'));
}

// -------------------- INIT --------------------
$('gameList').addEventListener('click', e => {
  const row = e.target.closest('[data-game]');
  if (row) openGame(row.dataset.game);
});
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', goHome));
$('leadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(settings.lastGame)));
$('tradeLeadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(settings.mode)));
$('resultsLeadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(settings.mode)));
$('summaryLeadersBtn').addEventListener('click', () => openLeadersFor(summaryBoard));
$('summaryMenuBtn').addEventListener('click', goHome);
$('summaryAgainBtn').addEventListener('click', () => { if (summaryAgain) summaryAgain(); });

renderLobby();
