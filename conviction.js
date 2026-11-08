/* ===========================================================
   PIT BOARD — Conviction (CNVN)
   ---------------------------------------------------------
   True/false and more/less questions, each with a 50–100% slider for
   how sure you are. Questions come from conviction-bank.js.
   Categories: General easy/hard, Finance easy/hard/quant, or Mixed.
   Formats:
   - Interview: one at a time, 30 s each, no going back. Ranked on
     board (conv, <category>, 25|50).
   - Untimed: one scrollable page. Answers could be looked up, so it
     keeps a personal best on the device but isn't ranked.
   Right/wrong is only shown at the end.
   Scoring per question (p = slider / 100):
     right 1 − 4(1 − p)²  ·  wrong 1 − 4p²  ·  blank 0
   50% scores 0 either way; 100% is +1 or −3. Your best play is always
   to set the slider to what you really believe.
   =========================================================== */

'use strict';

const Conviction = (() => {
  const SECS_PER_Q = 30;
  const RECENT_KEY = 'pitboard-conv-recent';
  const POOL_NAME = { 'gk-easy': 'General · Easy', 'gk-hard': 'General · Hard', 'fin-easy': 'Finance · Easy', 'fin-hard': 'Finance · Hard', 'fin-quant': 'Finance · Quant' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let g = null;

  // The bank key for the current category + level
  function diffKey() {
    if (settings.convCat === 'mix') return 'mix';
    if (settings.convCat === 'gk') return settings.convLevel === 'easy' ? 'gk-easy' : 'gk-hard';
    return `fin-${settings.convLevel}`;
  }
  const board = () => ({ mode: 'conv', difficulty: diffKey(), rounds: settings.convCount });
  const untimedBoard = (diff, n) => ({ mode: 'conv', difficulty: `untimed-${diff}`, rounds: n });

  const fmt = s => fmtScore('conv', s);
  const isML = q => q.answer === 'more' || q.answer === 'less';
  const choices = q => (isML(q) ? [['more', 'More'], ['less', 'Less']] : [['true', 'True'], ['false', 'False']]);
  const answerLabel = v => ({ true: 'True', false: 'False', more: 'More', less: 'Less' }[String(v)]);

  // -------------------- SETUP --------------------
  function setSeg(el, value) {
    el.querySelectorAll('button[data-value]').forEach(b => {
      const on = b.dataset.value === String(value);
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
  }

  function renderSetup() {
    if (settings.convCat === 'gk' && settings.convLevel === 'quant') settings.convLevel = 'hard';
    setSeg($('cvFormat'), settings.convFormat);
    setSeg($('cvCat'), settings.convCat);
    setSeg($('cvLevel'), settings.convLevel);
    setSeg($('cvCount'), settings.convCount);
    const finance = settings.convCat === 'fin';
    $('cvLevelField').hidden = settings.convCat === 'mix';
    $('cvLevelQuant').hidden = !finance;
    $('cvLevel').classList.toggle('seg-3', finance);
    $('cvLevel').classList.toggle('seg-2', !finance);

    const n = settings.convCount;
    const b = settings.convFormat === 'interview' ? board() : untimedBoard(diffKey(), n);
    const best = store.get(boardBestKey(b), null);
    $('cvBest').textContent = best === null ? 'No rounds on this setting yet' : `Your best: ${fmt(best)}`;
    $('cvNote').textContent = settings.convFormat === 'interview'
      ? `${n} questions · ${Math.round((n * SECS_PER_Q) / 60)} min at most · ranked on the leaderboard`
      : `${n} questions · no clock · not ranked, since answers could be looked up`;
  }

  function openSetup() {
    renderSetup();
    showScreen('cvSetup');
  }

  function bindSeg(id, key, cast = v => v) {
    $(id).addEventListener('click', e => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      settings[key] = cast(b.dataset.value);
      saveSettings();
      renderSetup();
    });
  }

  // -------------------- RUN --------------------
  function stop() {
    if (!g) return;
    clearInterval(g.timer);
    g = null;
  }

  function cardHtml(q, i, total) {
    return `
      <li class="cv-card" data-i="${i}">
        <div class="cv-num">Question ${i + 1} of ${total}</div>
        <p class="cv-text">${esc(q.text)}</p>
        <div class="cv-choices">${choices(q).map(([v, label]) => `<button data-v="${v}" class="${q.pick === v ? 'active' : ''}">${label}</button>`).join('')}</div>
        <div class="cv-slider">
          <span class="cv-lbl">Conviction</span>
          <input type="range" min="50" max="100" step="1" value="${q.pct}" aria-label="How sure you are, question ${i + 1}">
          <b class="cv-pct">${q.pct}%</b>
        </div>
      </li>`;
  }

  function start() {
    stop();
    const diff = diffKey();
    const n = settings.convCount;
    const recent = store.get(RECENT_KEY, []);
    const qs = drawConviction(diff, n, recent).map(q => ({ ...q, pick: null, pct: 50 }));
    store.set(RECENT_KEY, [...recent, ...qs.map(q => q.id)].slice(-300));
    const interview = settings.convFormat === 'interview';
    g = { interview, diff, n, qs, i: 0, startedAt: Date.now(), qEnd: 0, timer: null };
    showScreen('cvPlay');
    $('cvTimer').hidden = !interview;
    $('cvNext').hidden = !interview;
    $('cvSubmit').hidden = interview;
    if (interview) {
      g.timer = setInterval(tick, 200);
      showCurrent();
    } else {
      $('cvList').innerHTML = qs.map((q, i) => cardHtml(q, i, n)).join('');
      updateCount();
    }
  }

  function showCurrent() {
    const q = g.qs[g.i];
    g.qEnd = Date.now() + SECS_PER_Q * 1000;
    $('cvInfo').textContent = 'CNVN · Interview';
    $('cvList').innerHTML = cardHtml(q, g.i, g.n);
    $('cvNext').textContent = g.i === g.n - 1 ? 'Finish' : 'Next';
    $('cvNext').disabled = true;
    window.scrollTo(0, 0);
    tick();
  }

  function tick() {
    if (!g || !g.interview) return;
    const left = Math.max(0, Math.ceil((g.qEnd - Date.now()) / 1000));
    $('cvTimer').textContent = `0:${String(left).padStart(2, '0')}`;
    $('cvTimer').classList.toggle('low', left <= 5);
    if (left <= 0) advance();
  }

  // Out of time keeps whatever was already picked; no pick stays blank
  function advance() {
    if (!g) return;
    if (g.i >= g.n - 1) { finish(); return; }
    g.i += 1;
    showCurrent();
  }

  function updateCount() {
    if (!g || g.interview) return;
    $('cvInfo').textContent = `CNVN · ${g.qs.filter(q => q.pick !== null).length} of ${g.n} answered`;
  }

  function pick(i, v, btn) {
    if (!g) return;
    g.qs[i].pick = v;
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
    btn.closest('.cv-card').classList.add('filled');
    if (g.interview) $('cvNext').disabled = false;
    updateCount();
  }

  function submit() {
    if (!g) return;
    const blank = g.qs.filter(q => q.pick === null).length;
    if (blank && !confirm(`${blank} question${blank === 1 ? '' : 's'} still blank. Hand in anyway?`)) return;
    finish();
  }

  // -------------------- RESULTS --------------------
  const isRight = q => q.pick === String(q.answer);
  function points(q) {
    if (q.pick === null) return 0;
    const p = q.pct / 100;
    return isRight(q) ? 1 - 4 * (1 - p) ** 2 : 1 - 4 * p ** 2;
  }
  const signed = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;

  function finish() {
    if (!g) return;
    const run = g;
    const used = Math.round((Date.now() - run.startedAt) / 1000);
    stop();
    if (document.activeElement) document.activeElement.blur();
    const answered = run.qs.filter(q => q.pick !== null);
    const right = answered.filter(isRight).length;
    const wrong = answered.length - right;
    const score = round2(sum(run.qs.map(points)));
    const acc = answered.length ? (100 * right) / answered.length : 0;
    const avgPct = answered.length ? sum(answered.map(q => q.pct)) / answered.length : 0;

    // Said vs actually right, per slider band
    const bands = [[50, 59], [60, 69], [70, 79], [80, 89], [90, 100]].map(([lo, hi]) => {
      const rows = answered.filter(q => q.pct >= lo && q.pct <= hi);
      if (!rows.length) return '';
      const said = Math.round(sum(rows.map(q => q.pct)) / rows.length);
      const was = Math.round((100 * rows.filter(isRight).length) / rows.length);
      return `<tr><td>${lo}–${hi}%</td><td>${rows.length}</td><td>${said}%</td><td class="${was < said - 5 ? 'neg' : was > said + 5 ? 'pos' : ''}">${was}%</td></tr>`;
    }).join('');

    const gap = avgPct - acc;
    const verdict = answered.length < 5 ? ''
      : gap > 5 ? `You were too sure by about ${Math.round(gap)} points: on average you said ${Math.round(avgPct)}% and got ${Math.round(acc)}% right.`
        : gap < -5 ? `You could have been ${Math.round(-gap)} points surer: on average you said ${Math.round(avgPct)}% and got ${Math.round(acc)}% right.`
          : `Your slider matched reality: on average you said ${Math.round(avgPct)}% and got ${Math.round(acc)}% right.`;

    const items = run.qs.map((q, i) => {
      const status = q.pick === null ? 'skip' : isRight(q) ? 'ok' : 'bad';
      const pts = points(q);
      return `
        <li class="sr-item ${status}">
          <div class="sr-item-head"><span>Q${i + 1}${run.diff === 'mix' ? ` · ${POOL_NAME[q.pool]}` : ''} <span class="sr-mark">${{ ok: '✓', bad: '✗', skip: '—' }[status]}</span></span><span class="sr-pts">${signed(pts)}</span></div>
          <div class="cv-review-q">${esc(q.text)}</div>
          <div class="sr-item-ans">
            <span>You: <b>${q.pick === null ? 'blank' : `${answerLabel(q.pick)} · ${q.pct}%`}</b></span>
            <span>Answer: <b>${answerLabel(q.answer)}</b></span>
          </div>
          ${q.why ? `<small>${esc(q.why)}</small>` : ''}
        </li>`;
    }).join('');

    const body = `
      <div class="stat-grid">
        <div><span class="stat-lbl">Right</span><span class="stat-val pos">${right}</span></div>
        <div><span class="stat-lbl">Wrong</span><span class="stat-val neg">${wrong}</span></div>
        <div><span class="stat-lbl">Blank</span><span class="stat-val">${run.n - answered.length}</span></div>
        <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${answered.length ? `${Math.round(acc)}%` : '—'}</span></div>
        <div><span class="stat-lbl">Avg slider</span><span class="stat-val">${answered.length ? `${Math.round(avgPct)}%` : '—'}</span></div>
        <div><span class="stat-lbl">Time</span><span class="stat-val">${Math.floor(used / 60)}:${String(used % 60).padStart(2, '0')}</span></div>
      </div>
      ${verdict ? `<p class="note">${verdict}</p>` : ''}
      ${bands ? `<h4>How sure vs how right</h4>
      <div class="table-wrap"><table class="book-table"><thead><tr><th>Slider</th><th>Qs</th><th>You said</th><th>Right</th></tr></thead><tbody>${bands}</tbody></table></div>` : ''}
      <p class="note">Each answer: 50% scores 0 either way, 100% scores +1 if right and −3 if wrong. Blank scores 0.</p>
      <h4>Every question</h4>
      <ul class="sr-list">${items}</ul>`;

    const b = { mode: 'conv', difficulty: run.diff, rounds: run.n };
    if (run.interview) {
      showSummary({ board: b, score, title: 'Interview done', again: start, bodyHtml: body });
    } else {
      const local = untimedBoard(run.diff, run.n);
      const { isBest, prev } = saveBest(local, score);
      showSummary({
        board: b,
        practice: true,
        practiceNote: isBest ? '<span class="ok">New untimed best!</span>' : `Untimed best: ${fmt(prev)}`,
        sub: `Conviction · Untimed · ${boardLabel(b).split(' · ').slice(1).join(' · ')}`,
        score,
        title: 'Handed in',
        again: start,
        bodyHtml: body,
      });
    }
  }

  function quit() {
    if (g && !confirm('Quit this round?')) return;
    stop();
    openSetup();
  }

  // -------------------- INIT --------------------
  bindSeg('cvFormat', 'convFormat');
  bindSeg('cvCat', 'convCat');
  bindSeg('cvLevel', 'convLevel');
  bindSeg('cvCount', 'convCount', Number);
  $('cvStart').addEventListener('click', start);
  $('cvQuit').addEventListener('click', quit);
  $('cvNext').addEventListener('click', advance);
  $('cvSubmit').addEventListener('click', submit);
  $('cvLeaders').addEventListener('click', () => openLeadersFor(board()));
  $('cvList').addEventListener('click', e => {
    const b = e.target.closest('.cv-choices button');
    if (b) pick(Number(b.closest('.cv-card').dataset.i), b.dataset.v, b);
  });
  $('cvList').addEventListener('input', e => {
    if (!g || !e.target.matches('input[type="range"]')) return;
    const card = e.target.closest('.cv-card');
    g.qs[Number(card.dataset.i)].pct = Number(e.target.value);
    card.querySelector('.cv-pct').textContent = `${e.target.value}%`;
  });
  document.addEventListener('keydown', e => {
    if (!g || !g.interview || $('cvPlay').hidden) return;
    const card = $('cvList').querySelector('.cv-card');
    if (e.key === 'Enter') { if (!$('cvNext').disabled) advance(); e.preventDefault(); return; }
    const key = { t: 'true', f: 'false', m: 'more', l: 'less' }[e.key.toLowerCase()];
    const btn = key && card.querySelector(`[data-v="${key}"]`);
    if (btn) { pick(g.i, key, btn); e.preventDefault(); }
  });

  return { openSetup };
})();
