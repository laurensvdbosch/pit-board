/* ===========================================================
   PIT BOARD — Tape Audit (AUDT): number sequences
   ---------------------------------------------------------
   20 questions on a 5-minute clock, modeled on trading-firm
   sequence tests. Each shows 8 numbers and one of two prompts:
   - one extra number was inserted: type the one that doesn't fit
   - one number is wrong: type the wrong number
   Questions come from series-bank.js (built and checked by
   tools/build-series.mjs). No feedback until the results.
   Score = correct answers; skipped questions come back at the end.
   =========================================================== */

'use strict';

const Series = (() => {
  const SECONDS = 300;
  const PER_LEVEL = { 1: 7, 2: 7, 3: 6 };   // 20 questions, easiest first
  const PROMPT = {
    x: 'One extra number has been inserted into this sequence. Type the number that does not fit.',
    w: 'One number in this sequence is wrong. Type the wrong number.',
  };

  let g = null;   // the current session

  const board = () => ({ mode: 'series', difficulty: 'standard', rounds: SECONDS });
  const clock = t => `${Math.floor(t / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;

  // -------------------- SETUP --------------------
  function openSetup() {
    const best = store.get(boardBestKey(board()), null);
    $('srBest').textContent = best === null ? 'No sessions yet' : `Your best: ${fmtScore('series', best)} / 20`;
    $('srBankSize').textContent = SERIES_BANK.length;
    showScreen('seriesSetup');
  }

  // Draw a session, preferring questions this device hasn't seen recently
  function drawSet() {
    const recent = new Set(store.get('pitboard-series-recent', []));
    const set = [];
    for (const [level, n] of Object.entries(PER_LEVEL)) {
      const ids = shuffle(SERIES_BANK.map((_, i) => i).filter(i => SERIES_BANK[i][5] === Number(level)));
      set.push(...[...ids.filter(i => !recent.has(i)), ...ids.filter(i => recent.has(i))].slice(0, n));
    }
    store.set('pitboard-series-recent', [...recent, ...set].slice(-160));
    return set;
  }

  // -------------------- RUN --------------------
  function stop() {
    if (!g) return;
    clearInterval(g.clock);
    g = null;
  }

  function start() {
    stop();
    const ids = drawSet();
    g = {
      timeLeft: SECONDS,
      qs: ids.map(id => ({ id, given: null, ok: null, ms: 0, skipped: false })),
      queue: ids.map((_, i) => i),   // question indexes still to answer, in order
      input: '',
      shownAt: 0,
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
    const [type, nums] = SERIES_BANK[g.qs[qi].id];
    g.input = '';
    g.shownAt = performance.now();
    $('srInfo').textContent = `AUDT · Q${qi + 1} of 20`;
    $('srTimer').textContent = clock(g.timeLeft);
    $('srPrompt').textContent = PROMPT[type];
    $('srPrompt').className = `sr-prompt ${type === 'x' ? 'extra' : 'wrong'}`;
    $('srTape').innerHTML = nums.map(n => `<span>${n}</span>`).join('');
    $('srProgress').innerHTML = g.qs.map((q, i) => {
      const cls = i === qi ? 'cur' : q.given !== null ? 'done' : q.skipped ? 'skip' : '';
      return `<span class="${cls}"></span>`;
    }).join('');
    $('srSkip').disabled = g.queue.length < 2;
    renderEntry();
  }

  function renderEntry() {
    $('srEntry').textContent = g.input || ' ';
    $('srEntry').classList.toggle('empty', !g.input);
  }

  function spend() {
    const q = g.qs[g.queue[0]];
    q.ms += performance.now() - g.shownAt;
    return q;
  }

  function press(k) {
    if (!g) return;
    if (k === 'ok') { submit(); return; }
    if (k === 'del') g.input = g.input.slice(0, -1);
    else if (/^\d$/.test(k) && g.input.length < 6 && !(k === '0' && !g.input)) g.input += k;
    renderEntry();
  }

  function submit() {
    if (!g.input) return;
    const q = spend();
    const [, nums, ans] = SERIES_BANK[q.id];
    q.given = Number(g.input);
    q.ok = q.given === nums[ans];
    g.queue.shift();
    if (g.queue.length) show(); else finish();
  }

  function skip() {
    if (!g || g.queue.length < 2) return;
    const q = spend();
    q.skipped = true;
    g.queue.push(g.queue.shift());
    show();
  }

  // -------------------- RESULTS --------------------
  function finish() {
    if (!g) return;
    if (g.queue.length) spend();
    const run = g;
    stop();
    const answered = run.qs.filter(q => q.given !== null);
    const right = answered.filter(q => q.ok);
    const avg = answered.length ? Math.round(sum(answered.map(q => q.ms)) / answered.length / 100) / 10 : null;
    const levelStats = [1, 2, 3].map(l => {
      const qs = run.qs.filter(q => SERIES_BANK[q.id][5] === l);
      return `<tr><td>${['Easy', 'Medium', 'Hard'][l - 1]}</td><td>${qs.filter(q => q.given !== null).length}/${qs.length}</td><td>${qs.filter(q => q.ok).length}</td></tr>`;
    }).join('');

    const items = run.qs.map((q, i) => {
      const [type, nums, ans, fixed, rule] = SERIES_BANK[q.id];
      const status = q.given === null ? 'skip' : q.ok ? 'ok' : 'bad';
      const mark = { ok: '✓', bad: '✗', skip: '—' }[status];
      const why = type === 'x'
        ? `${nums[ans]} was inserted.`
        : `${nums[ans]} should be ${fixed}.`;
      return `
        <li class="sr-item ${status}">
          <div class="sr-item-head">
            <span>Q${i + 1} · ${type === 'x' ? 'Extra number' : 'Wrong number'}</span>
            <span class="sr-mark">${mark} ${q.given === null ? 'not answered' : `you: ${q.given}`}</span>
          </div>
          <div class="sr-item-seq">${nums.map((n, k) => (k === ans ? `<b>${n}</b>` : n)).join(', ')}</div>
          <small>${rule}. ${why}</small>
        </li>`;
    }).join('');

    showSummary({
      board: board(),
      score: right.length,
      title: run.queue.length ? 'Time called' : 'Tape audited',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Correct</span><span class="stat-val pos">${right.length}</span></div>
          <div><span class="stat-lbl">Answered</span><span class="stat-val">${answered.length}/20</span></div>
          <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${answered.length ? Math.round((100 * right.length) / answered.length) + '%' : '—'}</span></div>
          <div><span class="stat-lbl">Avg / answer</span><span class="stat-val">${avg === null ? '—' : `${avg}s`}</span></div>
          <div><span class="stat-lbl">Time used</span><span class="stat-val">${clock(SECONDS - Math.max(0, run.timeLeft))}</span></div>
          <div><span class="stat-lbl">Skipped</span><span class="stat-val">${run.qs.filter(q => q.given === null).length}</span></div>
        </div>
        <div class="table-wrap">
          <table class="book-table">
            <thead><tr><th>Level</th><th>Answered</th><th>Correct</th></tr></thead>
            <tbody>${levelStats}</tbody>
          </table>
        </div>
        <h4>Every question</h4>
        <ul class="sr-list">${items}</ul>
        <p class="note">Checklist: differences → ratios → odd/even positions separately → second differences → squares, cubes, primes → sum of previous terms.</p>`,
    });
  }

  function quit() {
    if (g && !confirm('Quit this session?')) return;
    stop();
    openSetup();
  }

  // -------------------- INIT --------------------
  $('srPad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => `<button data-k="${d}">${d}</button>`).join('') +
    '<button data-k="del" class="k-del" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="k-ok">Submit</button>';
  $('srPad').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (b) press(b.dataset.k);
  });
  document.addEventListener('keydown', e => {
    if (!g || $('seriesPlay').hidden) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('ok');
    else if (e.key === 'Tab') skip();
    else return;
    e.preventDefault();
  });
  $('srSkip').addEventListener('click', skip);
  $('srStart').addEventListener('click', start);
  $('srQuit').addEventListener('click', quit);
  $('srLeaders').addEventListener('click', () => openLeadersFor(board()));

  return { openSetup };
})();
