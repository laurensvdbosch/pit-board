/* ===========================================================
   PIT BOARD — Puzzles section (brainteasers)
   ---------------------------------------------------------
   Puzzle library (pzlib): browse by level, topic and type
   (Insight / Working). Hints, a full solution, and progress kept on this
   device. Number and choice answers are checked automatically; idea
   answers are self-marked after reading the solution.
   Interview round (pzl): 5 puzzles from the levels you tick, each with
   its own clock. Points depend on level, tries, hints and time left.
   Board (pzl, standard, 5), score 0–200.
   Questions live in puzzle-bank.js. Registers itself with GAMES through
   the board/open hooks in games.js.
   =========================================================== */

'use strict';

// Reads typed answers like 2/3, 0.667, 66.7%, -17/216, 1/e, 100/(2pi), 1,5
const PuzzleCheck = (() => {
  const WORDS = ['pi', 'e', 'sqrt', 'ln'];
  function clean(input) {
    let s = String(input).trim().toLowerCase()
      .replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/')
      .replace(/π/g, 'pi').replace(/√/g, 'sqrt');
    let prev;
    do { prev = s; s = s.replace(/(\d),(\d{3})(?!\d)/, '$1$2'); } while (s !== prev);   // 1,000 → 1000
    s = s.replace(/,/g, '.')                                                              // 0,5 → 0.5
      .replace(/[a-z]+(\/[a-z]+)?/g, w => (WORDS.includes(w) ? w : ''))                 // drop units: cm, km/h, coins
      .replace(/[^0-9a-z.+\-*/^()%]/g, '');
    return s;
  }
  function parse(input) {
    const s = clean(input);
    if (!s) return null;
    const toks = s.match(/\d*\.\d+|\d+|pi|sqrt|ln|e|[+\-*/^()%]/g);
    if (!toks || toks.join('') !== s) return null;
    let i = 0;
    const peek = () => toks[i];
    const starts = t => t !== undefined && (/^[\d.]/.test(t) || t === '(' || WORDS.includes(t));
    function expr() {
      let v = term();
      while (peek() === '+' || peek() === '-') v = toks[i++] === '+' ? v + term() : v - term();
      return v;
    }
    function term() {
      let v = power();
      for (;;) {
        if (peek() === '*') { i++; v *= power(); } else if (peek() === '/') { i++; v /= power(); } else if (starts(peek())) v *= power(); else return v;
      }
    }
    function power() {
      const b = unary();
      if (peek() === '^') { i++; return Math.pow(b, power()); }
      return b;
    }
    function unary() {
      if (peek() === '-') { i++; return -unary(); }
      if (peek() === '+') { i++; return unary(); }
      return postfix();
    }
    function postfix() {
      let v = primary();
      while (peek() === '%') { i++; v /= 100; }
      return v;
    }
    function primary() {
      const t = toks[i++];
      if (t === undefined) throw new Error('end');
      if (t === '(') { const v = expr(); if (toks[i++] !== ')') throw new Error('paren'); return v; }
      if (t === 'pi') return Math.PI;
      if (t === 'e') return Math.E;
      if (t === 'sqrt') return Math.sqrt(unary());
      if (t === 'ln') return Math.log(unary());
      if (/^[\d.]/.test(t)) return Number(t);
      throw new Error('token');
    }
    try {
      const v = expr();
      return i === toks.length && Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }
  // true / false, or null when the input can't be read as a number
  function check(a, input) {
    const x = parse(input);
    if (x === null) return null;
    const near = v => (a.int ? Math.abs(v - a.n) < 1e-9 : Math.abs(v - a.n) <= (a.tol !== undefined ? a.tol : Math.max(1e-9, 0.01 * Math.abs(a.n))));
    if (near(x)) return true;
    // A probability typed as a percentage without the % sign
    if (!a.int && a.n > 0 && a.n < 1 && x > 1 && x <= 100 && near(x / 100)) return true;
    return false;
  }
  return { parse, check };
})();
if (typeof module !== 'undefined') module.exports = { PuzzleCheck };

const Puzzles = typeof document === 'undefined' ? null : (() => {
  const BANK = PUZZLE_BANK;
  const byId = Object.fromEntries(BANK.map(p => [p.id, p]));
  const PROG = 'pitboard-puzzles';          // { id: 'solved' | 'missed' }
  const OPTS = 'pitboard-puzzles-opts';
  const RECENT = 'pitboard-pzl-recent';
  const ROUND = 5;
  const DIFF = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert' };
  const CAT = { prob: 'Probability', maths: 'Maths', strat: 'Strategy', logic: 'Logic' };
  const KIND = { insight: 'Insight', working: 'Working' };
  const SECS = { 1: 180, 2: 300, 3: 420, 4: 600 };
  const HINT_F = 0.6, TRY_F = [1, 0.6, 0.3];

  const prog = store.get(PROG, {});
  const opts = Object.assign({ libD: [1, 2, 3, 4], libC: Object.keys(CAT), libK: 'all', libOpen: false, roundD: [1, 2], roundK: 'all' }, store.get(OPTS, {}));
  const keepIn = (arr, ok) => (Array.isArray(arr) ? arr.filter(v => ok.includes(v)) : ok.slice());
  opts.libD = keepIn(opts.libD, [1, 2, 3, 4]);
  opts.roundD = keepIn(opts.roundD, [1, 2, 3, 4]);
  opts.libC = keepIn(opts.libC, Object.keys(CAT));
  if (!['all', 'insight', 'working'].includes(opts.libK)) opts.libK = 'all';
  if (!['all', 'insight', 'working'].includes(opts.roundK)) opts.roundK = 'all';
  const saveOpts = () => store.set(OPTS, opts);
  const saveProg = () => store.set(PROG, prog);

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = t => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;
  const ranked = p => p.a.n !== undefined || (p.a.opts && p.a.opts.length >= 3);
  const kindOK = (p, k) => k === 'all' || p.k === k;
  const solvedCount = () => BANK.filter(p => prog[p.id] === 'solved').length;
  const answerText = p => (p.a.n !== undefined ? p.a.show : p.a.opts ? p.a.opts[p.a.i] : p.a.self);
  const tags = p => `
    <div class="bt-tags">
      <span class="bt-tag bt-d${p.d}">${DIFF[p.d]}</span><span class="bt-tag">${CAT[p.c]}</span><span class="bt-tag">${KIND[p.k]}</span>
      ${prog[p.id] === 'solved' ? '<span class="bt-tag bt-solved">✓ Solved</span>' : ''}
    </div>`;
  const credit = p => (p.bs ? `<p class="bt-credit-line">Classic puzzle · also on <a href="https://brainstellar.com/puzzles/${p.bs}" target="_blank" rel="noopener">Brainstellar ↗</a></p>` : '');
  const solutionHtml = p => `
    <div class="bt-solution">
      <div class="bt-sol-ans"><span>Answer</span><b>${esc(answerText(p))}</b></div>
      ${p.s.map(x => `<p>${esc(x)}</p>`).join('')}
    </div>`;
  const multi = (key, list, sel, cls = `seg-${list.length}`) => `
    <div class="seg ${cls} bt-multi" data-multi="${key}">
      ${list.map(([v, label]) => `<button data-value="${v}" class="${sel.includes(v) ? 'active' : ''}" aria-pressed="${sel.includes(v)}">${label}</button>`).join('')}
    </div>`;
  const single = (key, list, cur) => `
    <div class="seg seg-${list.length}" data-single="${key}">
      ${list.map(([v, label]) => `<button data-value="${v}" class="${cur === v ? 'active' : ''}" aria-pressed="${cur === v}">${label}</button>`).join('')}
    </div>`;
  const DIFF_LIST = [[1, 'Easy'], [2, 'Medium'], [3, 'Hard'], [4, 'Expert']];
  const KIND_LIST = [['all', 'All'], ['insight', 'Insight'], ['working', 'Working']];
  const field = (label, html) => `<div class="field"><div class="field-label">${label}</div>${html}</div>`;

  // ================================================================
  //  REGISTRATION
  // ================================================================
  GAMES.pzlib = {
    section: 'puzzles', sym: 'LIBR', short: 'Library', name: 'Puzzle library', color: '#F2C14E',
    blurb: 'Every puzzle, with hints and full solutions',
    noBoard: true, filters: [], fmt: s => String(s),
    status: () => ({ text: `${solvedCount()}/${BANK.length}`, sub: 'solved' }),
    open: () => openLibrary(),
  };
  GAMES.pzl = {
    section: 'puzzles', sym: 'INTV', short: 'Interview', name: 'Interview round', color: '#E06C75',
    blurb: '5 puzzles against the clock, at the levels you pick',
    filters: [{ key: 'difficulty', options: [['standard', '5 puzzles']] }],
    fmt: s => `${s} pts`,
    board: () => ({ mode: 'pzl', difficulty: 'standard', rounds: ROUND }),
    open: () => openSetup(),
  };
  const BOARD = GAMES.pzl.board();

  // ================================================================
  //  LIBRARY
  // ================================================================
  let view = null;     // { list: [ids], i, hint, done, tries }

  function libraryList() {
    return BANK
      .filter(p => opts.libD.includes(p.d) && opts.libC.includes(p.c) && kindOK(p, opts.libK) && (!opts.libOpen || prog[p.id] !== 'solved'))
      .sort((a, b) => a.d - b.d || Object.keys(CAT).indexOf(a.c) - Object.keys(CAT).indexOf(b.c));
  }

  function openLibrary() {
    renderLibrary();
    showScreen('btLib');
  }

  function renderLibrary() {
    $('btLibCount').textContent = `${solvedCount()}/${BANK.length} solved`;
    $('btLibFilters').innerHTML = `
      ${field('Level', multi('libD', DIFF_LIST, opts.libD))}
      ${field('Topic', multi('libC', Object.entries(CAT), opts.libC, 'seg-2'))}
      ${field('Type', single('libK', KIND_LIST, opts.libK))}
      <label class="bt-toggle"><input type="checkbox" id="btOpenOnly" ${opts.libOpen ? 'checked' : ''}> Hide puzzles I've solved</label>`;
    const list = libraryList();
    $('btLibList').innerHTML = list.length ? list.map(p => {
      const st = prog[p.id];
      return `
        <button class="bt-item" data-id="${p.id}">
          <span class="bt-item-main"><b>${esc(p.t)}</b><small><span class="bt-dtext bt-d${p.d}">${DIFF[p.d]}</span> · ${CAT[p.c]} · ${KIND[p.k]}</small></span>
          <span class="bt-mark ${st || ''}">${st === 'solved' ? '✓' : st === 'missed' ? '✗' : ''}</span>
        </button>`;
    }).join('') : '<p class="note dim">No puzzles match these filters.</p>';
  }

  function openPuzzle(id) {
    const list = libraryList().map(p => p.id);
    if (!list.includes(id)) list.unshift(id);
    view = { list, i: list.indexOf(id) };
    showPuzzle();
    showScreen('btView');
  }

  function showPuzzle() {
    const p = byId[view.list[view.i]];
    Object.assign(view, { hint: false, done: false, tries: 0 });
    $('btViewTitle').textContent = p.t;
    $('btViewPos').textContent = `${view.i + 1} / ${view.list.length}`;
    let answer;
    if (p.a.n !== undefined) {
      answer = `
        <form class="bt-form" id="btForm" autocomplete="off">
          <input class="bt-input" id="btInput" type="text" enterkeyhint="done" placeholder="Your answer, e.g. 2/3, 0.25 or 14" aria-label="Your answer">
          <button class="btn btn-primary" type="submit">Check</button>
        </form>`;
    } else if (p.a.opts) {
      answer = `<div class="bt-opts">${p.a.opts.map((o, i) => `<button class="bt-opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>`;
    } else {
      answer = '<p class="bt-selfnote">Think it through, then compare with the solution.</p>';
    }
    $('btViewBody').innerHTML = `
      ${tags(p)}
      <p class="bt-q">${esc(p.q)}</p>
      <div class="bt-hint" id="btHint" hidden>💡 ${esc(p.h)}</div>
      ${answer}
      <div class="bt-feedback" id="btFeedback" aria-live="polite"></div>
      <div class="bt-actions" id="btActions">
        <button class="btn btn-ghost" id="btHintBtn">💡 Hint</button>
        <button class="btn btn-ghost" id="btReveal">${p.a.self ? 'Show solution' : 'Give up · show solution'}</button>
      </div>
      <div id="btSol"></div>
      ${credit(p)}
      <div class="bt-nav">
        <button class="btn btn-ghost" id="btPrev" ${view.i === 0 ? 'disabled' : ''}>← Previous</button>
        <button class="btn btn-ghost" id="btNext" ${view.i >= view.list.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>`;
    window.scrollTo(0, 0);
  }

  function mark(p, st) {
    if (prog[p.id] === 'solved' && st === 'missed') return;   // a past solve stands
    prog[p.id] = st;
    saveProg();
  }

  function reveal(p, selfMark) {
    view.done = true;
    $('btActions').hidden = true;
    $('btSol').innerHTML = solutionHtml(p) + (selfMark ? `
      <div class="bt-self" id="btSelf">
        <span>Did you get it?</span>
        <button class="btn btn-ghost bt-yes" data-self="solved">✓ I had it</button>
        <button class="btn btn-ghost bt-no" data-self="missed">✗ Not quite</button>
      </div>` : '');
    $('btSol').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function libCheck() {
    const p = byId[view.list[view.i]];
    if (view.done) return;
    const input = $('btInput').value;
    const ok = PuzzleCheck.check(p.a, input);
    const fb = $('btFeedback');
    if (ok === null) { fb.className = 'bt-feedback warn'; fb.textContent = "Couldn't read that as a number. Try something like 2/3, 0.25, 15% or 14."; return; }
    view.tries += 1;
    if (ok) {
      fb.className = 'bt-feedback ok';
      fb.textContent = `✓ Correct${view.tries > 1 ? ` (try ${view.tries})` : ''}${view.hint ? ', with a hint' : ''}`;
      $('btInput').disabled = true;
      mark(p, 'solved');
      reveal(p, false);
    } else {
      fb.className = 'bt-feedback bad';
      fb.textContent = '✗ Not quite. Try again, take a hint, or show the solution.';
      $('btInput').select();
    }
  }

  function libChoose(i) {
    const p = byId[view.list[view.i]];
    if (view.done) return;
    const right = i === p.a.i;
    document.querySelectorAll('#btViewBody .bt-opt').forEach((b, j) => {
      b.disabled = true;
      b.classList.toggle('right', j === p.a.i);
      b.classList.toggle('wrong', j === i && !right);
    });
    $('btFeedback').className = `bt-feedback ${right ? 'ok' : 'bad'}`;
    $('btFeedback').textContent = right ? '✓ Correct' : '✗ Not this time';
    mark(p, right ? 'solved' : 'missed');
    reveal(p, false);
  }

  // ================================================================
  //  INTERVIEW ROUND
  // ================================================================
  let run = null;

  const roundPool = () => BANK.filter(p => ranked(p) && opts.roundD.includes(p.d) && kindOK(p, opts.roundK));

  function openSetup() {
    renderSetup();
    showScreen('btSetup');
  }

  function renderSetup() {
    $('btSetupFilters').innerHTML = `
      ${field('Levels (tick any)', multi('roundD', DIFF_LIST, opts.roundD))}
      ${field('Type', single('roundK', KIND_LIST, opts.roundK))}`;
    const n = roundPool().length;
    $('btSetupPool').textContent = n >= ROUND
      ? `${n} puzzles match. Points per puzzle: Easy 10, Medium 20, Hard 30, Expert 40.`
      : `Only ${n} puzzle${n === 1 ? '' : 's'} match: tick more levels or choose another type.`;
    $('btSetupPool').classList.toggle('warn', n < ROUND);
    $('btStart').disabled = n < ROUND;
    const best = store.get(boardBestKey(BOARD), null);
    $('btBest').textContent = best === null ? 'No rounds yet' : `Your best: ${best} pts`;
  }

  function stopRun() { if (run) { clearInterval(run.timer); run = null; } }

  function startRound() {
    const pool = roundPool();
    if (pool.length < ROUND) return;
    const recent = store.get(RECENT, []);
    // Spread the 5 puzzles evenly over the ticked levels (Easy + Hard → 3/2 or 2/3)
    const levels = shuffle([...new Set(pool.map(p => p.d))]);
    const want = {};
    for (let i = 0; i < ROUND; i++) want[levels[i % levels.length]] = (want[levels[i % levels.length]] || 0) + 1;
    const pick = [];
    for (const d of levels) {
      const at = shuffle(pool.filter(p => p.d === d));
      const fresh = at.filter(p => !recent.includes(p.id)), seen = at.filter(p => recent.includes(p.id));
      pick.push(...[...fresh, ...seen].slice(0, want[d]));
    }
    if (pick.length < ROUND) pick.push(...shuffle(pool.filter(p => !pick.includes(p))).slice(0, ROUND - pick.length));
    pick.sort((a, b) => a.d - b.d);
    store.set(RECENT, [...recent, ...pick.map(p => p.id)].slice(-30));
    run = { items: pick.map(p => ({ p, given: '', ok: false, pts: 0, tries: 0, hint: false, used: 0, out: '' })), i: 0, timer: null, end: 0, done: false };
    showScreen('btPlay');
    showRoundPuzzle();
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function showRoundPuzzle() {
    const r = run, it = r.items[r.i], p = it.p;
    r.done = false;
    const total = SECS[p.d];
    r.end = Date.now() + total * 1000;
    const answer = p.a.n !== undefined
      ? `<form class="bt-form" id="btRForm" autocomplete="off">
           <input class="bt-input" id="btRInput" type="text" enterkeyhint="done" placeholder="Your answer, e.g. 2/3, 0.25 or 14" aria-label="Your answer">
           <button class="btn btn-primary" type="submit">Submit</button>
         </form>
         <p class="bt-tries" id="btRTries">3 tries</p>`
      : `<div class="bt-opts">${p.a.opts.map((o, i) => `<button class="bt-opt" data-ropt="${i}">${esc(o)}</button>`).join('')}</div>
         <p class="bt-tries">One try</p>`;
    $('btPlayBody').innerHTML = `
      <div class="sr-progress" style="grid-template-columns:repeat(${ROUND},1fr)">${r.items.map((x, i) => `<span class="${i === r.i ? 'cur' : i < r.i ? (x.ok ? 'ok' : 'bad') : ''}"></span>`).join('')}</div>
      ${tags(p)}
      <p class="bt-q">${esc(p.q)}</p>
      <div class="bt-hint" id="btRHint" hidden>💡 ${esc(p.h)}</div>
      ${answer}
      <div class="bt-feedback" id="btRFeedback" aria-live="polite"></div>
      <div class="bt-actions" id="btRActions">
        <button class="btn btn-ghost" id="btRHintBtn">💡 Hint (−40%)</button>
        <button class="btn btn-ghost" id="btRSkip">Skip</button>
      </div>
      <div id="btRNext"></div>`;
    window.scrollTo(0, 0);
    clearInterval(r.timer);
    const tick = () => {
      if (run !== r || r.done) return;
      const left = Math.max(0, Math.ceil((r.end - Date.now()) / 1000));
      $('btInfo').textContent = `INTV · ${r.i + 1} of ${ROUND} · ${10 * p.d} pts`;
      $('btTimer').textContent = clock(left);
      $('btTimer').classList.toggle('low', left <= 30);
      if (left <= 0) resolve(false, 'time');
    };
    r.timer = setInterval(tick, 200);
    tick();
  }

  // Ends the current puzzle: ok, or the reason it was missed
  function resolve(ok, why) {
    const r = run, it = r.items[r.i], p = it.p;
    if (r.done) return;
    r.done = true;
    clearInterval(r.timer);
    const total = SECS[p.d];
    const left = Math.max(0, (r.end - Date.now()) / 1000);
    it.used = Math.round(total - left);
    it.ok = ok;
    it.out = ok ? 'right' : why;
    it.pts = ok ? Math.round(10 * p.d * TRY_F[it.tries - 1] * (it.hint ? HINT_F : 1) * (0.75 + 0.25 * left / total)) : 0;
    if (ok) { prog[p.id] = 'solved'; saveProg(); }
    $('btRActions').hidden = true;
    const inp = $('btRInput');
    if (inp) inp.disabled = true;
    document.querySelectorAll('#btPlayBody .bt-opt').forEach(b => { b.disabled = true; });
    const fb = $('btRFeedback');
    fb.className = `bt-feedback ${ok ? 'ok' : 'bad'}`;
    fb.innerHTML = ok
      ? `✓ Correct · <b>+${it.pts}</b> pts`
      : `${{ wrong: '✗ Out of tries', choice: '✗ Not this one', skip: 'Skipped', time: '⏱ Out of time' }[why]}. Answer: <b>${esc(answerText(p))}</b>`;
    const last = r.i + 1 >= ROUND;
    $('btRNext').innerHTML = `<button class="btn btn-primary bt-next-btn" id="btRNextBtn">${last ? 'See results' : 'Next puzzle →'}</button>`;
    $('btInfo').textContent = `INTV · ${r.i + 1} of ${ROUND}`;
    $('btTimer').textContent = '';
  }

  function roundSubmit() {
    const r = run;
    if (!r || r.done) return;
    const it = r.items[r.i];
    const input = $('btRInput').value;
    const ok = PuzzleCheck.check(it.p.a, input);
    const fb = $('btRFeedback');
    if (ok === null) { fb.className = 'bt-feedback warn'; fb.textContent = "Couldn't read that as a number. Try 2/3, 0.25, 15% or 14."; return; }
    it.tries += 1;
    it.given = input.trim();
    if (ok) { resolve(true); return; }
    if (it.tries >= 3) { resolve(false, 'wrong'); return; }
    fb.className = 'bt-feedback bad';
    fb.textContent = `✗ Not quite. ${3 - it.tries} ${3 - it.tries === 1 ? 'try' : 'tries'} left.`;
    $('btRTries').textContent = `${3 - it.tries} ${3 - it.tries === 1 ? 'try' : 'tries'} left · a correct answer now scores ${Math.round(TRY_F[it.tries] * 100)}%`;
    $('btRInput').select();
  }

  function roundChoose(i) {
    const r = run;
    if (!r || r.done) return;
    const it = r.items[r.i], p = it.p;
    it.tries = 1;
    it.given = p.a.opts[i];
    const right = i === p.a.i;
    document.querySelectorAll('#btPlayBody .bt-opt').forEach((b, j) => {
      b.classList.toggle('right', j === p.a.i);
      b.classList.toggle('wrong', j === i && !right);
    });
    resolve(right, 'choice');
  }

  function roundNext() {
    const r = run;
    if (!r || !r.done) return;
    if (r.i + 1 >= ROUND) { finishRound(); return; }
    r.i += 1;
    showRoundPuzzle();
  }

  function finishRound() {
    const r = run;
    stopRun();
    const score = r.items.reduce((s, it) => s + it.pts, 0);
    const solved = r.items.filter(it => it.ok).length;
    const hints = r.items.filter(it => it.hint).length;
    const items = r.items.map((it, i) => {
      const p = it.p, st = it.ok ? 'ok' : it.out === 'skip' ? 'skip' : 'bad';
      return `
        <li class="sr-item ${st}">
          <div class="sr-item-head"><span>${i + 1}. ${esc(p.t)} <span class="sr-mark">${{ ok: '✓', bad: '✗', skip: '—' }[st]}</span></span><span>${clock(it.used)} <span class="sr-pts">${it.pts ? `+${it.pts}` : '0'}</span></span></div>
          <small class="dim">${DIFF[p.d]} · ${CAT[p.c]} · ${KIND[p.k]}${it.hint ? ' · hint used' : ''}${it.tries > 1 ? ` · ${it.tries} tries` : ''}</small>
          <div class="sr-item-ans">
            <span>You: <b class="${st === 'ok' ? 'pos' : st === 'bad' ? 'neg' : ''}">${it.given ? esc(it.given) : it.out === 'time' ? 'out of time' : 'skipped'}</b></span>
            <span>Answer: <b>${esc(answerText(p))}</b></span>
          </div>
          <details class="bt-review"><summary>Question and solution</summary><p class="bt-review-q">${esc(p.q)}</p>${solutionHtml(p)}${credit(p)}</details>
        </li>`;
    }).join('');
    const levels = opts.roundD.slice().sort().map(d => DIFF[d]).join(', ');
    showSummary({
      board: BOARD,
      score,
      title: 'Round done',
      again: startRound,
      bodyHtml: `
        <div class="stat-grid bt-stats">
          <div><span class="stat-lbl">Solved</span><span class="stat-val pos">${solved} / ${ROUND}</span></div>
          <div><span class="stat-lbl">Points</span><span class="stat-val">${score}</span></div>
          <div><span class="stat-lbl">Hints used</span><span class="stat-val">${hints}</span></div>
          <div><span class="stat-lbl">Levels</span><span class="stat-val bt-levels">${levels}</span></div>
        </div>
        <p class="note">Points: Easy 10, Medium 20, Hard 30, Expert 40, times 60% with a hint, 60% or 30% on a second or third try, and 75–100% depending on time left.</p>
        <h4>Every puzzle</h4><ul class="sr-list">${items}</ul>`,
    });
  }

  // ================================================================
  //  EVENTS
  // ================================================================
  function toggleMulti(key, value) {
    const v = /^\d+$/.test(value) ? Number(value) : value;
    const arr = opts[key];
    opts[key] = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
    saveOpts();
  }
  function filterClick(e, after) {
    const b = e.target.closest('button[data-value]');
    if (!b) return false;
    const m = b.closest('[data-multi]'), s = b.closest('[data-single]');
    if (m) toggleMulti(m.dataset.multi, b.dataset.value);
    else if (s) { opts[s.dataset.single] = b.dataset.value; saveOpts(); } else return false;
    after();
    return true;
  }

  $('btLibFilters').addEventListener('click', e => filterClick(e, renderLibrary));
  $('btLibFilters').addEventListener('change', e => {
    if (e.target.id === 'btOpenOnly') { opts.libOpen = e.target.checked; saveOpts(); renderLibrary(); }
  });
  $('btLibList').addEventListener('click', e => {
    const b = e.target.closest('[data-id]');
    if (b) openPuzzle(b.dataset.id);
  });
  $('btViewBack').addEventListener('click', () => { renderLibrary(); showScreen('btLib'); });
  $('btViewBody').addEventListener('submit', e => { e.preventDefault(); libCheck(); });
  $('btViewBody').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t || !view) return;
    const p = byId[view.list[view.i]];
    if (t.dataset.opt !== undefined) libChoose(Number(t.dataset.opt));
    else if (t.id === 'btHintBtn') { view.hint = true; $('btHint').hidden = false; t.disabled = true; }
    else if (t.id === 'btReveal') {
      if (!p.a.self) mark(p, 'missed');
      const inp = $('btInput');
      if (inp) inp.disabled = true;
      document.querySelectorAll('#btViewBody .bt-opt').forEach((b, j) => { b.disabled = true; b.classList.toggle('right', j === p.a.i); });
      reveal(p, Boolean(p.a.self));
    } else if (t.dataset.self) {
      mark(p, t.dataset.self);
      $('btSelf').innerHTML = t.dataset.self === 'solved' ? '<span class="ok">✓ Marked as solved</span>' : '<span class="dim">Marked as not yet. It stays in your unsolved list.</span>';
    } else if (t.id === 'btPrev' && view.i > 0) { view.i -= 1; showPuzzle(); }
    else if (t.id === 'btNext' && view.i < view.list.length - 1) { view.i += 1; showPuzzle(); }
  });

  $('btSetupFilters').addEventListener('click', e => filterClick(e, renderSetup));
  $('btStart').addEventListener('click', startRound);
  $('btLeaders').addEventListener('click', () => openLeadersFor(BOARD));
  $('puzzlesLeadersBtn').addEventListener('click', () => openLeadersFor(BOARD));
  $('btPlayBody').addEventListener('submit', e => { e.preventDefault(); roundSubmit(); });
  $('btPlayBody').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t || !run) return;
    if (t.dataset.ropt !== undefined) roundChoose(Number(t.dataset.ropt));
    else if (t.id === 'btRHintBtn' && !run.done) { run.items[run.i].hint = true; $('btRHint').hidden = false; t.disabled = true; }
    else if (t.id === 'btRSkip' && !run.done) resolve(false, 'skip');
    else if (t.id === 'btRNextBtn') roundNext();
  });
  $('btQuit').addEventListener('click', () => {
    if (run && !confirm('Quit this round? It won\'t be scored.')) return;
    stopRun();
    renderSetup();
    showScreen('btSetup');
  });

  renderLobby();
  return { PuzzleCheck };
})();
