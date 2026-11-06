/* ===========================================================
   PIT BOARD — game lobby, board registry, shared summary screen
   ---------------------------------------------------------
   Every game posts to boards identified by (mode, difficulty, rounds):
   - arb / mm:  difficulty easy…expert, rounds 3/5/10/20
   - digits:    difficulty fwd-easy | fwd-hard | bwd-easy | bwd-hard, rounds 0
   - switch:    difficulty standard | hard | super, rounds = seconds 30/60/120
   - confirm:   difficulty easy | hard (code length), rounds = clock step 1/2/3 (×0.1 s)
   - series:    difficulty nextval (next-value, 5 options, ±1 scoring), rounds = 300 (seconds)
   - matrix:    difficulty test (20 in 10 min) | survival, rounds 0
   - mdrill:    speed drill, difficulty standard, rounds 120 (only standard settings are ranked)
   - msheet:    answer sheet, difficulty regular | assess | quant, rounds = questions 10/20/50
   - mquiz:     multiple choice, difficulty easy | medium | hard | quant, rounds 20   (section: 'math')
   - pkodds / pkshow / pkspot / pkread: poker puzzles, difficulty standard,
     rounds = 180 / 90 seconds or 10 questions (section: 'poker')
                (difficulty 'standard' was the retired odd-one-out version)
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
  confirm: {
    sym: 'CNFM', short: 'Confirm', name: 'Trade Confirm', color: '#45C4B0',
    blurb: 'Match the ticket ID before the clock',
    filters: [
      { key: 'difficulty', options: [['easy', 'Easy · 6–7'], ['hard', 'Hard · 8–9']] },
      { key: 'rounds', options: [[1, 'Normal'], [2, 'Fast'], [3, 'Very fast']] },
    ],
    fmt: s => `${s} match${Number(s) === 1 ? '' : 'es'}`,
  },
  series: {
    sym: 'SEQS', short: 'Seqs', name: 'Sequences', color: '#E06C75',
    blurb: 'Next value in the sequence, 5 options',
    filters: [{ key: 'difficulty', options: [['nextval', '20 questions · 5 min']] }],
    fmt: s => `${Number(s) > 0 ? '+' : ''}${s} pts`,
  },
  matrix: {
    sym: 'MTRX', short: 'Matrices', name: 'Matrices', color: '#8C9BFF',
    blurb: 'Find the missing figure',
    filters: [{ key: 'difficulty', options: [['test', '20 in 10 min'], ['survival', 'Survival']] }],
    fmt: s => `${s} solved`,
  },
  mdrill: {
    sym: 'DRIL', short: 'Drill', name: 'Speed drill', color: '#F2C14E', section: 'math',
    blurb: '+ − × ÷ against the clock, no Enter',
    filters: [{ key: 'difficulty', options: [['standard', 'Standard · 120s']] }],
    fmt: s => `${s} solved`,
  },
  msheet: {
    sym: 'SHET', short: 'Sheet', name: 'Answer sheet', color: '#5DB2FF', section: 'math',
    blurb: '10, 20 or 50 mixed questions, scroll freely',
    filters: [
      { key: 'difficulty', options: [['regular', 'Regular'], ['assess', 'Assessment'], ['quant', 'Quant']] },
      { key: 'rounds', options: [[10, '10 Qs'], [20, '20 Qs'], [50, '50 Qs']] },
    ],
    fmt: s => `${s} right`,
  },
  mquiz: {
    sym: 'MCQS', short: 'Choice', name: 'Multiple choice', color: '#4CAF6E', section: 'math',
    blurb: 'Assessment style: 5 options, +1 / −1',
    filters: [{ key: 'difficulty', options: [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['quant', 'Quant']] }],
    fmt: s => `${Number(s) > 0 ? '+' : ''}${s} pts`,
  },
  pkodds: {
    sym: 'ODDS', short: 'Odds', name: 'Outs & odds', color: '#45C4B0', section: 'poker',
    blurb: 'Count outs, find your price, call or fold',
    filters: [{ key: 'difficulty', options: [['standard', '3 min']] }],
    fmt: s => `${Number(s) > 0 ? '+' : ''}${s} pts`,
  },
  pkshow: {
    sym: 'SHOW', short: 'Showdown', name: 'Read the showdown', color: '#F2A65A', section: 'poker',
    blurb: 'Who wins? Kickers, splits, board plays',
    filters: [{ key: 'difficulty', options: [['standard', '90 s']] }],
    fmt: s => `${Number(s) > 0 ? '+' : ''}${s} pts`,
  },
  pkspot: {
    sym: 'SPOT', short: 'Action', name: 'Best action', color: '#E8A33D', section: 'poker',
    blurb: 'Open or fold, call or fold the all-in',
    filters: [{ key: 'difficulty', options: [['standard', '10 spots']] }],
    fmt: s => `${Number(s) > 0 ? '+' : ''}${s} pts`,
  },
  pkread: {
    sym: 'READ', short: 'Read', name: 'Read the opponent', color: '#C58BFF', section: 'poker',
    blurb: 'What does the bot have?',
    filters: [{ key: 'difficulty', options: [['standard', '10 reads']] }],
    fmt: s => `${Number(s) > 0 ? '+' : ''}${s} pts`,
  },
};
const PUZZLE_ROUNDS = { pkodds: 180, pkshow: 90, pkspot: 10, pkread: 10 };

// The board each game is currently set to on this device
function currentBoard(game) {
  if (game === 'digits') return { mode: 'digits', difficulty: settings.digits, rounds: 0 };
  if (game === 'switch') return { mode: 'switch', difficulty: settings.switchMode, rounds: settings.switchSecs };
  if (game === 'confirm') return { mode: 'confirm', difficulty: settings.confirmLen, rounds: settings.confirmSpeed };
  if (game === 'series') return { mode: 'series', difficulty: 'nextval', rounds: 300 };
  if (game === 'matrix') return { mode: 'matrix', difficulty: settings.matrixMode, rounds: 0 };
  if (game === 'mdrill') return { mode: 'mdrill', difficulty: 'standard', rounds: 120 };
  const q = settings.mathMode === 'quant';
  if (game === 'msheet') return { mode: 'msheet', difficulty: q ? 'quant' : settings.sheetPace, rounds: settings.sheetCount };
  if (game === 'mquiz') return { mode: 'mquiz', difficulty: q ? 'quant' : settings.quizLevel, rounds: 20 };
  if (PUZZLE_ROUNDS[game]) return { mode: game, difficulty: 'standard', rounds: PUZZLE_ROUNDS[game] };
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
const scoreClass = (mode, s) => (['digits', 'confirm', 'matrix', 'mdrill', 'msheet'].includes(mode) ? '' : pnlClass(Number(s)));
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
  $('gameList').innerHTML = lobbyRows(undefined);
  $('mathList').innerHTML = lobbyRows('math');
  if (typeof Online !== 'undefined') Online.homeExtras();
  renderSection();
}

function lobbyRows(section) {
  return Object.entries(GAMES).filter(([, g]) => g.section === section).map(([id, g]) => {
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
}

// Math, trading or poker, remembered between visits
function renderSection() {
  const poker = settings.section === 'poker';
  $('mathSection').hidden = settings.section !== 'math';
  $('mathModeSwitch').querySelectorAll('button').forEach(b => {
    const on = b.dataset.value === settings.mathMode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  $('mathModeNote').textContent = settings.mathMode === 'quant'
    ? 'Like Optiver\'s 80 in 8 and Maven\'s 50 in 5. The hardest mix, for the answer sheet and multiple choice. The speed drill stays the same.'
    : 'Choose your own pace and difficulty.';
  $('tradingSection').hidden = settings.section !== 'trading';
  $('pokerSection').hidden = !poker;
  $('sectionSwitch').querySelectorAll('button').forEach(b => {
    const on = b.dataset.value === settings.section;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  if (poker && typeof PokerUI !== 'undefined') PokerUI.renderHub();
  if (poker && typeof PokerTutorial !== 'undefined') PokerTutorial.maybeWelcome();
}

function goHome() {
  showScreen('home');
  renderLobby();
}

function openGame(id) {
  settings.lastGame = id;
  if (PUZZLE_ROUNDS[id]) {
    PokerPuzzles.openSetup(id);
  } else if (id === 'arb' || id === 'mm') {
    settings.mode = id;
    saveSettings();
    renderTradeSetup();
    showScreen('tradeSetup');
  } else if (GAMES[id].section === 'math') {
    saveSettings();
    ({ mdrill: MathModes.openDrill, msheet: MathModes.openSheet, mquiz: MathModes.openQuiz })[id]();
  } else {
    saveSettings();
    ({ digits: Digits, switch: Switch, confirm: Confirm, series: Series, matrix: Matrix })[id].openSetup();
  }
}

const openLeadersFor = board => { if (typeof Online !== 'undefined') Online.openLeaders(board); };

// -------------------- SHARED SUMMARY --------------------
let summaryAgain = null;
let summaryBoard = null;

// opts: { board, score, title, bodyHtml, again, practice?, sub? }
// practice runs (custom drill settings) aren't saved as bests or posted
function showSummary(opts) {
  const practice = Boolean(opts.practice);
  const { isBest, prev } = practice ? { isBest: false, prev: null } : saveBest(opts.board, opts.score);
  const mode = opts.board.mode;
  summaryAgain = opts.again;
  summaryBoard = opts.board;
  $('summarySub').textContent = opts.sub || boardLabel(opts.board);
  $('summaryTitle').textContent = opts.title;
  $('summaryScore').textContent = fmtScore(mode, opts.score);
  $('summaryScore').className = 'big-pnl ' + scoreClass(mode, opts.score);
  $('summaryBest').innerHTML = practice
    ? '<span class="warn">Practice: custom settings aren\'t ranked</span>'
    : isBest
      ? '<span class="ok">New personal best!</span>'
      : `Your best: ${fmtScore(mode, prev)}`;
  $('summaryBody').innerHTML = opts.bodyHtml;
  $('summaryRank').textContent = '';
  showScreen('summary');
  if (!practice && typeof Online !== 'undefined') Online.recordScore(opts.board, opts.score, $('summaryRank'));
}

// -------------------- INIT --------------------
$('sectionSwitch').addEventListener('click', e => {
  const b = e.target.closest('button[data-value]');
  if (!b) return;
  settings.section = b.dataset.value;
  saveSettings();
  renderSection();
});
$('mathModeSwitch').addEventListener('click', e => {
  const b = e.target.closest('button[data-value]');
  if (!b) return;
  settings.mathMode = b.dataset.value;
  saveSettings();
  renderLobby();
});
['gameList', 'mathList'].forEach(list => $(list).addEventListener('click', e => {
  const row = e.target.closest('[data-game]');
  if (row) openGame(row.dataset.game);
}));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', goHome));
$('leadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(GAMES[settings.lastGame].section ? 'arb' : settings.lastGame)));
$('mathLeadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(GAMES[settings.lastGame].section === 'math' ? settings.lastGame : 'mdrill')));
$('pkLeadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(PUZZLE_ROUNDS[settings.lastGame] ? settings.lastGame : 'pkodds')));
$('tradeLeadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(settings.mode)));
$('resultsLeadersBtn').addEventListener('click', () => openLeadersFor(currentBoard(settings.mode)));
$('summaryLeadersBtn').addEventListener('click', () => openLeadersFor(summaryBoard));
$('summaryMenuBtn').addEventListener('click', goHome);
$('summaryAgainBtn').addEventListener('click', () => { if (summaryAgain) summaryAgain(); });

renderLobby();
