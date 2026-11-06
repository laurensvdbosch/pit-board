/* ===========================================================
   PIT BOARD — Mental math section
   ---------------------------------------------------------
   Three modes, questions from math-gen.js:
   - Speed drill (mdrill): + − × ÷ with custom ranges and duration.
     Type the answer; a correct one moves on by itself. Only the
     standard settings (2–100 + 2–100, 2–12 × 2–100, 120 s) are ranked:
     board (mdrill, standard, 120).
   - Answer sheet (msheet): 10/20/50 mixed questions on one scrollable
     page, 30% easy · 50% medium · 20% hard. Regular 24 s or assessment
     12 s per question. +1 per correct. Board (msheet, regular|assess, n).
   - Multiple choice (mquiz): 20 questions, 5 options, +1 / −1 / 0 skip,
     easy 5 min · medium 8 min · hard 10 min. Board (mquiz, level, 20).
   Quant mode (settings.mathMode, switched on the home screen) applies to
   the sheet and multiple choice: 10 questions a minute (Optiver 80 in 8,
   Maven 50 in 5), each question independently 10% easy · 40% medium ·
   50% hard, no difficulty choice. Boards use difficulty 'quant'.
   =========================================================== */

'use strict';

const MathModes = (() => {
  const clock = t => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;
  const secsLeft = endAt => Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  const LEVEL = { easy: 1, medium: 2, hard: 3 };
  const LEVEL_NAME = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  const QUANT_SECS = 6;                        // 10 questions a minute
  const quant = () => settings.mathMode === 'quant';
  // Quant: every question rolls its own level, 10% easy · 40% medium · 50% hard
  const quantLevel = () => { const r = Math.random(); return r < 0.1 ? 1 : r < 0.5 ? 2 : 3; };
  const avgSecs = (ms, n) => (n ? `${(ms / n / 1000).toFixed(1)}s` : '—');

  function setSeg(el, value) {
    el.querySelectorAll('button[data-value]').forEach(b => {
      const on = b.dataset.value === String(value);
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
  }

  function flash(el, ok) {
    el.classList.remove('flash-ok', 'flash-bad');
    void el.offsetWidth;
    el.classList.add(ok ? 'flash-ok' : 'flash-bad');
  }

  // ================================================================
  //  SPEED DRILL
  // ================================================================
  const STD = MathGen.DRILL_STANDARD;
  const DRILL_SECS = [30, 60, 120, 300, 600];
  const OPS = ['add', 'sub', 'mul', 'div'];
  const RANGES = ['addA', 'addB', 'mulA', 'mulB'];
  const OP_LABEL = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' };
  const OP_SIGN = { add: '+', sub: '−', mul: '×', div: '÷' };
  const drillBoard = () => ({ mode: 'mdrill', difficulty: 'standard', rounds: 120 });

  // Settings come from storage, so check every field
  function drillCfg() {
    const c = settings.mathDrill && typeof settings.mathDrill === 'object' ? settings.mathDrill : {};
    const out = { secs: DRILL_SECS.includes(c.secs) ? c.secs : STD.secs };
    OPS.forEach(o => { out[o] = typeof c[o] === 'boolean' ? c[o] : STD[o]; });
    RANGES.forEach(r => {
      const v = Array.isArray(c[r]) ? c[r].map(Number) : [];
      out[r] = v.length === 2 && v.every(n => Number.isInteger(n) && n >= 0 && n <= 9999) ? v : [...STD[r]];
    });
    if (!OPS.some(o => out[o])) OPS.forEach(o => { out[o] = true; });
    settings.mathDrill = out;
    return out;
  }

  const isStandard = c => c.secs === STD.secs && OPS.every(o => c[o] === STD[o])
    && RANGES.every(r => c[r][0] === STD[r][0] && c[r][1] === STD[r][1]);

  function describe(c) {
    const ops = OPS.filter(o => c[o]).map(o => OP_SIGN[o]).join(' ');
    return `Speed drill · custom ${ops} · ${c.secs < 120 ? `${c.secs}s` : `${c.secs / 60} min`}`;
  }

  function renderDrillSetup() {
    const c = drillCfg();
    $('mdOps').querySelectorAll('[data-op]').forEach(cb => { cb.checked = c[cb.dataset.op]; });
    $('mdOps').querySelectorAll('[data-r]').forEach(inp => {
      const [r, i] = inp.dataset.r.split('.');
      if (document.activeElement !== inp) inp.value = c[r][i];
    });
    setSeg($('mdSecs'), c.secs);
    const std = isStandard(c);
    $('mdRanked').innerHTML = std
      ? '<span class="ok">Standard settings: ranked on the leaderboard</span>'
      : '<span class="warn">Custom settings: practice only, not ranked</span>';
    $('mdReset').hidden = std;
    const best = store.get(boardBestKey(drillBoard()), null);
    $('mdBest').textContent = best === null ? 'No ranked runs yet' : `Ranked best: ${fmtScore('mdrill', best)}`;
  }

  // Read the inputs back into settings; a bad range (empty, min > max) keeps the old value until fixed
  function readDrillInputs() {
    const c = drillCfg();
    $('mdOps').querySelectorAll('[data-op]').forEach(cb => { c[cb.dataset.op] = cb.checked; });
    RANGES.forEach(r => {
      const lo = $('mdOps').querySelector(`[data-r="${r}.0"]`), hi = $('mdOps').querySelector(`[data-r="${r}.1"]`);
      const a = Number(lo.value), b = Number(hi.value);
      const good = lo.value !== '' && hi.value !== '' && Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b <= 9999 && a <= b;
      lo.classList.toggle('bad', !good);
      hi.classList.toggle('bad', !good);
      if (good) c[r] = [a, b];
    });
    settings.mathDrill = c;
    saveSettings();
  }

  function openDrill() {
    renderDrillSetup();
    showScreen('mdSetup');
  }

  let d = null;   // the running drill

  function startDrill() {
    readDrillInputs();
    const c = drillCfg();
    if (!OPS.some(o => c[o])) { alert('Pick at least one operation.'); return; }
    if (c.div && c.mulA[1] === 0) { alert('Division needs a multiplication range above 0.'); return; }
    stopDrill();
    d = {
      cfg: c, ranked: isStandard(c), score: 0, q: null, shownAt: 0, log: [],
      endAt: Date.now() + c.secs * 1000,
      timer: setInterval(tickDrill, 200),
    };
    showScreen('mdPlay');
    $('mdInfo').textContent = d.ranked ? 'DRIL · Standard · ranked' : 'DRIL · Custom · practice';
    $('mdScore').textContent = '0';
    $('mdInput').value = '';
    nextDrill();
    tickDrill();
    $('mdInput').focus();
  }

  function nextDrill() {
    d.q = MathGen.drill(d.cfg, d.q);
    d.shownAt = performance.now();
    $('mdQ').innerHTML = d.q.html;
    $('mdInput').value = '';
  }

  function tickDrill() {
    if (!d) return;
    const left = secsLeft(d.endAt);
    $('mdTimer').textContent = clock(left);
    $('mdTimer').classList.toggle('low', left <= 10);
    if (left <= 0) finishDrill();
  }

  function onDrillInput() {
    if (!d) return;
    const el = $('mdInput');
    const clean = el.value.replace(/[^0-9]/g, '');
    if (clean !== el.value) el.value = clean;
    if (clean !== '' && Number(clean) === d.q.answer) {
      d.score += 1;
      d.log.push({ op: d.q.op, html: d.q.html, answer: d.q.answer, ms: performance.now() - d.shownAt });
      $('mdScore').textContent = d.score;
      nextDrill();
    }
  }

  function stopDrill() {
    if (!d) return;
    clearInterval(d.timer);
    d = null;
  }

  function finishDrill() {
    if (!d) return;
    const run = d;
    stopDrill();
    $('mdInput').blur();
    const mins = run.cfg.secs / 60;
    const byOp = OPS.filter(o => run.cfg[o]).map(o => {
      const rows = run.log.filter(l => l.op === o);
      return `<div><span class="stat-lbl">${OP_SIGN[o]} ${OP_LABEL[o]}</span><span class="stat-val">${rows.length}</span><small class="dim">${avgSecs(sum(rows.map(r => r.ms)), rows.length)} avg</small></div>`;
    }).join('');
    const slow = [...run.log].sort((a, b) => b.ms - a.ms).slice(0, 5);
    showSummary({
      board: drillBoard(),
      practice: !run.ranked,
      sub: run.ranked ? null : describe(run.cfg),
      score: run.score,
      title: 'Time',
      again: startDrill,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Solved</span><span class="stat-val">${run.score}</span></div>
          <div><span class="stat-lbl">Per minute</span><span class="stat-val">${(run.score / mins).toFixed(1)}</span></div>
          <div><span class="stat-lbl">Avg / answer</span><span class="stat-val">${avgSecs(sum(run.log.map(l => l.ms)), run.log.length)}</span></div>
        </div>
        <h4>By operation</h4>
        <div class="stat-grid md-ops-grid">${byOp}</div>
        ${slow.length ? `<h4>Your slowest</h4>
        <ul class="sr-list">${slow.map(l => `
          <li class="sr-item"><div class="mq-review-row"><span class="mq-review-q">${l.html} ${l.answer}</span><span class="dim">${(l.ms / 1000).toFixed(1)}s</span></div></li>`).join('')}
        </ul>` : ''}
        <p class="note">${run.ranked ? 'Standard settings, so this run counts for the leaderboard.' : 'Custom settings are practice only. Reset to standard settings to get on the leaderboard.'}</p>`,
    });
  }

  function quitDrill() {
    if (d && !confirm('Quit this drill?')) return;
    stopDrill();
    openDrill();
  }

  // ================================================================
  //  ANSWER SHEET
  // ================================================================
  const SHEET_COUNTS = [10, 20, 50];
  const SHEET_PACE = { regular: 24, assess: 12 };   // seconds per question
  const SHEET_MIX = { 1: 0.3, 3: 0.2 };             // the rest is medium
  const sheetPace = () => (quant() ? 'quant' : settings.sheetPace);
  const sheetBoard = () => ({ mode: 'msheet', difficulty: sheetPace(), rounds: settings.sheetCount });
  const sheetSecs = (pace, n) => (pace === 'quant' ? QUANT_SECS : SHEET_PACE[pace]) * n;
  const mins = s => (s % 60 ? clock(s) : `${s / 60} min`);

  function sheetSettings() {
    if (!SHEET_PACE[settings.sheetPace]) settings.sheetPace = 'regular';
    if (!SHEET_COUNTS.includes(settings.sheetCount)) settings.sheetCount = 20;
  }

  function renderSheetSetup() {
    sheetSettings();
    const pace = sheetPace();
    // Quant shows a single, fixed pace; normal lets you pick
    $('msPace').querySelectorAll('button').forEach(b => { b.hidden = (b.dataset.value === 'quant') !== quant(); });
    $('msPace').classList.toggle('seg-2', !quant());
    $('msPace').classList.toggle('seg-1', quant());
    setSeg($('msPace'), pace);
    setSeg($('msCount'), settings.sheetCount);
    $('msCount').querySelectorAll('button').forEach(b => {
      b.querySelector('small').textContent = mins(sheetSecs(pace, Number(b.dataset.value)));
    });
    const best = store.get(boardBestKey(sheetBoard()), null);
    $('msBest').textContent = best === null ? 'No tests on this setting yet' : `Your best: ${best} / ${settings.sheetCount}`;
  }

  function openSheet() {
    renderSheetSetup();
    showScreen('msSetup');
  }

  let sh = null;

  function startSheet() {
    sheetSettings();
    stopSheet();
    const n = settings.sheetCount;
    const pace = sheetPace();
    const easy = Math.round(n * SHEET_MIX[1]), hard = Math.round(n * SHEET_MIX[3]);
    const levels = pace === 'quant'
      ? Array.from({ length: n }, quantLevel)
      : shuffle([...Array(easy).fill(1), ...Array(n - easy - hard).fill(2), ...Array(hard).fill(3)]);
    const opts = { typed: true, recent: [], seen: new Set() };
    const secs = sheetSecs(pace, n);
    sh = {
      n, pace, secs,
      qs: levels.map(l => MathGen.question(l, opts)),
      endAt: Date.now() + secs * 1000,
      timer: setInterval(tickSheet, 250),
    };
    $('msList').innerHTML = sh.qs.map((q, i) => `
      <li class="ms-q" data-i="${i}">
        <span class="ms-n">${i + 1}</span>
        <span class="ms-expr">${q.html}</span>
        <input class="ms-in" data-i="${i}" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="${i === n - 1 ? 'done' : 'next'}" aria-label="Answer to question ${i + 1}">
      </li>`).join('');
    showScreen('msPlay');
    updateSheetInfo();
    tickSheet();
  }

  function updateSheetInfo() {
    if (!sh) return;
    const filled = [...$('msList').querySelectorAll('.ms-in')].filter(i => i.value.trim() !== '').length;
    $('msInfo').textContent = `SHET · ${filled} of ${sh.n} answered`;
  }

  function tickSheet() {
    if (!sh) return;
    const left = secsLeft(sh.endAt);
    $('msTimer').textContent = clock(left);
    $('msTimer').classList.toggle('low', left <= 30);
    if (left <= 0) finishSheet(true);
  }

  function stopSheet() {
    if (!sh) return;
    clearInterval(sh.timer);
    sh = null;
  }

  function submitSheet() {
    if (!sh) return;
    const blank = [...$('msList').querySelectorAll('.ms-in')].filter(i => i.value.trim() === '').length;
    if (blank && !confirm(`${blank} question${blank === 1 ? '' : 's'} still blank. Hand in anyway?`)) return;
    finishSheet(false);
  }

  function finishSheet(timeUp) {
    if (!sh) return;
    const run = sh;
    const given = [...$('msList').querySelectorAll('.ms-in')].map(i => i.value.trim());
    const used = run.secs - secsLeft(run.endAt);
    stopSheet();
    if (document.activeElement) document.activeElement.blur();
    const res = run.qs.map((q, i) => {
      const v = MathGen.parse(given[i]);
      return { q, text: given[i], status: given[i] === '' ? 'skip' : MathGen.same(v, q.answer) ? 'ok' : 'bad' };
    });
    const right = res.filter(r => r.status === 'ok').length;
    const wrong = res.filter(r => r.status === 'bad').length;
    const blank = run.n - right - wrong;
    const byLevel = [1, 2, 3].map(l => {
      const rows = res.filter(r => r.q.level === l);
      if (!rows.length) return `<div><span class="stat-lbl">${LEVEL_NAME[l]}</span><span class="stat-val dim">—</span></div>`;
      return `<div><span class="stat-lbl">${LEVEL_NAME[l]}</span><span class="stat-val">${rows.filter(r => r.status === 'ok').length}/${rows.length}</span></div>`;
    }).join('');
    const items = res.map((r, i) => `
      <li class="sr-item ${r.status}">
        <div class="sr-item-head"><span>Q${i + 1} · ${LEVEL_NAME[r.q.level]} <span class="sr-mark">${{ ok: '✓', bad: '✗', skip: '—' }[r.status]}</span></span><span class="sr-pts">${r.status === 'ok' ? '+1' : '0'}</span></div>
        <div class="mq-review-q">${r.q.html}</div>
        <div class="sr-item-ans">
          <span>You: <b class="${r.status === 'bad' ? 'neg' : r.status === 'ok' ? 'pos' : ''}">${r.text === '' ? 'blank' : escHtml(r.text)}</b></span>
          ${r.status === 'ok' ? '' : `<span>Answer: <b>${MathGen.fmt(r.q.answer)}</b></span>`}
        </div>
      </li>`).join('');
    showSummary({
      board: { mode: 'msheet', difficulty: run.pace, rounds: run.n },
      score: right,
      title: timeUp ? 'Time called' : 'Sheet handed in',
      again: startSheet,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Right</span><span class="stat-val pos">${right}</span></div>
          <div><span class="stat-lbl">Wrong</span><span class="stat-val neg">${wrong}</span></div>
          <div><span class="stat-lbl">Blank</span><span class="stat-val">${blank}</span></div>
          <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${right + wrong ? Math.round((100 * right) / (right + wrong)) + '%' : '—'}</span></div>
          <div><span class="stat-lbl">Time used</span><span class="stat-val">${clock(used)}</span></div>
          <div><span class="stat-lbl">Per question</span><span class="stat-val">${(used / run.n).toFixed(1)}s</span></div>
        </div>
        <h4>By difficulty</h4>
        <div class="stat-grid">${byLevel}</div>
        <h4>Every question</h4>
        <ul class="sr-list">${items}</ul>`,
    });
  }

  function quitSheet() {
    if (sh && !confirm('Quit this test? Your answers will be lost.')) return;
    stopSheet();
    openSheet();
  }

  const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ================================================================
  //  MULTIPLE CHOICE
  // ================================================================
  const QUIZ_N = 20;
  const QUIZ_SECS = { easy: 300, medium: 480, hard: 600, quant: QUANT_SECS * QUIZ_N };
  const FLASH_MS = 380;
  const quizLevel = () => (quant() ? 'quant' : settings.quizLevel);
  const quizBoard = () => ({ mode: 'mquiz', difficulty: quizLevel(), rounds: QUIZ_N });

  function renderQuizSetup() {
    if (!QUIZ_SECS[settings.quizLevel] || settings.quizLevel === 'quant') settings.quizLevel = 'medium';
    // Quant is always the hardest mix: no level to choose
    $('mqLevel').querySelectorAll('button').forEach(b => { b.hidden = (b.dataset.value === 'quant') !== quant(); });
    $('mqLevel').classList.toggle('seg-3', !quant());
    $('mqLevel').classList.toggle('seg-1', quant());
    setSeg($('mqLevel'), quizLevel());
    const best = store.get(boardBestKey(quizBoard()), null);
    $('mqBest').textContent = best === null ? 'No quizzes on this level yet' : `Your best: ${fmtScore('mquiz', best)}`;
  }

  function openQuiz() {
    renderQuizSetup();
    showScreen('mqSetup');
  }

  let g = null;

  function startQuiz() {
    renderQuizSetup();
    stopQuiz();
    const level = quizLevel();
    const opts = { recent: [], seen: new Set() };
    const qs = Array.from({ length: QUIZ_N }, () => {
      const q = MathGen.question(level === 'quant' ? quantLevel() : LEVEL[level], opts);
      return { q, opts: MathGen.options(q), given: null, ok: null, ms: 0, skipped: false };
    });
    g = {
      level, qs, queue: qs.map((_, i) => i), busy: false, flash: null, shownAt: 0,
      secs: QUIZ_SECS[level],
      endAt: Date.now() + QUIZ_SECS[level] * 1000,
      timer: setInterval(tickQuiz, 250),
    };
    showScreen('mqPlay');
    showQuiz();
    tickQuiz();
  }

  function tickQuiz() {
    if (!g) return;
    const left = secsLeft(g.endAt);
    $('mqTimer').textContent = clock(left);
    $('mqTimer').classList.toggle('low', left <= 30);
    if (left <= 0) finishQuiz();
  }

  function showQuiz() {
    const qi = g.queue[0];
    const item = g.qs[qi];
    g.shownAt = performance.now();
    g.busy = false;
    $('mqInfo').textContent = `MCQS · Q${qi + 1} of ${QUIZ_N}`;
    $('mqLevelTag').textContent = g.level === 'quant' ? `Quant · ${LEVEL_NAME[item.q.level]}` : LEVEL_NAME[LEVEL[g.level]];
    $('mqQuestion').innerHTML = item.q.html;
    $('mqQuestion').classList.toggle('long', item.q.html.replace(/<[^>]+>/g, '').length > 16);
    $('mqOptions').innerHTML = item.opts.list.map((o, i) =>
      `<button class="sr-opt" data-i="${i}"><span class="sr-key">${'ABCDE'[i]}</span><span class="sr-val">${o}</span></button>`).join('');
    $('mqProgress').innerHTML = g.qs.map((q, i) => {
      const cls = i === qi ? 'cur' : q.given !== null ? (q.ok ? 'ok' : 'bad') : q.skipped ? 'skip' : '';
      return `<span class="${cls}"></span>`;
    }).join('');
    $('mqScore').textContent = quizScore();
    $('mqSkip').disabled = g.queue.length < 2;
  }

  const quizScore = () => g.qs.reduce((s, q) => s + (q.given === null ? 0 : q.ok ? 1 : -1), 0);

  function spend() {
    const item = g.qs[g.queue[0]];
    item.ms += performance.now() - g.shownAt;
    return item;
  }

  function chooseQuiz(i) {
    if (!g || g.busy || i >= 5) return;
    g.busy = true;
    const item = spend();
    item.given = i;
    item.ok = i === item.opts.answerIndex;
    flash($('mqBottom'), item.ok);
    $('mqOptions').children[i].classList.add(item.ok ? 'ok' : 'bad');
    g.queue.shift();
    g.flash = setTimeout(() => {
      if (!g) return;
      if (g.queue.length) showQuiz(); else finishQuiz();
    }, FLASH_MS);
  }

  function skipQuiz() {
    if (!g || g.busy || g.queue.length < 2) return;
    const item = spend();
    item.skipped = true;
    g.queue.push(g.queue.shift());
    showQuiz();
  }

  function stopQuiz() {
    if (!g) return;
    clearInterval(g.timer);
    clearTimeout(g.flash);
    g = null;
  }

  function finishQuiz() {
    if (!g) return;
    if (g.queue.length && !g.busy) spend();
    const run = g;
    const score = quizScore();
    const used = run.secs - secsLeft(run.endAt);
    stopQuiz();
    const answered = run.qs.filter(q => q.given !== null);
    const right = answered.filter(q => q.ok).length;
    const wrong = answered.length - right;
    const items = run.qs.map((it, i) => {
      const status = it.given === null ? 'skip' : it.ok ? 'ok' : 'bad';
      const answer = it.opts.list[it.opts.answerIndex];
      return `
        <li class="sr-item ${status}">
          <div class="sr-item-head"><span>Q${i + 1}${run.level === 'quant' ? ` · ${LEVEL_NAME[it.q.level]}` : ''} <span class="sr-mark">${{ ok: '✓ right', bad: '✗ wrong', skip: '— skipped' }[status]}</span></span><span>${(it.ms / 1000).toFixed(1)}s <span class="sr-pts">${{ ok: '+1', bad: '−1', skip: '0' }[status]}</span></span></div>
          <div class="mq-review-q">${it.q.html}${it.q.choices ? `<div class="mq-review-choices">${it.q.choices.join(' · ')}</div>` : ''}</div>
          <div class="sr-item-ans">
            ${status === 'bad' ? `<span>You: <b class="neg">${it.opts.list[it.given]}</b></span>` : ''}
            <span>Answer: <b class="${status === 'ok' ? 'pos' : ''}">${answer}</b></span>
          </div>
        </li>`;
    }).join('');
    const avg = answered.length ? sum(answered.map(q => q.ms)) / answered.length : 0;
    showSummary({
      board: { mode: 'mquiz', difficulty: run.level, rounds: QUIZ_N },
      score,
      title: run.queue.length ? 'Time called' : 'Quiz done',
      again: startQuiz,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Right</span><span class="stat-val pos">${right}</span></div>
          <div><span class="stat-lbl">Wrong</span><span class="stat-val neg">${wrong}</span></div>
          <div><span class="stat-lbl">Skipped</span><span class="stat-val">${QUIZ_N - answered.length}</span></div>
          <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${answered.length ? Math.round((100 * right) / answered.length) + '%' : '—'}</span></div>
          <div><span class="stat-lbl">Avg / answer</span><span class="stat-val">${answered.length ? `${(avg / 1000).toFixed(1)}s` : '—'}</span></div>
          <div><span class="stat-lbl">Time used</span><span class="stat-val">${clock(used)}</span></div>
        </div>
        <p class="note">Scoring: +1 right, −1 wrong, 0 skipped.</p>
        <h4>Question by question</h4>
        <ul class="sr-list">${items}</ul>`,
    });
  }

  function quitQuiz() {
    if (g && !confirm('Quit this quiz?')) return;
    stopQuiz();
    openQuiz();
  }

  // ================================================================
  //  INIT
  // ================================================================
  // Speed drill
  $('mdOps').addEventListener('change', () => { readDrillInputs(); renderDrillSetup(); });
  $('mdOps').addEventListener('input', e => { if (e.target.matches('[data-r]')) { readDrillInputs(); renderDrillSetup(); } });
  $('mdOps').querySelectorAll('[data-r]').forEach(inp => {
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.autocomplete = 'off';
    inp.maxLength = 4;
    inp.setAttribute('aria-label', 'Range limit');
  });
  $('mdSecs').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    readDrillInputs();
    settings.mathDrill.secs = Number(b.dataset.value);
    saveSettings();
    renderDrillSetup();
  });
  $('mdReset').addEventListener('click', () => {
    settings.mathDrill = JSON.parse(JSON.stringify(STD));
    saveSettings();
    $('mdOps').querySelectorAll('[data-r]').forEach(i => i.classList.remove('bad'));
    renderDrillSetup();
  });
  $('mdStart').addEventListener('click', startDrill);
  $('mdQuit').addEventListener('click', quitDrill);
  $('mdLeaders').addEventListener('click', () => openLeadersFor(drillBoard()));
  $('mdInput').addEventListener('input', onDrillInput);
  $('mdInput').addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  // Keep the keyboard up while the drill runs
  $('mdInput').addEventListener('blur', () => { if (d && !$('mdPlay').hidden) setTimeout(() => { if (d) $('mdInput').focus(); }, 0); });
  $('mdQ').addEventListener('click', () => $('mdInput').focus());

  // Answer sheet
  $('msPace').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    if (b.dataset.value === 'quant') return;
    settings.sheetPace = b.dataset.value;
    saveSettings();
    renderSheetSetup();
  });
  $('msCount').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    settings.sheetCount = Number(b.dataset.value);
    saveSettings();
    renderSheetSetup();
  });
  $('msStart').addEventListener('click', startSheet);
  $('msLeaders').addEventListener('click', () => openLeadersFor(sheetBoard()));
  $('msSubmit').addEventListener('click', submitSheet);
  $('msQuit').addEventListener('click', quitSheet);
  $('msList').addEventListener('input', e => {
    if (!e.target.matches('.ms-in')) return;
    e.target.closest('.ms-q').classList.toggle('filled', e.target.value.trim() !== '');
    updateSheetInfo();
  });
  $('msList').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('.ms-in')) return;
    e.preventDefault();
    const next = $('msList').querySelector(`.ms-in[data-i="${Number(e.target.dataset.i) + 1}"]`);
    if (next) next.focus(); else e.target.blur();
  });

  // Multiple choice
  $('mqLevel').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    if (b.dataset.value === 'quant') return;
    settings.quizLevel = b.dataset.value;
    saveSettings();
    renderQuizSetup();
  });
  $('mqStart').addEventListener('click', startQuiz);
  $('mqQuit').addEventListener('click', quitQuiz);
  $('mqSkip').addEventListener('click', skipQuiz);
  $('mqLeaders').addEventListener('click', () => openLeadersFor(quizBoard()));
  $('mqOptions').addEventListener('click', e => {
    const b = e.target.closest('.sr-opt');
    if (b) chooseQuiz(Number(b.dataset.i));
  });
  document.addEventListener('keydown', e => {
    if (!g || $('mqPlay').hidden) return;
    const k = e.key.toUpperCase();
    if (k.length === 1 && 'ABCDE'.includes(k)) chooseQuiz('ABCDE'.indexOf(k));
    else if (/^[1-5]$/.test(e.key)) chooseQuiz(Number(e.key) - 1);
    else if (e.key === 'Tab') skipQuiz();
    else return;
    e.preventDefault();
  });

  return { openDrill, openSheet, openQuiz, QUANT_SECS };
})();
