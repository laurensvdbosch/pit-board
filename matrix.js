/* ===========================================================
   PIT BOARD — Matrices (MTRX)
   ---------------------------------------------------------
   Abstract reasoning: find the missing figure. Puzzles come from
   matrix-gen.js (grids, figure series, counting, overlays).
   - Test: 20 matrices in 10 minutes, getting harder; skip and
     come back. Score = correct answers.
   - Survival: endless, harder every 3 solved, 60 s per matrix,
     out after 3 misses. Score = matrices solved.
   The bottom flashes green/red after each answer; the results
   explain every matrix.
   =========================================================== */

'use strict';

const Matrix = (() => {
  const TEST_LEVELS = [1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5];
  const TEST_SECONDS = 600;
  const SURVIVAL_SECONDS = 60;
  const LIVES = 3;
  const FLASH_MS = 450;

  const INK = '#1B1D1F';
  const FILL = { black: INK, gray: '#9A9C9E', white: '#FFFFFF' };
  const SIZE_R = [15, 25, 37];
  const CORNERS = [[26, 26], [74, 26], [74, 74], [26, 74]];
  const DOT_CORNERS = [[13, 13], [87, 13], [87, 87], [13, 87]];
  const SEGMENTS = [
    [15, 15, 85, 15], [15, 85, 85, 85], [15, 15, 15, 85], [85, 15, 85, 85],
    [15, 15, 85, 85], [85, 15, 15, 85], [15, 50, 85, 50], [50, 15, 50, 85],
  ];
  const COUNT_LAYOUT = {
    1: [[50, 50]], 2: [[30, 50], [70, 50]], 3: [[50, 28], [28, 70], [72, 70]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[24, 34], [50, 34], [76, 34], [24, 66], [50, 66], [76, 66]],
    7: [[24, 24], [50, 24], [76, 24], [24, 50], [50, 50], [76, 50], [50, 76]],
    8: [[24, 24], [50, 24], [76, 24], [24, 50], [76, 50], [24, 76], [50, 76], [76, 76]],
    9: [[24, 24], [50, 24], [76, 24], [24, 50], [50, 50], [76, 50], [24, 76], [50, 76], [76, 76]],
  };

  let s = null;   // the current run

  const board = () => ({ mode: 'matrix', difficulty: settings.matrixMode, rounds: 0 });
  const clock = t => `${Math.floor(t / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;

  // -------------------- DRAWING --------------------
  const polyPoints = (cx, cy, r, n, offset = 0) => Array.from({ length: n }, (_, i) => {
    const a = ((-90 + offset + (360 / n) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const scaled = (cx, cy, r, pts) => pts.map(([x, y]) => `${(cx + x * r).toFixed(1)},${(cy + y * r).toFixed(1)}`).join(' ');

  function shapeSvg(shape, sides, cx, cy, r, rot, fill) {
    const style = `fill="${FILL[fill]}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
    const t = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';
    switch (shape) {
      case 'circle': return `<circle cx="${cx}" cy="${cy}" r="${r * 0.9}" ${style}/>`;
      case 'square': return `<polygon points="${polyPoints(cx, cy, r, 4, 45)}" ${style}${t}/>`;
      case 'diamond': return `<polygon points="${polyPoints(cx, cy, r, 4)}" ${style}${t}/>`;
      case 'triangle': return `<polygon points="${polyPoints(cx, cy + r * 0.15, r * 1.05, 3)}" ${style}${t}/>`;
      case 'pentagon': return `<polygon points="${polyPoints(cx, cy, r, 5)}" ${style}${t}/>`;
      case 'hexagon': return `<polygon points="${polyPoints(cx, cy, r, 6, 30)}" ${style}${t}/>`;
      case 'poly': return `<polygon points="${polyPoints(cx, cy, r, sides, sides === 4 ? 45 : 0)}" ${style}${t}/>`;
      case 'star': {
        const pts = Array.from({ length: 10 }, (_, i) => {
          const a = ((-90 + 36 * i) * Math.PI) / 180, rr = i % 2 ? r * 0.45 : r;
          return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
        }).join(' ');
        return `<polygon points="${pts}" ${style}${t}/>`;
      }
      case 'arrow': return `<polygon points="${scaled(cx, cy, r, [[0, -1], [0.62, -0.18], [0.22, -0.18], [0.22, 1], [-0.22, 1], [-0.22, -0.18], [-0.62, -0.18]])}" ${style}${t}/>`;
      case 'flag': return `<polygon points="${scaled(cx, cy, r, [[-0.55, 1], [-0.55, -1], [0.75, -0.55], [-0.25, -0.1], [-0.25, 1]])}" ${style}${t}/>`;
      default: return '';
    }
  }

  function figureSvg(f) {
    let body = '';
    if (f.t === 'lines') {
      SEGMENTS.forEach(([x1, y1, x2, y2], i) => {
        if (f.segs & (1 << i)) body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
      });
      if (f.segs & (1 << 8)) body += `<circle cx="50" cy="50" r="13" fill="none" stroke="${INK}" stroke-width="5"/>`;
    } else if (f.t === 'dots') {
      if (f.frame === 'circle') body += `<circle cx="50" cy="50" r="44" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
      if (f.frame === 'square') body += `<rect x="8" y="8" width="84" height="84" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
      body += COUNT_LAYOUT[f.n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${INK}"/>`).join('');
    } else {
      const places = f.pos >= 0 ? [CORNERS[f.pos]] : COUNT_LAYOUT[f.count];
      const r = f.count > 1 ? (f.count > 4 ? 10 : 13) : SIZE_R[f.size];
      body += places.map(([x, y]) => shapeSvg(f.shape, f.sides, x, y, r, f.rot, f.fill)).join('');
      if (f.dot >= 0) body += `<circle cx="${DOT_CORNERS[f.dot][0]}" cy="${DOT_CORNERS[f.dot][1]}" r="7" fill="${INK}"/>`;
    }
    return `<svg viewBox="0 0 100 100" class="mx-svg" aria-hidden="true">${body}</svg>`;
  }

  function puzzleHtml(p, fillAnswer = false) {
    const cells = p.cells.map(c => {
      if (c) return `<div class="mx-cell">${figureSvg(c)}</div>`;
      return fillAnswer ? `<div class="mx-cell answer">${figureSvg(p.options[p.answer])}</div>` : '<div class="mx-cell gap">?</div>';
    }).join('');
    const cols = p.kind === 'series' ? Math.min(p.cols, 4) : p.cols;
    return `<div class="mx-grid ${p.kind}" style="--cols:${cols}">${cells}</div>`;
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
    const ex = MatrixGen.generate(2);
    $('mxExample').innerHTML = `${puzzleHtml(ex, true)}<small>${ex.rules.join(' ')}</small>`;
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
      test,
      qs: test ? TEST_LEVELS.map(level => ({ p: MatrixGen.generate(level), given: null })) : [],
      queue: test ? TEST_LEVELS.map((_, i) => i) : [],
      solved: 0, lives: LIVES, timeLeft: test ? TEST_SECONDS : SURVIVAL_SECONDS,
      busy: false, flash: null, clock: setInterval(tick, 1000),
    };
    if (!test) addSurvivalQuestion();
    showScreen('mxPlay');
    show();
  }

  const survivalLevel = () => Math.min(5, 1 + Math.floor(s.solved / 3));

  function addSurvivalQuestion() {
    s.qs.push({ p: MatrixGen.generate(survivalLevel()), given: null });
    s.queue = [s.qs.length - 1];
  }

  function tick() {
    if (s.busy) return;
    s.timeLeft -= 1;
    hud();
    if (s.timeLeft > 0) return;
    if (s.test) finish();
    else answer(-1);   // survival: time out counts as a miss
  }

  function hud() {
    $('mxTimer').textContent = clock(s.timeLeft);
    $('mxTimer').classList.toggle('low', s.timeLeft <= (s.test ? 30 : 10));
    if (s.test) {
      const qi = s.queue[0];
      $('mxInfo').textContent = `MTRX · ${qi + 1} of 20`;
      $('mxStatus').innerHTML = `Correct <b>${s.qs.filter(q => q.ok).length}</b>`;
    } else {
      $('mxInfo').textContent = `MTRX · Survival · level ${survivalLevel()}`;
      $('mxStatus').innerHTML = `Solved <b>${s.solved}</b> <span class="mx-lives">${'♥'.repeat(s.lives)}<i>${'♥'.repeat(LIVES - s.lives)}</i></span>`;
    }
  }

  function show() {
    const q = s.qs[s.queue[0]];
    s.busy = false;
    s.shownAt = performance.now();
    $('mxPrompt').textContent = q.p.kind === 'series' ? 'Which figure comes next?' : 'Which figure completes the pattern?';
    $('mxPuzzle').innerHTML = puzzleHtml(q.p);
    $('mxOptions').innerHTML = q.p.options.map((o, i) => `<button class="mx-opt" data-i="${i}"><span>${'ABCDEFGH'[i]}</span>${figureSvg(o)}</button>`).join('');
    $('mxSkip').hidden = !s.test;
    $('mxSkip').disabled = s.queue.length < 2;
    $('mxProgress').hidden = !s.test;
    if (s.test) {
      $('mxProgress').innerHTML = s.qs.map((x, i) => `<span class="${i === s.queue[0] ? 'cur' : x.given !== null ? 'done' : x.skipped ? 'skip' : ''}"></span>`).join('');
    }
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
    if (s.test) {
      s.queue.shift();
    } else {
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
    const answered = run.qs.filter(q => q.given !== null);
    const right = answered.filter(q => q.ok).length;
    const score = run.test ? right : run.solved;
    const items = run.qs.map((q, i) => {
      const status = q.given === null ? 'skip' : q.ok ? 'ok' : 'bad';
      const mine = q.given === null ? 'not answered' : q.given < 0 ? 'time ran out' : '';
      return `
        <li class="sr-item mx-item ${status}">
          <div class="sr-item-head"><span>${i + 1} · level ${q.p.level} · ${{ ok: '✓', bad: '✗', skip: '—' }[status]}</span><span class="sr-pts">${q.ok ? '+1' : '0'}</span></div>
          <div class="mx-review">
            ${puzzleHtml(q.p, true)}
            ${q.given !== null && q.given >= 0 && !q.ok ? `<div class="mx-yours"><small>You picked</small>${figureSvg(q.p.options[q.given])}</div>` : mine ? `<div class="mx-yours"><small>${mine}</small></div>` : ''}
          </div>
          <small>${q.p.rules.join(' ')}</small>
        </li>`;
    }).join('');
    const reached = run.qs.length ? Math.max(...run.qs.map(q => q.p.level)) : 1;
    showSummary({
      board: board(),
      score,
      title: run.test ? (score >= 16 ? 'Pattern master' : 'Test complete') : 'Out of lives',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Correct</span><span class="stat-val pos">${right}</span></div>
          <div><span class="stat-lbl">Answered</span><span class="stat-val">${answered.length}${run.test ? '/20' : ''}</span></div>
          <div><span class="stat-lbl">${run.test ? 'Time used' : 'Top level'}</span><span class="stat-val">${run.test ? clock(TEST_SECONDS - Math.max(0, run.timeLeft)) : reached}</span></div>
        </div>
        <h4>Every matrix (answer filled in green)</h4>
        <ul class="sr-list">${items}</ul>
        <p class="note">Checklist: shape → colour → size → number → rotation → position. Then look for one-of-each per row, a step that repeats, or the third figure combining the first two.</p>`,
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
