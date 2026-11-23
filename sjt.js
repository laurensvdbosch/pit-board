/* ===========================================================
   PITPREP — Aptitude section: Situational judgement (SJT)
   ---------------------------------------------------------
   Practice: one scenario at a time, feedback after each.
   Assessment: 10 or 20 scenarios against the clock, feedback at the end.
   Formats: most / least effective, or rate each response 1–4.
   Not ranked on purpose: SJTs measure judgement and fit, so the aim is to
   learn the reasoning. Results are kept on this device only.
   Questions live in sjt-bank.js. Registers itself with GAMES.
   =========================================================== */

'use strict';

const SJT = (() => {
  const BANK = SJT_BANK, S = SJTScore;
  const OPTS = 'pitboard-sjt-opts', PROG = 'pitboard-sjt';
  const SEC = { mix: 'Mixed', fin: 'Finance', pro: 'Consulting & Big 4', gen: 'General' };
  const SEC_SHORT = { fin: 'Finance', pro: 'Consulting & Big 4', gen: 'General' };
  const COMP = { integrity: 'Integrity', teamwork: 'Teamwork', client: 'Client focus', priorities: 'Prioritising', communication: 'Communication', learning: 'Taking feedback', initiative: 'Initiative', resilience: 'Resilience' };
  const SECS_PER = 90;   // assessment: 1.5 minutes a scenario

  const opts = Object.assign({ mode: 'practice', format: 'ml', sec: 'mix', count: 10 }, store.get(OPTS, {}));
  if (!['practice', 'assess'].includes(opts.mode)) opts.mode = 'practice';
  if (!['ml', 'rate'].includes(opts.format)) opts.format = 'ml';
  if (!SEC[opts.sec]) opts.sec = 'mix';
  if (![10, 20].includes(opts.count)) opts.count = 10;
  const prog = store.get(PROG, {});

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = t => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (got, max) => (max ? Math.round((100 * got) / max) : 0);

  // "I disagree with this answer": sent to a private table (supabase/admin.sql reads it).
  // One flag per scenario per device.
  const FLAGGED = 'pitboard-sjt-flagged';
  const flagged = store.get(FLAGGED, []);
  const shortText = t => (t.length > 70 ? `${t.slice(0, 67)}…` : t);
  const flagHtml = (sc, order) => (flagged.includes(sc.id)
    ? '<p class="sj-flag-done">🚩 You flagged this scenario. Thanks!</p>'
    : `<div class="sj-flag" data-scn="${sc.id}">
        <button class="sj-flag-open" type="button">🚩 I disagree with this answer</button>
        <form class="sj-flag-form" hidden>
          <label class="field-label">Which response do you disagree with?</label>
          <select name="resp" class="sj-flag-select">
            <option value="">The scenario as a whole</option>
            ${order.map((k, pos) => `<option value="${k}">${'ABCD'[pos]}. ${esc(shortText(sc.r[k][0]))}</option>`).join('')}
          </select>
          <label class="field-label">What would you rate it? (optional)</label>
          <div class="sj-flag-rate">${[1, 2, 3, 4].map(v => `<label><input type="radio" name="sug" value="${v}"> <b>${v}</b> ${S.RATING[v].toLowerCase()}</label>`).join('')}</div>
          <textarea name="note" class="sj-flag-note" maxlength="300" rows="3" placeholder="Why? (optional, up to 300 characters)"></textarea>
          <div class="sj-flag-btns"><button class="btn btn-primary" type="submit">Send</button><button class="btn btn-ghost sj-flag-cancel" type="button">Cancel</button></div>
          <p class="sj-flag-msg" aria-live="polite"></p>
        </form>
      </div>`);

  // ================================================================
  //  REGISTRATION (no board: practice only, never posted)
  // ================================================================
  GAMES.sjt = {
    section: 'aptitude', sym: 'SJT', short: 'SJT', name: 'Situational judgement', color: '#5DB2FF',
    blurb: 'Workplace scenarios: pick or rate the best responses',
    noBoard: true, filters: [], fmt: s => `${s}% match`,
    status: () => ({ text: `${Object.keys(prog).length}/${BANK.length}`, sub: 'practised' }),
    open: () => { renderSetup(); showScreen('sjSetup'); },
  };

  // ================================================================
  //  SETUP
  // ================================================================
  const seg = (key, cls, list) => `
    <div class="seg ${cls}" data-sj="${key}">
      ${list.map(([v, label, sub]) => `<button data-value="${v}" class="${String(opts[key]) === String(v) ? 'active' : ''}" aria-pressed="${String(opts[key]) === String(v)}">${sub ? `<strong>${label}</strong><small>${sub}</small>` : label}</button>`).join('')}
    </div>`;
  const field = (label, html) => `<div class="field"><div class="field-label">${label}</div>${html}</div>`;
  const pool = () => BANK.filter(sc => opts.sec === 'mix' || sc.sec === opts.sec);

  function renderSetup() {
    $('sjOptions').innerHTML = `
      ${field('Mode', seg('mode', 'seg-2', [['practice', 'Practice', 'Feedback after every scenario'], ['assess', 'Assessment', `Timed, feedback at the end`]]))}
      ${field('Format', seg('format', 'seg-2', [['ml', 'Most & least', 'Pick the best and worst response'], ['rate', 'Rate each', 'Score every response 1 to 4']]))}
      ${field('Sector', seg('sec', 'seg-2 sj-sec', Object.entries(SEC)))}
      ${opts.mode === 'assess' ? field('Length', seg('count', 'seg-2 sj-center', [[10, `10 scenarios · ${(10 * SECS_PER) / 60} min`], [20, `20 scenarios · ${(20 * SECS_PER) / 60} min`]])) : ''}`;
    const n = pool().length;
    $('sjPool').textContent = `${n} scenarios${opts.sec === 'mix' ? ', an even mix of finance, consulting & Big 4 and general roles' : ` in ${SEC[opts.sec]}`}.`;
  }

  // ================================================================
  //  RUN
  // ================================================================
  let run = null;

  // Mixed assessments take an equal share from each sector
  function pick(n) {
    if (opts.sec !== 'mix') return shuffle(pool()).slice(0, n);
    const by = Object.keys(SEC_SHORT).map(k => shuffle(BANK.filter(sc => sc.sec === k)));
    const out = [];
    for (let i = 0; out.length < n; i++) { const list = by[i % by.length]; if (list.length) out.push(list.shift()); }
    return shuffle(out);
  }

  function start() {
    const assess = opts.mode === 'assess';
    const list = assess ? pick(opts.count) : pick(pool().length);
    run = {
      assess, format: opts.format, sec: opts.sec, i: 0, timer: null, end: 0,
      items: list.map(sc => ({ sc, order: shuffle([0, 1, 2, 3]), most: null, least: null, ratings: [0, 0, 0, 0], checked: false, pts: 0 })),
    };
    if (assess) run.end = Date.now() + list.length * SECS_PER * 1000;
    showScreen('sjPlay');
    render(true);
    if (assess) { run.timer = setInterval(tick, 250); tick(); }
  }

  function tick() {
    if (!run || !run.assess) return;
    const left = Math.max(0, Math.ceil((run.end - Date.now()) / 1000));
    $('sjTimer').textContent = clock(left);
    $('sjTimer').classList.toggle('low', left <= 60);
    if (left <= 0) finish(true);
  }

  const complete = it => (run.format === 'ml' ? it.most !== null && it.least !== null : it.ratings.every(v => v > 0));
  const score = it => (run.format === 'ml' ? S.mostLeast(it.sc, it.most, it.least) : S.rate(it.sc, it.ratings));

  function render(top) {
    const r = run, it = r.items[r.i], sc = it.sc, done = it.checked;
    const ml = r.format === 'ml';
    $('sjInfo').textContent = r.assess ? `SJT · ${r.i + 1} of ${r.items.length}` : `SJT · Practice · scenario ${r.i + 1}`;
    if (!r.assess) $('sjTimer').textContent = '';
    const rows = it.order.map((k, pos) => {
      const [text, key, why] = sc.r[k];
      let ctrl;
      if (ml) {
        ctrl = `<div class="sj-ml">
          <button class="sj-pick most ${it.most === k ? 'on' : ''}" data-most="${k}" ${done ? 'disabled' : ''} aria-pressed="${it.most === k}">Most</button>
          <button class="sj-pick least ${it.least === k ? 'on' : ''}" data-least="${k}" ${done ? 'disabled' : ''} aria-pressed="${it.least === k}">Least</button>
        </div>`;
      } else {
        ctrl = `<div class="sj-rate">${[1, 2, 3, 4].map(v => `<button class="sj-r ${it.ratings[k] === v ? 'on' : ''}" data-rate="${k}" data-v="${v}" ${done ? 'disabled' : ''} aria-pressed="${it.ratings[k] === v}" aria-label="${v}: ${S.RATING[v]}">${v}</button>`).join('')}</div>`;
      }
      let fb = '';
      if (done) {
        const you = ml ? (it.most === k ? 'You: most' : it.least === k ? 'You: least' : '') : `You: ${it.ratings[k]}`;
        const right = ml ? (it.most === k ? k === S.best(sc) : it.least === k ? k === S.worst(sc) : null) : it.ratings[k] === key ? true : Math.abs(it.ratings[k] - key) === 1 ? 'near' : false;
        fb = `<div class="sj-fb"><span class="sj-key k${key}">${key} · ${S.RATING[key]}</span>${you ? `<span class="sj-you ${right === true ? 'ok' : right === 'near' ? 'near' : right === false ? 'bad' : ''}">${you}</span>` : ''}<p>${esc(why)}</p></div>`;
      }
      return `<div class="sj-resp${done ? ` k${key}` : ''}"><div class="sj-resp-main"><span class="sj-letter">${'ABCD'[pos]}</span><span class="sj-text">${esc(text)}</span></div>${ctrl}${fb}</div>`;
    }).join('');
    const legend = ml ? '<p class="sj-legend">Pick the <b>most</b> effective and the <b>least</b> effective response.</p>'
      : `<p class="sj-legend">Rate every response: ${[1, 2, 3, 4].map(v => `<b>${v}</b> ${S.RATING[v].toLowerCase()}`).join(' · ')}</p>`;
    const last = r.i + 1 >= r.items.length;
    const action = r.assess
      ? `<button class="btn btn-primary" id="sjNext" ${complete(it) ? '' : 'disabled'}>${last ? 'Finish' : 'Next scenario'}</button>`
      : done ? `<button class="btn btn-primary" id="sjNext">${last ? 'See summary' : 'Next scenario'}</button>`
        : `<button class="btn btn-primary" id="sjCheck" ${complete(it) ? '' : 'disabled'}>Check</button>`;
    const result = done ? `<p class="sj-result">${ml ? `${it.pts} of 2 picks match the key` : `${it.pts} of 8 points: 2 for the key's rating, 1 if you're one off`} · tests <b>${COMP[sc.comp]}</b></p>` : '';
    $('sjBody').innerHTML = `
      ${r.assess ? `<div class="sr-progress" style="grid-template-columns:repeat(${r.items.length},1fr)">${r.items.map((x, i) => `<span class="${i === r.i ? 'cur' : i < r.i ? 'done' : ''}"></span>`).join('')}</div>` : ''}
      <div class="bt-tags"><span class="bt-tag">${SEC_SHORT[sc.sec]}</span>${done ? `<span class="bt-tag">${COMP[sc.comp]}</span>` : ''}</div>
      <p class="sj-scn">${esc(sc.s)}</p>
      ${legend}
      <div class="sj-list">${rows}</div>
      ${result}
      ${done ? flagHtml(sc, it.order) : ''}
      <div class="sj-actions">${action}${!r.assess && r.i > 0 ? '<button class="btn btn-ghost" id="sjFinish">Finish practice</button>' : ''}</div>`;
    if (top) window.scrollTo(0, 0);
  }

  function check() {
    const it = run.items[run.i];
    if (!complete(it) || it.checked) return;
    it.checked = true;
    it.pts = score(it);
    prog[it.sc.id] = pct(it.pts, S.max(run.format));
    store.set(PROG, prog);
    render();
  }

  function next() {
    const r = run, it = r.items[r.i];
    if (r.assess) {
      if (!complete(it)) return;
      it.checked = true;
      it.pts = score(it);
      prog[it.sc.id] = pct(it.pts, S.max(r.format));
      store.set(PROG, prog);
    } else if (!it.checked) return;
    if (r.i + 1 >= r.items.length) { finish(false); return; }
    r.i += 1;
    render(true);
  }

  function stop() { if (run) { clearInterval(run.timer); } }

  // ================================================================
  //  SUMMARY (never posted)
  // ================================================================
  function finish(timeUp) {
    const r = run;
    stop();
    const items = r.items.filter(it => it.checked);
    const max = S.max(r.format);
    const got = items.reduce((s, it) => s + it.pts, 0);
    const total = r.assess ? r.items.length : items.length;
    const overall = pct(got, total * max);
    // Practice only covers what you answered; an assessment counts unanswered scenarios as 0
    const shown = r.assess ? r.items : items;
    const groups = (key, names) => Object.entries(names).map(([k, label]) => {
      const list = shown.filter(it => it.sc[key] === k);
      if (!list.length) return '';
      const p = pct(list.reduce((s, it) => s + (it.checked ? it.pts : 0), 0), list.length * max);
      return `<div class="sj-bar"><span>${label}</span><div class="sj-track"><i style="width:${p}%"></i></div><b>${p}%</b></div>`;
    }).join('');
    const review = shown.map((it, i) => {
      const sc = it.sc;
      const p = it.checked ? pct(it.pts, max) : null;
      const lines = it.order.map((k, pos) => {
        const [text, key, why] = sc.r[k];
        const you = r.format === 'ml' ? (it.most === k ? ' · you: most' : it.least === k ? ' · you: least' : '') : it.checked ? ` · you: ${it.ratings[k]}` : '';
        return `<li class="k${key}"><b>${'ABCD'[pos]}.</b> ${esc(text)}<br><small><span class="sj-key k${key}">${key} · ${S.RATING[key]}</span>${you}. ${esc(why)}</small></li>`;
      }).join('');
      return `
        <li class="sr-item ${p === null ? 'skip' : p >= 75 ? 'ok' : p >= 50 ? '' : 'bad'}">
          <div class="sr-item-head"><span>${i + 1}. ${esc(sc.t)}</span><span class="sr-pts">${p === null ? 'not answered' : `${p}%`}</span></div>
          <small class="dim">${SEC_SHORT[sc.sec]} · ${COMP[sc.comp]}</small>
          <details class="bt-review"><summary>Scenario and feedback</summary><p class="bt-review-q">${esc(sc.s)}</p><ol class="sj-review-list">${lines}</ol>${flagHtml(sc, it.order)}</details>
        </li>`;
    }).join('');
    showSummary({
      board: { mode: 'sjt', difficulty: r.format, rounds: total },
      score: overall,
      practice: true,
      practiceNote: '<span class="dim">Not ranked: in the real test, answer as yourself.</span>',
      sub: `Situational judgement · ${r.assess ? 'Assessment' : 'Practice'} · ${SEC[r.sec]}`,
      title: timeUp ? 'Time called' : r.assess ? 'Assessment done' : 'Practice summary',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Match with the key</span><span class="stat-val">${overall}%</span></div>
          <div><span class="stat-lbl">Scenarios</span><span class="stat-val">${items.length}${r.assess ? ` / ${total}` : ''}</span></div>
          <div><span class="stat-lbl">Format</span><span class="stat-val bt-levels">${r.format === 'ml' ? 'Most & least' : 'Rate each'}</span></div>
        </div>
        <p class="note">This shows how closely your choices match common professional judgement. It is not a pass mark: employers score against their own values. Read the feedback for the scenarios where you differed, and ask whether you agree with the reasoning.</p>
        <h4>By competency</h4><div class="sj-bars">${groups('comp', COMP)}</div>
        ${r.sec === 'mix' ? `<h4>By sector</h4><div class="sj-bars">${groups('sec', SEC_SHORT)}</div>` : ''}
        <h4>Every scenario</h4><ul class="sr-list">${review}</ul>`,
    });
    run = null;
  }

  // ================================================================
  //  EVENTS
  // ================================================================
  $('sjOptions').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]'), s = b && b.closest('[data-sj]');
    if (!s) return;
    const key = s.dataset.sj;
    opts[key] = key === 'count' ? Number(b.dataset.value) : b.dataset.value;
    store.set(OPTS, opts);
    renderSetup();
  });
  $('sjStart').addEventListener('click', start);
  $('sjBack').addEventListener('click', goHome);
  $('sjQuit').addEventListener('click', () => {
    if (run && run.assess && !confirm('Quit this assessment?')) return;
    stop();
    run = null;
    renderSetup();
    showScreen('sjSetup');
  });
  $('sjBody').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t || !run || t.disabled) return;
    const it = run.items[run.i];
    if (t.dataset.most !== undefined) {
      const k = Number(t.dataset.most);
      it.most = it.most === k ? null : k;
      if (it.least === k) it.least = null;
      render();
    } else if (t.dataset.least !== undefined) {
      const k = Number(t.dataset.least);
      it.least = it.least === k ? null : k;
      if (it.most === k) it.most = null;
      render();
    } else if (t.dataset.rate !== undefined) {
      it.ratings[Number(t.dataset.rate)] = Number(t.dataset.v);
      render();
    } else if (t.id === 'sjCheck') check();
    else if (t.id === 'sjNext') next();
    else if (t.id === 'sjFinish') finish(false);
  });
  // Flag form, wherever it appears (after a practice check, or in the results)
  document.addEventListener('click', e => {
    const open = e.target.closest('.sj-flag-open'), cancel = e.target.closest('.sj-flag-cancel');
    const box = (open || cancel) && (open || cancel).closest('.sj-flag');
    if (!box) return;
    box.querySelector('.sj-flag-form').hidden = Boolean(cancel);
    box.querySelector('.sj-flag-open').hidden = !cancel;
    if (open) box.querySelector('.sj-flag-select').focus();
  });
  document.addEventListener('submit', async e => {
    const form = e.target.closest && e.target.closest('.sj-flag-form');
    if (!form) return;
    e.preventDefault();
    const box = form.closest('.sj-flag'), id = box.dataset.scn, sc = BANK.find(x => x.id === id);
    const resp = form.resp.value === '' ? null : Number(form.resp.value);
    const sug = form.querySelector('input[name="sug"]:checked');
    const msg = form.querySelector('.sj-flag-msg'), btn = form.querySelector('[type="submit"]');
    if (!sc || typeof Online === 'undefined' || !Online.flagSJT) { msg.textContent = "Couldn't send right now."; return; }
    btn.disabled = true;
    msg.textContent = 'Sending…';
    try {
      await Online.flagSJT({ scenario: id, response: resp, text: resp === null ? null : sc.r[resp][0].slice(0, 160), suggested: sug ? Number(sug.value) : null, note: form.note.value.trim() || null });
      flagged.push(id);
      store.set(FLAGGED, flagged);
      box.outerHTML = '<p class="sj-flag-done">🚩 Thanks, your flag was sent. It helps improve these answers.</p>';
    } catch (err) {
      btn.disabled = false;
      msg.textContent = err.message === 'too_many' ? 'Too many flags from this network in the last hour. Try again later.' : "Couldn't send right now. Check your connection and try again.";
    }
  });

  document.addEventListener('keydown', e => {
    if (!run || $('sjPlay').hidden || e.key !== 'Enter' || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    const b = $('sjCheck') || $('sjNext');
    if (b && !b.disabled) { b.click(); e.preventDefault(); }
  });

  renderLobby();
  return {};
})();
