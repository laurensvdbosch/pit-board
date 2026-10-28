/* ===========================================================
   PIT BOARD — Tape Audit (AUDT): number logic
   ---------------------------------------------------------
   Optiver-style sequences: see the terms, pick the next one from
   5 options. 20 questions on a 5-minute clock, medium first then
   hard. +1 right, −1 wrong, 0 skipped. The bottom of the screen
   flashes green or red after each answer. Questions come from
   series-bank.js (built and checked by tools/build-series.mjs).
   =========================================================== */

'use strict';

const Series = (() => {
  const SECONDS = 300;
  const PER_LEVEL = { 2: 6, 3: 14 };   // 20 questions
  const FLASH_MS = 380;
  const RECENT_KEY = 'pitboard-series2-recent';

  let g = null;   // the current session

  const board = () => ({ mode: 'series', difficulty: 'nextval', rounds: SECONDS });
  const clock = t => `${Math.floor(t / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;

  // "p/q" or integer → HTML. 'mixed' shows 37½ style, 'frac' a stacked fraction.
  function num(s, mode) {
    const [p, d] = String(s).split('/').map(Number);
    const sign = p < 0 ? '−' : '';
    const a = Math.abs(p);
    if (!d) return `${sign}${a}`;
    const stack = (n, den, cls = '') => `<span class="fr${cls}"><span>${n}</span><span>${den}</span></span>`;
    if (mode === 'mixed' && a > d) return `${sign}${Math.floor(a / d)}${stack(a % d, d, ' sm')}`;
    return `${sign}${stack(a, d)}`;
  }

  // -------------------- SETUP --------------------
  function openSetup() {
    const best = store.get(boardBestKey(board()), null);
    $('srBest').textContent = best === null ? 'No sessions yet' : `Your best: ${fmtScore('series', best)}`;
    $('srBankSize').textContent = SERIES_BANK.length;
    showScreen('seriesSetup');
  }

  // Medium first, then hard; prefer questions this device hasn't seen recently
  function drawSet() {
    const recent = new Set(store.get(RECENT_KEY, []));
    const set = [];
    for (const [level, n] of Object.entries(PER_LEVEL)) {
      const ids = shuffle(SERIES_BANK.map((_, i) => i).filter(i => SERIES_BANK[i][5] === Number(level)));
      set.push(...[...ids.filter(i => !recent.has(i)), ...ids.filter(i => recent.has(i))].slice(0, n));
    }
    store.set(RECENT_KEY, [...recent, ...set].slice(-240));
    return set;
  }

  // -------------------- RUN --------------------
  function stop() {
    if (!g) return;
    clearInterval(g.clock);
    clearTimeout(g.flash);
    g = null;
  }

  function start() {
    stop();
    const ids = drawSet();
    g = {
      timeLeft: SECONDS,
      qs: ids.map(id => ({ id, given: null, ok: null, ms: 0 })),
      queue: ids.map((_, i) => i),   // question indexes still open, in order
      shownAt: 0,
      busy: false,
      flash: null,
      clock: setInterval(tick, 1000),
    };
    showScreen('seriesPlay');
    show();
  }

  function tick() {
    g.timeLeft -= 1;
    $('srTimer').textContent = clock(g.timeLeft);
    $('srTimer').classList.toggle('low', g.timeLeft <= 30);
    if (g.timeLeft <= 0) finish();
  }

  function show() {
    const qi = g.queue[0];
    const [mode, shown, , options] = SERIES_BANK[g.qs[qi].id];
    g.shownAt = performance.now();
    g.busy = false;
    $('srInfo').textContent = `AUDT · Q${qi + 1} of 20`;
    $('srTimer').textContent = clock(g.timeLeft);
    $('srTape').innerHTML = shown.map(s => `<span>${num(s, mode)}</span>`).join('') + '<span class="q">?</span>';
    $('srOptions').innerHTML = options.map((o, i) =>
      `<button class="sr-opt" data-i="${i}"><span class="sr-key">${'ABCDE'[i]}</span><span class="sr-val">${num(o, mode)}</span></button>`).join('');
    $('srProgress').innerHTML = g.qs.map((q, i) => {
      const cls = i === qi ? 'cur' : q.given !== null ? (q.ok ? 'ok' : 'bad') : q.skipped ? 'skip' : '';
      return `<span class="${cls}"></span>`;
    }).join('');
    $('srScore').textContent = g.qs.reduce((s, q) => s + (q.given === null ? 0 : q.ok ? 1 : -1), 0);
    $('srSkip').disabled = g.queue.length < 2;
  }

  function spend() {
    const q = g.qs[g.queue[0]];
    q.ms += performance.now() - g.shownAt;
    return q;
  }

  function choose(i) {
    if (!g || g.busy) return;
    g.busy = true;
    const q = spend();
    const [, , answer, options] = SERIES_BANK[q.id];
    q.given = options[i];
    q.ok = q.given === answer;
    // Light green / red flash on the bottom half, then the next question
    const bottom = $('srBottom');
    bottom.classList.remove('flash-ok', 'flash-bad');
    void bottom.offsetWidth;
    bottom.classList.add(q.ok ? 'flash-ok' : 'flash-bad');
    $('srOptions').children[i].classList.add(q.ok ? 'ok' : 'bad');
    g.queue.shift();
    g.flash = setTimeout(() => {
      if (!g) return;
      if (g.queue.length) show(); else finish();
    }, FLASH_MS);
  }

  function skip() {
    if (!g || g.busy || g.queue.length < 2) return;
    const q = spend();
    q.skipped = true;
    g.queue.push(g.queue.shift());
    show();
  }

  // -------------------- RESULTS --------------------
  function finish() {
    if (!g) return;
    if (g.queue.length && !g.busy) spend();
    const run = g;
    stop();
    const answered = run.qs.filter(q => q.given !== null);
    const right = answered.filter(q => q.ok).length;
    const wrong = answered.length - right;
    const score = right - wrong;
    const avg = answered.length ? Math.round(sum(answered.map(q => q.ms)) / answered.length / 100) / 10 : null;

    const items = run.qs.map((q, i) => {
      const [mode, shown, answer, , rule] = SERIES_BANK[q.id];
      const status = q.given === null ? 'skip' : q.ok ? 'ok' : 'bad';
      const pts = { ok: '+1', bad: '−1', skip: '0' }[status];
      return `
        <li class="sr-item ${status}">
          <div class="sr-item-head"><span>Q${i + 1} ${{ ok: '✓', bad: '✗', skip: '—' }[status]}</span><span class="sr-pts">${pts}</span></div>
          <div class="sr-item-seq">${shown.map(s => num(s, mode)).join(', ')}, ?</div>
          <div class="sr-item-ans">
            <span>Your answer: <b>${q.given === null ? 'skipped' : num(q.given, mode)}</b></span>
            <span>Answer: <b>${num(answer, mode)}</b></span>
          </div>
          <small>${rule}.</small>
        </li>`;
    }).join('');

    showSummary({
      board: board(),
      score,
      title: run.queue.length ? 'Time called' : 'Tape audited',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Right</span><span class="stat-val pos">${right}</span></div>
          <div><span class="stat-lbl">Wrong</span><span class="stat-val neg">${wrong}</span></div>
          <div><span class="stat-lbl">Skipped</span><span class="stat-val">${20 - answered.length}</span></div>
          <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${answered.length ? Math.round((100 * right) / answered.length) + '%' : '—'}</span></div>
          <div><span class="stat-lbl">Avg / answer</span><span class="stat-val">${avg === null ? '—' : `${avg}s`}</span></div>
          <div><span class="stat-lbl">Time used</span><span class="stat-val">${clock(SECONDS - Math.max(0, run.timeLeft))}</span></div>
        </div>
        <p class="note">Scoring: +1 right, −1 wrong, 0 skipped — only answer when you're fairly sure.</p>
        <h4>Every question</h4>
        <ul class="sr-list">${items}</ul>
        <p class="note">Checklist: differences → ratios → odd/even positions separately → operation cycles (×, +, ÷ repeating) → differences of differences → primes, squares, powers → previous two/three terms combined → for fractions, numerators and denominators separately.</p>`,
    });
  }

  function quit() {
    if (g && !confirm('Quit this session?')) return;
    stop();
    openSetup();
  }

  // -------------------- INIT --------------------
  $('srOptions').addEventListener('click', e => {
    const b = e.target.closest('.sr-opt');
    if (b) choose(Number(b.dataset.i));
  });
  document.addEventListener('keydown', e => {
    if (!g || $('seriesPlay').hidden) return;
    const k = e.key.toUpperCase();
    if ('ABCDE'.includes(k) && k.length === 1) choose('ABCDE'.indexOf(k));
    else if (/^[1-5]$/.test(e.key)) choose(Number(e.key) - 1);
    else if (e.key === 'Tab') skip();
    else return;
    e.preventDefault();
  });
  $('srSkip').addEventListener('click', skip);
  $('srStart').addEventListener('click', start);
  $('srQuit').addEventListener('click', quit);
  $('srLeaders').addEventListener('click', () => openLeadersFor(board()));

  return { openSetup, num };
})();
