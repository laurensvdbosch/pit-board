/* ===========================================================
   PIT BOARD — Trade Confirm (CNFM)
   ---------------------------------------------------------
   An order ticket ID sits at the top; four near-identical trade
   confirmations sit below. Tap the exact match.
   - Easy codes are 6–7 characters, Hard 8–9 (letters and digits).
   - The answer clock starts at 5 s and shrinks after every match:
     Normal −0.1 s, Fast −0.2 s, Very fast −0.3 s (floor 0.6 s).
   - 3 lives: a wrong tap or running out of time costs one.
   Score = matches.
   =========================================================== */

'use strict';

const Confirm = (() => {
  const START_MS = 5000;
  const FLOOR_MS = 600;
  const LIVES = 3;
  const OPTIONS = 4;
  const NEXT_MS = 250;      // pause after a match
  const MISS_MS = 1400;     // time to look at the right answer after a miss
  const LENGTHS = { easy: [6, 7], hard: [8, 9] };
  const SPEEDS = { 1: 'Normal', 2: 'Fast', 3: 'Very fast' };
  const CHARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
  // Characters people mix up at a glance — decoys lean on these
  const LOOKALIKE = {
    0: 'O', O: '0', Q: 'O', D: '0', 1: 'I', I: '1', L: '1', J: 'I', 5: 'S', S: '5', 8: 'B', B: '8', 3: '8',
    2: 'Z', Z: '2', 6: 'G', G: '6', C: 'G', 9: 'G', U: 'V', V: 'U', W: 'V', Y: 'V', M: 'N', N: 'M', H: 'N',
    E: 'F', F: 'E', P: 'R', R: 'P', 7: 'T', T: '7', 4: 'A', A: '4', K: 'X', X: 'K',
  };

  let r = null;   // the current run

  const board = () => ({ mode: 'confirm', difficulty: settings.confirmLen, rounds: settings.confirmSpeed });

  // -------------------- SETUP --------------------
  function renderSetup() {
    const vals = { len: settings.confirmLen, speed: String(settings.confirmSpeed) };
    document.querySelectorAll('#confirmSetup .seg[data-cf]').forEach(seg => {
      seg.querySelectorAll('button').forEach(b => {
        const on = vals[seg.dataset.cf] === b.dataset.value;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
      });
    });
    const best = store.get(boardBestKey(board()), null);
    $('cfBest').textContent = best === null ? 'No runs at this setting yet' : `Your best here: ${fmtScore('confirm', best)}`;
  }

  function openSetup() {
    renderSetup();
    showScreen('confirmSetup');
  }

  // -------------------- CODES --------------------
  // One small change: swap two neighbouring characters, or replace one with a look-alike
  function mutate(code) {
    const c = [...code];
    if (Math.random() < 0.35) {
      const i = shuffle([...Array(c.length - 1).keys()]).find(k => c[k] !== c[k + 1]);
      if (i !== undefined) {
        [c[i], c[i + 1]] = [c[i + 1], c[i]];
        return c.join('');
      }
    }
    const i = randInt(0, c.length - 1);
    c[i] = LOOKALIKE[c[i]] && Math.random() < 0.8 ? LOOKALIKE[c[i]] : pick(CHARS.filter(x => x !== c[i]));
    return c.join('');
  }

  function makeRound() {
    const code = Array.from({ length: randInt(...LENGTHS[r.len]) }, () => pick(CHARS)).join('');
    const options = new Set([code]);
    while (options.size < OPTIONS) options.add(mutate(code));
    return { code, options: shuffle([...options]) };
  }

  // -------------------- RUN --------------------
  function later(ms, fn) { r.timers.push(setTimeout(fn, ms)); }

  function stop() {
    if (!r) return;
    r.timers.forEach(clearTimeout);
    cancelAnimationFrame(r.raf);
    r = null;
  }

  function renderHud() {
    $('cfScore').textContent = r.score;
    $('cfLives').innerHTML = Array.from({ length: LIVES }, (_, i) => `<span class="life${i < r.lives ? ' on' : ''}"></span>`).join('');
  }

  function start() {
    stop();
    r = {
      len: settings.confirmLen, step: settings.confirmSpeed * 100,
      limit: START_MS, score: 0, lives: LIVES, rts: [], misses: [],
      timers: [], raf: 0, phase: 'idle', round: null, t0: 0,
    };
    $('cfInfo').textContent = `CNFM · ${r.len === 'easy' ? 'Easy' : 'Hard'} · ${SPEEDS[settings.confirmSpeed]}`;
    renderHud();
    showScreen('confirmPlay');
    next();
  }

  function next() {
    r.round = makeRound();
    r.phase = 'live';
    $('cfCode').textContent = r.round.code;
    $('cfOptions').innerHTML = r.round.options.map((o, i) => `
      <button class="cf-opt" data-i="${i}"><span class="cf-key">${i + 1}</span><span class="cf-val">${o}</span></button>`).join('');
    r.t0 = performance.now();
    const frame = () => {
      if (!r || r.phase !== 'live') return;
      const left = r.limit - (performance.now() - r.t0);
      $('cfClock').textContent = `${(Math.max(0, left) / 1000).toFixed(1)}s`;
      $('cfBar').style.width = `${Math.max(0, left / r.limit) * 100}%`;
      $('cfBar').classList.toggle('low', left < 1000);
      if (left <= 0) { miss(null); return; }
      r.raf = requestAnimationFrame(frame);
    };
    frame();
  }

  function choose(i) {
    if (!r || r.phase !== 'live') return;
    // The countdown loop pauses while the app is in the background, so check the clock here too
    if (performance.now() - r.t0 > r.limit) { miss(null); return; }
    const picked = r.round.options[i];
    if (picked !== r.round.code) { miss(i); return; }
    r.phase = 'between';
    r.rts.push(Math.round(performance.now() - r.t0));
    r.score += 1;
    r.limit = Math.max(FLOOR_MS, START_MS - r.step * r.score);
    $('cfOptions').children[i].classList.add('ok');
    renderHud();
    later(NEXT_MS, next);
  }

  // Wrong tap (index) or timeout (null): lose a life, show the right row
  function miss(i) {
    r.phase = 'between';
    cancelAnimationFrame(r.raf);
    r.lives -= 1;
    r.misses.push({ code: r.round.code, picked: i === null ? null : r.round.options[i], limit: r.limit });
    const rows = $('cfOptions').children;
    rows[r.round.options.indexOf(r.round.code)].classList.add('ok');
    if (i !== null) rows[i].classList.add('bad');
    else $('cfClock').textContent = 'Time!';
    renderHud();
    later(MISS_MS, () => (r.lives > 0 ? next() : finish()));
  }

  // The picked code with the characters that differ marked
  const diffHtml = (picked, code) => [...picked].map((ch, k) => (ch === code[k] ? ch : `<span class="miss">${ch}</span>`)).join('');

  function finish() {
    const run = r;
    stop();
    const avg = run.rts.length ? Math.round(sum(run.rts) / run.rts.length) : null;
    const fastest = run.rts.length ? Math.min(...run.rts) : null;
    const missRows = run.misses.map((m, k) => `
      <tr class="bad">
        <td>${k + 1}</td>
        <td class="mono">${m.code}</td>
        <td class="mono">${m.picked === null ? '<span class="dim">time ran out</span>' : diffHtml(m.picked, m.code)}</td>
        <td>${(m.limit / 1000).toFixed(1)}s</td>
      </tr>`).join('');
    const swaps = run.misses.filter(m => m.picked && [...m.picked].sort().join('') === [...m.code].sort().join('')).length;
    const tip = swaps
      ? 'Swapped neighbours caught you. Read the code in chunks of 3 and compare chunk by chunk.'
      : run.misses.some(m => m.picked === null)
        ? 'The clock got you. Scan for the one odd character instead of reading every code in full.'
        : 'Look-alikes (0/O, 1/I, 5/S, 8/B) are the usual trap. Check those characters first.';
    showSummary({
      board: board(),
      score: run.score,
      title: run.score >= 25 ? 'Back office legend' : run.score >= 12 ? 'Clean confirms' : 'Desk closed',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Matches</span><span class="stat-val">${run.score}</span></div>
          <div><span class="stat-lbl">Avg time</span><span class="stat-val">${avg === null ? '—' : `${avg} ms`}</span></div>
          <div><span class="stat-lbl">Fastest</span><span class="stat-val">${fastest === null ? '—' : `${fastest} ms`}</span></div>
          <div><span class="stat-lbl">Final clock</span><span class="stat-val">${(run.limit / 1000).toFixed(1)}s</span></div>
          <div><span class="stat-lbl">Lives used</span><span class="stat-val">${run.misses.length}/${LIVES}</span></div>
          <div><span class="stat-lbl">Start clock</span><span class="stat-val">${(START_MS / 1000).toFixed(1)}s</span></div>
        </div>
        <h4>Breaks</h4>
        <div class="table-wrap">
          <table class="book-table">
            <thead><tr><th>#</th><th>Ticket</th><th>You picked</th><th>Clock</th></tr></thead>
            <tbody>${missRows}</tbody>
          </table>
        </div>
        <p class="note">${tip}</p>`,
    });
  }

  function quit() {
    if (r && !confirm('Quit this run?')) return;
    stop();
    openSetup();
  }

  // -------------------- INIT --------------------
  $('cfOptions').addEventListener('pointerdown', e => {
    const b = e.target.closest('.cf-opt');
    if (b) choose(Number(b.dataset.i));
  });
  document.addEventListener('keydown', e => {
    if (!r || $('confirmPlay').hidden || !/^[1-4]$/.test(e.key)) return;
    choose(Number(e.key) - 1);
    e.preventDefault();
  });
  document.querySelectorAll('#confirmSetup .seg[data-cf]').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      if (seg.dataset.cf === 'len') settings.confirmLen = b.dataset.value;
      else settings.confirmSpeed = Number(b.dataset.value);
      saveSettings();
      renderSetup();
    });
  });
  $('cfStart').addEventListener('click', start);
  $('cfQuit').addEventListener('click', quit);
  $('cfLeaders').addEventListener('click', () => openLeadersFor(board()));

  return { openSetup };
})();
