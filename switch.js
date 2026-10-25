/* ===========================================================
   PIT BOARD — Task Switch (SWCH)
   ---------------------------------------------------------
   A signal flashes: green circle = MATH (is the answer odd or
   even?), red square = ARROWS (which way do most point?). Both
   tasks share the ← → keys, which is what makes switching hard.
   - Standard: one task shown after the signal.
   - Hard: both tasks shown, top/bottom shuffled; the signal says
     which one counts.
   - Super hard: Hard, and the odd/even keys sometimes flip.
   +1 right, −1 wrong or too slow. Runs last 30/60/120 seconds.
   =========================================================== */

'use strict';

const Switch = (() => {
  const MODES = {
    standard: { label: 'Standard',   cueMs: 500, arrows: [5, 7], margins: [1, 3, 5], both: false, flip: 0 },
    hard:     { label: 'Hard',       cueMs: 350, arrows: [7, 9], margins: [1, 3],    both: true,  flip: 0 },
    super:    { label: 'Super hard', cueMs: 350, arrows: [7, 9], margins: [1, 3],    both: true,  flip: 0.25 },
  };
  const GAP_MS = 150;        // blank between signal and problem
  const DEADLINE_MS = 4000;  // slower than this counts as wrong
  const FEEDBACK_MS = 300;
  const ITI_MS = 250;        // pause before the next signal

  let s = null;   // the current run

  const board = () => ({ mode: 'switch', difficulty: settings.switchMode, rounds: settings.switchSecs });
  const clock = t => `${Math.floor(t / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;
  const chev = d => `<svg class="chev" viewBox="0 0 20 32" aria-hidden="true"><polyline points="${d === 'left' ? '15,3 4,16 15,29' : '5,3 16,16 5,29'}"/></svg>`;

  // -------------------- SETUP --------------------
  function renderSetup() {
    const vals = { mode: settings.switchMode, secs: String(settings.switchSecs) };
    document.querySelectorAll('#switchSetup .seg[data-sw]').forEach(seg => {
      seg.querySelectorAll('button').forEach(b => {
        const on = vals[seg.dataset.sw] === b.dataset.value;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
      });
    });
    const best = store.get(boardBestKey(board()), null);
    $('swBest').textContent = best === null ? 'No runs at this setting yet' : `Your best here: ${fmtScore('switch', best)}`;
  }

  function openSetup() {
    renderSetup();
    showScreen('switchSetup');
  }

  // -------------------- PROBLEMS --------------------
  // Zetamac-style, every number under 100, division always exact
  function makeMath() {
    const op = pick(['+', '−', '×', '÷']);
    let a, b, r;
    if (op === '+') { a = randInt(2, 97); b = randInt(2, 99 - a); r = a + b; }
    else if (op === '−') { a = randInt(4, 99); b = randInt(2, a - 1); r = a - b; }
    else if (op === '×') { a = randInt(2, 12); b = randInt(2, Math.floor(99 / a)); r = a * b; }
    else { b = randInt(2, 12); r = randInt(2, Math.floor(99 / b)); a = b * r; }
    return { text: `${a} ${op} ${b}`, odd: r % 2 === 1 };
  }

  // Odd count, majority wins by `margin` arrows
  function makeArrows(cfg) {
    const n = pick(cfg.arrows);
    const margin = pick(cfg.margins.filter(m => m <= n));
    const k = (n + margin) / 2;
    const dir = Math.random() < 0.5 ? 'left' : 'right';
    const other = dir === 'left' ? 'right' : 'left';
    return { dirs: shuffle([...Array(k).fill(dir), ...Array(n - k).fill(other)]), majority: dir };
  }

  const mathHtml = m => `<div class="sw-panel"><span class="sw-lbl">QUOTE · odd or even?</span><span class="sw-expr">${m.text}</span></div>`;
  const arrowsHtml = a => `<div class="sw-panel"><span class="sw-lbl">FLOW · which way?</span><span class="sw-arrows">${a.dirs.map(chev).join('')}</span></div>`;

  // -------------------- RUN --------------------
  function later(ms, fn) { s.timers.push(setTimeout(fn, ms)); }

  function stop() {
    if (!s) return;
    s.timers.forEach(clearTimeout);
    clearInterval(s.clock);
    s = null;
  }

  function setCue(cls, text = '') {
    $('swCue').className = `sw-cue ${cls}`;
    $('swCue').textContent = text;
  }

  function clearStage() {
    $('swTop').innerHTML = $('swMid').innerHTML = $('swBottom').innerHTML = '';
  }

  function updateHud() {
    $('swTimer').textContent = clock(s.timeLeft);
    $('swTimer').classList.toggle('low', s.timeLeft <= 5);
    $('swScore').textContent = `${s.score > 0 ? '+' : ''}${s.score}`;
    $('swScore').className = pnlClass(s.score);
    $('swStreak').textContent = s.streak >= 3 ? `🔥 ${s.streak} streak` : '';
  }

  function renderKeys(flipped) {
    const left = s.oddLeft ? 'odd' : 'even';
    const right = s.oddLeft ? 'even' : 'odd';
    $('swLeft').className = `sw-key ${left}`;
    $('swLeft').innerHTML = `${chev('left')}<span class="k-dir">LEFT</span><span class="k-par">${left.toUpperCase()}</span>`;
    $('swRight').className = `sw-key ${right}`;
    $('swRight').innerHTML = `${chev('right')}<span class="k-dir">RIGHT</span><span class="k-par">${right.toUpperCase()}</span>`;
    $('swMap').innerHTML = `<span class="${left}">◀ ${left.toUpperCase()}</span><span class="dim">${flipped ? 'KEYS FLIPPED' : 'odd / even keys'}</span><span class="${right}">${right.toUpperCase()} ▶</span>`;
    if (flipped) {
      $('swMap').classList.remove('swap');
      void $('swMap').offsetWidth;
      $('swMap').classList.add('swap');
    }
  }

  function start() {
    stop();
    const mode = settings.switchMode;
    s = {
      mode, cfg: MODES[mode], secs: settings.switchSecs, timeLeft: settings.switchSecs,
      trials: [], score: 0, streak: 0, bestStreak: 0, oddLeft: true,
      phase: 'ready', timers: [], clock: null, cur: null, t0: 0, deadline: null,
    };
    $('swInfo').textContent = `SWCH · ${s.cfg.label}`;
    $('swStage').classList.toggle('single', !s.cfg.both);
    clearStage();
    renderKeys(false);
    updateHud();
    showScreen('switchPlay');
    [3, 2, 1].forEach((n, i) => later(i * 600, () => setCue('count', n)));
    later(1800, () => {
      setCue('');
      s.clock = setInterval(tick, 1000);
      nextTrial();
    });
  }

  function tick() {
    s.timeLeft -= 1;
    updateHud();
    if (s.timeLeft <= 0) finish();
  }

  function nextTrial() {
    if (!s || s.timeLeft <= 0) return;
    const prev = s.trials[s.trials.length - 1];
    const task = Math.random() < 0.5 ? 'math' : 'arrows';
    let flipped = false;
    if (s.cfg.flip && s.trials.length && Math.random() < s.cfg.flip) {
      s.oddLeft = !s.oddLeft;
      flipped = true;
    }
    renderKeys(flipped);
    s.cur = {
      task, flipped, oddLeft: s.oddLeft,
      math: makeMath(), arrows: makeArrows(s.cfg),
      mathTop: Math.random() < 0.5,
      isSwitch: prev ? prev.task !== task : null,   // null = first trial, neither switch nor repeat
    };
    s.phase = 'cue';
    clearStage();
    setCue(task);
    later(s.cfg.cueMs, () => setCue(''));
    later(s.cfg.cueMs + GAP_MS, showProblem);
  }

  function showProblem() {
    const c = s.cur;
    if (s.cfg.both) {
      $('swTop').innerHTML = c.mathTop ? mathHtml(c.math) : arrowsHtml(c.arrows);
      $('swBottom').innerHTML = c.mathTop ? arrowsHtml(c.arrows) : mathHtml(c.math);
    } else {
      $('swMid').innerHTML = c.task === 'math' ? mathHtml(c.math) : arrowsHtml(c.arrows);
    }
    s.phase = 'respond';
    s.t0 = performance.now();
    s.deadline = setTimeout(() => answer(null), DEADLINE_MS);
    s.timers.push(s.deadline);
  }

  function correctSide(c) {
    if (c.task === 'arrows') return c.arrows.majority;
    return c.math.odd === c.oddLeft ? 'left' : 'right';
  }

  function answer(side) {
    if (!s || s.phase !== 'respond') return;
    clearTimeout(s.deadline);
    const c = s.cur;
    const ok = side === correctSide(c);
    const rt = side ? Math.round(performance.now() - s.t0) : DEADLINE_MS;
    s.trials.push({ task: c.task, isSwitch: c.isSwitch, flipped: c.flipped, rt, ok, timeout: !side });
    s.score += ok ? 1 : -1;
    s.streak = ok ? s.streak + 1 : 0;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.phase = 'feedback';
    updateHud();
    if (side) {
      const key = $(side === 'left' ? 'swLeft' : 'swRight');
      key.classList.add('pressed');
      later(FEEDBACK_MS, () => key.classList.remove('pressed'));
    }
    clearStage();
    setCue(`mark ${ok ? 'ok' : 'bad'}`, ok ? '✓' : side ? '✗' : 'Too slow');
    later(FEEDBACK_MS, () => setCue(''));
    later(FEEDBACK_MS + ITI_MS, nextTrial);
  }

  // -------------------- RESULTS --------------------
  const mean = a => (a.length ? Math.round(sum(a) / a.length) : null);
  const ms = v => (v === null ? '—' : `${v} ms`);

  function rtChart(trials) {
    if (!trials.length) return '';
    const W = 320, H = 90, P = 4;
    const max = Math.max(...trials.map(t => t.rt), 1000);
    const bw = (W - 2 * P) / trials.length;
    const bars = trials.map((t, i) => {
      const h = Math.max(2, (t.rt / max) * (H - 14));
      const x = P + i * bw;
      const cls = t.timeout ? 'slow' : t.ok ? 'ok' : 'bad';
      const tick = t.isSwitch ? `<rect class="sw-tick" x="${(x + bw * 0.15).toFixed(1)}" y="${H - 4}" width="${Math.max(1, bw * 0.7).toFixed(1)}" height="3"/>` : '';
      return `<rect class="${cls}" x="${(x + bw * 0.15).toFixed(1)}" y="${(H - 8 - h).toFixed(1)}" width="${Math.max(1, bw * 0.7).toFixed(1)}" height="${h.toFixed(1)}"/>${tick}`;
    }).join('');
    return `
      <svg class="rt-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Reaction time per trial">${bars}</svg>
      <div class="legend"><span class="lg bid">Right</span><span class="lg neg-lg">Wrong</span><span class="lg slow-lg">Too slow</span><span class="lg tick-lg">Switch trial</span></div>`;
  }

  function taskRow(label, list) {
    const right = list.filter(t => t.ok);
    return `<tr><td>${label}</td><td>${list.length}</td>
      <td>${list.length ? Math.round((100 * right.length) / list.length) + '%' : '—'}</td>
      <td>${ms(mean(right.map(t => t.rt)))}</td></tr>`;
  }

  function finish() {
    if (!s) return;
    const run = s;
    stop();
    const T = run.trials;
    const right = T.filter(t => t.ok);
    const timeouts = T.filter(t => t.timeout).length;
    const wrong = T.length - right.length - timeouts;
    const acc = T.length ? Math.round((100 * right.length) / T.length) : 0;
    const rtSwitch = mean(right.filter(t => t.isSwitch === true).map(t => t.rt));
    const rtRepeat = mean(right.filter(t => t.isSwitch === false).map(t => t.rt));
    const cost = rtSwitch !== null && rtRepeat !== null ? rtSwitch - rtRepeat : null;

    const tips = [];
    if (T.length && acc < 85) tips.push('Accuracy first: a miss costs as much as a hit earns.');
    if (cost !== null && cost > 150) tips.push(`Switching cost you ${cost} ms. Say the task in your head ("math" / "arrows") the instant the signal flashes.`);
    if (timeouts >= 3) tips.push('Several answers were too slow. For odd/even you only need the last digits: odd ± odd is even, any × with an even number is even.');
    if (!tips.length && T.length) tips.push('Clean run. Try a harder mode or a longer clock.');

    showSummary({
      board: board(),
      score: run.score,
      title: 'Session closed',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${acc}%</span></div>
          <div><span class="stat-lbl">Avg reaction</span><span class="stat-val">${ms(mean(right.map(t => t.rt)))}</span></div>
          <div><span class="stat-lbl">Switch cost</span><span class="stat-val">${cost === null ? '—' : `${cost > 0 ? '+' : ''}${cost} ms`}</span></div>
          <div><span class="stat-lbl">Right</span><span class="stat-val pos">${right.length}</span></div>
          <div><span class="stat-lbl">Wrong</span><span class="stat-val neg">${wrong}</span></div>
          <div><span class="stat-lbl">Too slow</span><span class="stat-val">${timeouts}</span></div>
        </div>
        <div class="table-wrap">
          <table class="book-table">
            <thead><tr><th>Task</th><th>Trials</th><th>Acc</th><th>Avg RT</th></tr></thead>
            <tbody>
              ${taskRow('Math (odd/even)', T.filter(t => t.task === 'math'))}
              ${taskRow('Arrows', T.filter(t => t.task === 'arrows'))}
              ${taskRow('After a switch', T.filter(t => t.isSwitch === true))}
              ${taskRow('Same task again', T.filter(t => t.isSwitch === false))}
              ${run.cfg.flip ? taskRow('Right after keys flipped', T.filter(t => t.flipped)) : ''}
            </tbody>
          </table>
        </div>
        <p class="note">Best streak: <b>${run.bestStreak}</b> · Trials: <b>${T.length}</b></p>
        <h4>Reaction time per trial</h4>
        ${rtChart(T)}
        ${tips.map(t => `<p class="note">${t}</p>`).join('')}`,
    });
  }

  function quit() {
    if (s && !confirm('Quit this run?')) return;
    stop();
    openSetup();
  }

  // -------------------- INIT --------------------
  $('swLeft').addEventListener('pointerdown', () => answer('left'));
  $('swRight').addEventListener('pointerdown', () => answer('right'));
  document.addEventListener('keydown', e => {
    if (!s || $('switchPlay').hidden) return;
    if (e.key === 'ArrowLeft') answer('left');
    else if (e.key === 'ArrowRight') answer('right');
    else return;
    e.preventDefault();
  });
  document.querySelectorAll('#switchSetup .seg[data-sw]').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      if (seg.dataset.sw === 'mode') settings.switchMode = b.dataset.value;
      else settings.switchSecs = Number(b.dataset.value);
      saveSettings();
      renderSetup();
    });
  });
  $('swStart').addEventListener('click', start);
  $('swQuit').addEventListener('click', quit);
  $('swLeaders').addEventListener('click', () => openLeadersFor(board()));

  return { openSetup };
})();
