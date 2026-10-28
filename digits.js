/* ===========================================================
   PIT BOARD — Digit Span (DGTS)
   ---------------------------------------------------------
   Digits flash one at a time, starting at 3. Type them back in
   order (forward) or reversed (backward). A correct answer adds a
   digit. Easy allows 2 tries per length, Hard 1. Score = longest
   sequence recalled correctly.
   =========================================================== */

'use strict';

const Digits = (() => {
  const SHOW_MS = 800;    // digit visible
  const GAP_MS = 200;     // blank between digits (1 digit per second, the standard pace)
  const LEAD_MS = 700;    // pause before the first digit
  const START_LEN = 3;
  const MAX_LEN = 20;

  let g = null;   // the current run

  const board = () => ({ mode: 'digits', difficulty: settings.digits, rounds: 0 });
  const parts = () => {
    const [dir, level] = settings.digits.split('-');
    return { dir, level };
  };

  // -------------------- SETUP --------------------
  function renderSetup() {
    const p = parts();
    document.querySelectorAll('#digitsSetup .seg[data-dg]').forEach(seg => {
      seg.querySelectorAll('button').forEach(b => {
        const on = p[seg.dataset.dg] === b.dataset.value;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
      });
    });
    const best = store.get(boardBestKey(board()), null);
    $('dgBest').textContent = best === null ? 'No runs at this setting yet' : `Your best here: ${fmtScore('digits', best)}`;
  }

  function openSetup() {
    renderSetup();
    showScreen('digitsSetup');
  }

  // -------------------- RUN --------------------
  function later(ms, fn) { g.timers.push(setTimeout(fn, ms)); }

  function stop() {
    if (g) g.timers.forEach(clearTimeout);
    g = null;
  }

  function start() {
    stop();
    const { dir, level } = parts();
    const tries = level === 'easy' ? 2 : 1;
    g = { dir, level, tries, triesLeft: tries, len: START_LEN, best: 0, log: [], timers: [], phase: 'idle', seq: [], input: '' };
    $('dgInfo').textContent = `DGTS · ${dir === 'fwd' ? 'Forward' : 'Backward'} · ${level === 'easy' ? 'Easy' : 'Hard'}`;
    showScreen('digitsPlay');
    nextSequence();
  }

  function makeSeq(n) {
    const s = [];
    while (s.length < n) {
      const d = randInt(0, 9);
      if (d !== s[s.length - 1]) s.push(d);   // no back-to-back repeats, so every flash is visible
    }
    return s;
  }

  function setStatus(text, cls = '') {
    $('dgStatus').textContent = text;
    $('dgStatus').className = 'dg-status ' + cls;
  }

  function nextSequence() {
    g.seq = makeSeq(g.len);
    g.input = '';
    g.phase = 'show';
    $('dgLen').textContent = `LEN ${g.len}`;
    $('dgTries').textContent = g.tries > 1 ? `Try ${g.tries - g.triesLeft + 1} of ${g.tries}` : 'One try';
    setStatus('Watch the code…');
    const cards = $('dgCards');
    cards.dataset.size = g.len <= 5 ? 'l' : g.len <= 8 ? 'm' : 's';
    cards.innerHTML = g.seq.map(() => '<span class="dg-card"></span>').join('');
    $('dgPad').classList.add('locked');
    renderEntry();

    // Digits land in their own card one per second and stay until the code is complete
    let t = LEAD_MS;
    g.seq.forEach((d, i) => {
      later(t, () => {
        const prev = cards.children[i - 1];
        if (prev) prev.classList.remove('latest');
        cards.children[i].textContent = d;
        cards.children[i].classList.add('on', 'latest');
      });
      t += SHOW_MS + GAP_MS;
    });
    later(t, () => {
      [...cards.children].forEach(c => { c.textContent = ''; c.className = 'dg-card'; });
      g.phase = 'input';
      $('dgPad').classList.remove('locked');
      setStatus(g.dir === 'fwd' ? 'Type it back in order' : 'Type it back in REVERSE', 'go');
      renderEntry();
    });
  }

  function renderEntry(target) {
    $('dgEntry').innerHTML = Array.from({ length: g.len }, (_, i) => {
      const ch = g.input[i] || '';
      let cls = ch ? 'filled' : '';
      if (target !== undefined) cls += ch === target[i] ? ' ok' : ' bad';
      else if (g.phase === 'input' && i === g.input.length) cls += ' cursor';
      return `<span class="${cls}">${ch}</span>`;
    }).join('');
  }

  function press(k) {
    if (!g || g.phase !== 'input') return;
    if (k === 'ok') {
      if (g.input.length) submit();
      return;
    }
    if (k === 'del') g.input = g.input.slice(0, -1);
    else if (/^\d$/.test(k) && g.input.length < g.len) g.input += k;
    renderEntry();
  }

  function submit() {
    const target = (g.dir === 'fwd' ? g.seq : [...g.seq].reverse()).join('');
    const ok = g.input === target;
    g.log.push({ len: g.len, shown: g.seq.join(''), target, typed: g.input, ok });
    g.phase = 'feedback';
    $('dgPad').classList.add('locked');
    renderEntry(target);

    if (ok) {
      g.best = Math.max(g.best, g.len);
      g.len += 1;
      g.triesLeft = g.tries;
    } else {
      g.triesLeft -= 1;
    }
    const over = g.triesLeft <= 0 || g.len > MAX_LEN;
    setStatus(ok ? '✓ Correct' : `✗ It was ${target}${over ? '' : ' — one more try'}`, ok ? 'ok' : 'bad');
    later(ok ? 900 : 1700, () => (over ? finish() : nextSequence()));
  }

  // Typed answer with wrong / missing digits marked
  const typedHtml = r => [...r.target].map((c, i) => {
    const t = r.typed[i];
    if (t === undefined) return '<span class="miss">·</span>';
    return t === c ? t : `<span class="miss">${t}</span>`;
  }).join('');

  function finish() {
    const run = g;
    stop();
    const right = run.log.filter(r => r.ok).length;
    const rows = run.log.map(r => `
      <tr class="${r.ok ? 'ok' : 'bad'}">
        <td>${r.len}</td>
        <td class="mono">${r.shown}</td>
        <td class="mono">${typedHtml(r)}</td>
        <td>${r.ok ? '✓' : '✗'}</td>
      </tr>`).join('');
    showSummary({
      board: board(),
      score: run.best,
      title: run.best >= 8 ? 'Elite recall' : run.best >= 6 ? 'Solid recall' : 'Run complete',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Longest</span><span class="stat-val">${run.best}</span></div>
          <div><span class="stat-lbl">Sequences</span><span class="stat-val">${run.log.length}</span></div>
          <div><span class="stat-lbl">Correct</span><span class="stat-val">${right}/${run.log.length}</span></div>
        </div>
        <h4>Tape log${run.dir === 'bwd' ? ' — answers are the shown digits reversed' : ''}</h4>
        <div class="table-wrap">
          <table class="book-table">
            <thead><tr><th>Len</th><th>Shown</th><th>You typed</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="note">${run.dir === 'fwd'
          ? 'Tip: chunk the digits in threes, like a phone number.'
          : 'Tip: chunk into pairs, then reverse each chunk as you type.'}</p>`,
    });
  }

  function quit() {
    if (g && !confirm('Quit this run?')) return;
    stop();
    openSetup();
  }

  // -------------------- INIT --------------------
  $('dgPad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => `<button data-k="${d}">${d}</button>`).join('') +
    '<button data-k="del" class="k-del" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="k-ok">Enter</button>';
  $('dgPad').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (b) press(b.dataset.k);
  });
  document.addEventListener('keydown', e => {
    if (!g || $('digitsPlay').hidden) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('ok');
    else return;
    e.preventDefault();
  });
  document.querySelectorAll('#digitsSetup .seg[data-dg]').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      const p = { ...parts(), [seg.dataset.dg]: b.dataset.value };
      settings.digits = `${p.dir}-${p.level}`;
      saveSettings();
      renderSetup();
    });
  });
  $('dgStart').addEventListener('click', start);
  $('dgQuit').addEventListener('click', quit);
  $('dgLeaders').addEventListener('click', () => openLeadersFor(board()));

  return { openSetup };
})();
