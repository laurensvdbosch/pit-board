/* ===========================================================
   PIT BOARD — Matrices (MTRX)
   ---------------------------------------------------------
   Abstract reasoning: find the missing figure. Puzzles come from
   matrix-gen.js at difficulty levels 1–9.
   - Test: 20 matrices in 10 minutes ramping from level 1 to 9;
     skip and come back. Score = correct answers.
   - Survival: endless, one level harder every 2 solved, 60 s per
     matrix, out after 3 misses. Score = matrices solved.
   Every puzzle sits in the same square frame (series are laid out
   in reading order on a 3×3 board). Each run remembers which kinds
   it has asked, so consecutive matrices are different in kind.
   =========================================================== */

'use strict';

const Matrix = (() => {
  const TEST_LEVELS = [1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 9, 9];
  const TEST_SECONDS = 600;
  const SURVIVAL_SECONDS = 60;
  const LIVES = 3;
  const FLASH_MS = 450;

  // Drawn on dark cells: solid = chalk, shaded = grey, outline = chalk stroke only
  const INK = '#EDEAE3';
  const FILL = { solid: INK, shaded: '#7E8288', outline: 'none' };
  const SEGMENTS = [
    [15, 15, 85, 15], [15, 85, 85, 85], [15, 15, 15, 85], [85, 15, 85, 85],
    [15, 15, 85, 85], [85, 15, 15, 85], [15, 50, 85, 50], [50, 15, 50, 85],
  ];

  let s = null;   // the current run

  const board = () => ({ mode: 'matrix', difficulty: settings.matrixMode, rounds: 0 });
  const clock = t => `${Math.floor(t / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;

  // -------------------- DRAWING --------------------
  const polyPoints = (cx, cy, r, n, offset = 0) => Array.from({ length: n }, (_, i) => {
    const a = ((-90 + offset + (360 / n) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const scaled = (cx, cy, r, pts) => pts.map(([x, y]) => `${(cx + x * r).toFixed(1)},${(cy + y * r).toFixed(1)}`).join(' ');

  function shapeSvg(el) {
    const { shape, sides, x, y, r, rot, fill } = el;
    const style = `fill="${FILL[fill]}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
    const t = rot ? ` transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : '';
    const P = pts => `<polygon points="${pts}" ${style}${t}/>`;
    switch (shape) {
      case 'circle': return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.9).toFixed(1)}" ${style}/>`;
      case 'square': return P(polyPoints(x, y, r, 4, 45));
      case 'diamond': return P(polyPoints(x, y, r, 4));
      case 'triangle': return P(polyPoints(x, y + r * 0.15, r * 1.05, 3));
      case 'pentagon': return P(polyPoints(x, y, r, 5));
      case 'hexagon': return P(polyPoints(x, y, r, 6, 30));
      case 'poly': return P(polyPoints(x, y, r, sides, sides === 4 ? 45 : 0));
      case 'star': return P(Array.from({ length: 10 }, (_, i) => {
        const a = ((-90 + 36 * i) * Math.PI) / 180, rr = i % 2 ? r * 0.45 : r;
        return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
      }).join(' '));
      case 'cross': return P(scaled(x, y, r, [[-0.3, -1], [0.3, -1], [0.3, -0.3], [1, -0.3], [1, 0.3], [0.3, 0.3], [0.3, 1], [-0.3, 1], [-0.3, 0.3], [-1, 0.3], [-1, -0.3], [-0.3, -0.3]]));
      case 'arrow': return P(scaled(x, y, r, [[0, -1], [0.62, -0.18], [0.22, -0.18], [0.22, 1], [-0.22, 1], [-0.22, -0.18], [-0.62, -0.18]]));
      case 'flag': return P(scaled(x, y, r, [[-0.55, 1], [-0.55, -1], [0.75, -0.55], [-0.25, -0.1], [-0.25, 1]]));
      case 'ell': return P(scaled(x, y, r, [[-0.6, -1], [-0.1, -1], [-0.1, 0.5], [0.7, 0.5], [0.7, 1], [-0.6, 1]]));
      default: return '';
    }
  }

  function figureSvg(fig) {
    const body = MatrixGen.build(fig).map(el => {
      if (el.k === 'seg') {
        if (el.i === 8) return `<circle cx="50" cy="50" r="13" fill="none" stroke="${INK}" stroke-width="5"/>`;
        const [x1, y1, x2, y2] = SEGMENTS[el.i];
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
      }
      if (el.k === 'dot') return `<circle cx="${el.x}" cy="${el.y}" r="7" fill="${INK}"/>`;
      if (el.k === 'frame') return el.frame === 'circle'
        ? `<circle cx="50" cy="50" r="44" fill="none" stroke="${INK}" stroke-width="2.5"/>`
        : `<rect x="8" y="8" width="84" height="84" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
      return shapeSvg(el);
    }).join('');
    return `<svg viewBox="0 0 100 100" class="mx-svg" aria-hidden="true">${body}</svg>`;
  }

  // Always a square board: grids use their own size, series fill a 3×3 board in reading order
  function puzzleHtml(p, fillAnswer = false) {
    const slots = p.kind === 'series' ? 9 : p.rows * p.cols;
    const cols = p.kind === 'series' ? 3 : p.cols;
    const cells = Array.from({ length: slots }, (_, i) => {
      if (i >= p.cells.length) return '<div class="mx-cell empty"></div>';
      const c = p.cells[i];
      const num = p.kind === 'series' ? `<span class="mx-num">${i + 1}</span>` : '';
      if (c) return `<div class="mx-cell">${num}${figureSvg(c)}</div>`;
      return fillAnswer ? `<div class="mx-cell answer">${num}${figureSvg(p.options[p.answer])}</div>` : `<div class="mx-cell gap">${num}?</div>`;
    }).join('');
    return `<div class="mx-grid" style="--cols:${cols}">${cells}</div>`;
  }

  // -------------------- SETUP --------------------
  function renderSetup() {
    document.querySelectorAll('#mxSetup .seg[data-mx] button').forEach(b => {
      const on = b.dataset.value === settings.matrixMode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
    const best = store.get(boardBestKey(board()), null);
    $('mxBest').textContent = best === null ? 'No runs in this mode yet' : `Your best: ${fmtScore('matrix', best)}`;
  }

  function openSetup() {
    renderSetup();
    const ex = MatrixGen.generate(3);
    $('mxExample').innerHTML = `<div class="mx-frame small">${puzzleHtml(ex, true)}</div><small>${ex.rules.join(' ')}</small>`;
    showScreen('mxSetup');
  }

  // -------------------- RUN --------------------
  function stop() {
    if (!s) return;
    clearInterval(s.clock);
    clearTimeout(s.flash);
    s = null;
  }

  function start() {
    stop();
    const test = settings.matrixMode === 'test';
    s = {
      test, history: [],
      qs: test ? TEST_LEVELS.map(level => ({ level, p: null, given: null })) : [],
      queue: test ? TEST_LEVELS.map((_, i) => i) : [],
      solved: 0, lives: LIVES, timeLeft: test ? TEST_SECONDS : SURVIVAL_SECONDS,
      busy: false, flash: null, clock: setInterval(tick, 1000),
    };
    if (!test) addSurvivalQuestion();
    showScreen('mxPlay');
    show();
  }

  const survivalLevel = () => Math.min(9, 1 + Math.floor(s.solved / 2));

  function addSurvivalQuestion() {
    s.qs.push({ level: survivalLevel(), p: null, given: null });
    s.queue = [s.qs.length - 1];
  }

  // Generated when first shown, so the run knows what it already asked
  function puzzleFor(q) {
    if (!q.p) {
      q.p = MatrixGen.generate(q.level, Math.random, s.history);
      s.history.push(q.p.signature);
    }
    return q.p;
  }

  function tick() {
    if (s.busy) return;
    s.timeLeft -= 1;
    hud();
    if (s.timeLeft > 0) return;
    if (s.test) finish();
    else answer(-1);   // survival: running out of time is a miss
  }

  function hud() {
    $('mxTimer').textContent = clock(s.timeLeft);
    $('mxTimer').classList.toggle('low', s.timeLeft <= (s.test ? 30 : 10));
    const q = s.queue.length ? s.qs[s.queue[0]] : null;   // empty right after the last answer
    if (s.test) {
      if (q) $('mxInfo').textContent = `MTRX · ${s.queue[0] + 1} of 20 · level ${q.level}`;
      $('mxStatus').innerHTML = `Correct <b>${s.qs.filter(x => x.ok).length}</b>`;
    } else {
      if (q) $('mxInfo').textContent = `MTRX · Survival · level ${q.level}`;
      $('mxStatus').innerHTML = `Solved <b>${s.solved}</b> <span class="mx-lives">${'♥'.repeat(s.lives)}<i>${'♥'.repeat(LIVES - s.lives)}</i></span>`;
    }
  }

  function show() {
    const q = s.qs[s.queue[0]];
    const p = puzzleFor(q);
    s.busy = false;
    $('mxPrompt').textContent = p.kind === 'series' ? 'Which figure comes next?' : 'Which figure completes the pattern?';
    $('mxPuzzle').innerHTML = puzzleHtml(p);
    $('mxOptions').innerHTML = p.options.map((o, i) => `<button class="mx-opt" data-i="${i}"><span>${'ABCDEFGH'[i]}</span>${figureSvg(o)}</button>`).join('');
    $('mxSkip').hidden = !s.test;
    $('mxSkip').disabled = s.queue.length < 2;
    $('mxProgress').hidden = !s.test;
    if (s.test) $('mxProgress').innerHTML = s.qs.map((x, i) => `<span class="${i === s.queue[0] ? 'cur' : x.given !== null ? 'done' : x.skipped ? 'skip' : ''}"></span>`).join('');
    hud();
  }

  function answer(i) {
    if (!s || s.busy) return;
    s.busy = true;
    const q = s.qs[s.queue[0]];
    q.given = i;
    q.ok = i === q.p.answer;
    const opts = $('mxOptions').children;
    opts[q.p.answer].classList.add('ok');
    if (i >= 0 && !q.ok) opts[i].classList.add('bad');
    const bottom = $('mxBottom');
    bottom.classList.remove('flash-ok', 'flash-bad');
    void bottom.offsetWidth;
    bottom.classList.add(q.ok ? 'flash-ok' : 'flash-bad');
    if (s.test) s.queue.shift();
    else {
      if (q.ok) s.solved++; else s.lives--;
      s.timeLeft = SURVIVAL_SECONDS;
    }
    hud();
    s.flash = setTimeout(() => {
      if (!s) return;
      if (s.test ? !s.queue.length : s.lives <= 0) { finish(); return; }
      if (!s.test) addSurvivalQuestion();
      show();
    }, q.ok ? FLASH_MS : FLASH_MS * 2.2);
  }

  function skip() {
    if (!s || s.busy || !s.test || s.queue.length < 2) return;
    s.qs[s.queue[0]].skipped = true;
    s.queue.push(s.queue.shift());
    show();
  }

  // -------------------- RESULTS --------------------
  function finish() {
    if (!s) return;
    const run = s;
    stop();
    const seen = run.qs.filter(q => q.p);
    const answered = seen.filter(q => q.given !== null);
    const right = answered.filter(q => q.ok).length;
    const score = run.test ? right : run.solved;
    const items = seen.map((q, i) => {
      const status = q.given === null ? 'skip' : q.ok ? 'ok' : 'bad';
      const note = q.given === null ? 'not answered' : q.given < 0 ? 'time ran out' : '';
      return `
        <li class="sr-item mx-item ${status}">
          <div class="sr-item-head"><span>${i + 1} · level ${q.level} · ${{ ok: '✓', bad: '✗', skip: '—' }[status]}</span><span class="sr-pts">${q.ok ? '+1' : '0'}</span></div>
          <div class="mx-review">
            <div class="mx-frame tiny">${puzzleHtml(q.p, true)}</div>
            ${q.given !== null && q.given >= 0 && !q.ok ? `<div class="mx-yours"><small>You picked</small>${figureSvg(q.p.options[q.given])}</div>` : note ? `<div class="mx-yours"><small>${note}</small></div>` : ''}
          </div>
          <small>${q.p.rules.join(' ')}</small>
        </li>`;
    }).join('');
    const top = seen.length ? Math.max(...seen.map(q => q.level)) : 1;
    showSummary({
      board: board(),
      score,
      title: run.test ? (score >= 16 ? 'Pattern master' : 'Test complete') : 'Out of lives',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Correct</span><span class="stat-val pos">${right}</span></div>
          <div><span class="stat-lbl">Answered</span><span class="stat-val">${answered.length}${run.test ? '/20' : ''}</span></div>
          <div><span class="stat-lbl">${run.test ? 'Time used' : 'Top level'}</span><span class="stat-val">${run.test ? clock(TEST_SECONDS - Math.max(0, run.timeLeft)) : `${top}/9`}</span></div>
        </div>
        <h4>Every matrix (answer filled in green)</h4>
        <ul class="sr-list">${items}</ul>
        <p class="note">Checklist: what changes — shape, colour, size, number, rotation, position, inner parts? Then how — along rows, down columns, along diagonals, step by step, combined from the first two, or only every other figure?</p>`,
    });
  }

  function quit() {
    if (s && !confirm('Quit this run?')) return;
    stop();
    openSetup();
  }

  // -------------------- INIT --------------------
  $('mxOptions').addEventListener('click', e => {
    const b = e.target.closest('.mx-opt');
    if (b) answer(Number(b.dataset.i));
  });
  document.addEventListener('keydown', e => {
    if (!s || $('mxPlay').hidden) return;
    const k = 'ABCDEFGH'.indexOf(e.key.toUpperCase());
    if (k >= 0 && e.key.length === 1) answer(k);
    else if (/^[1-8]$/.test(e.key)) answer(Number(e.key) - 1);
    else if (e.key === 'Tab') skip();
    else return;
    e.preventDefault();
  });
  $('mxSetup').querySelector('.seg[data-mx]').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    settings.matrixMode = b.dataset.value;
    saveSettings();
    renderSetup();
  });
  $('mxSkip').addEventListener('click', skip);
  $('mxStart').addEventListener('click', start);
  $('mxQuit').addEventListener('click', quit);
  $('mxLeaders').addEventListener('click', () => openLeadersFor(board()));

  return { openSetup, figureSvg, puzzleHtml };
})();
