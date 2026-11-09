/* ===========================================================
   PIT BOARD — Odds section
   ---------------------------------------------------------
   Probability Paper (prob): the serious module. 90 s per question,
   5 options plus Skip, +1 / −1 / 0. Board (prob, easy|hard|assess, 10|20).
   Games (rules and maths in odds-engine.js), scored on decisions, not luck:
   Take or Pass (take), Bank or Bust (bank), Next Card (next),
   Which Urn? (urn), Likelier? (likely).
   Registers itself with GAMES through the board/open hooks in games.js.
   =========================================================== */

'use strict';

const Odds = (() => {
  const E = OddsEngine;
  const KEY = 'pitboard-odds';
  const opts = Object.assign({ paperLevel: 'easy', paperCount: 20, nextMode: 'standard' }, store.get(KEY, {}));
  if (!['easy', 'hard', 'assess'].includes(opts.paperLevel)) opts.paperLevel = 'easy';
  if (![10, 20].includes(opts.paperCount)) opts.paperCount = 20;
  if (!['standard', 'hard'].includes(opts.nextMode)) opts.nextMode = 'standard';

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = t => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;
  const sgn = (v, dp = 2) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(dp)}`;
  const usd = (v, signed) => `${v < 0 ? '−' : signed && v > 0 ? '+' : ''}$${Math.abs(v).toFixed(2)}`;
  const pct = p => `${(p * 100).toFixed(1)}%`;
  const statGrid = rows => `<div class="stat-grid">${rows.map(([l, v, c]) => `<div><span class="stat-lbl">${l}</span><span class="stat-val ${c || ''}">${v}</span></div>`).join('')}</div>`;

  let cur = null;      // game id on the setup screen
  let run = null;      // the live game: { stop() … }

  function stopRun() { if (run) { clearInterval(run.timer); clearTimeout(run.pause); run = null; } }
  const body = () => $('odBody');
  function setHud(info, time, low) {
    if (info !== null) $('odInfo').textContent = info;
    $('odTimer').textContent = time === null ? '' : time;
    $('odTimer').classList.toggle('low', Boolean(low));
  }
  function flash(el, ok) { el.classList.remove('flash-ok', 'flash-bad'); void el.offsetWidth; el.classList.add(ok ? 'flash-ok' : 'flash-bad'); }
  // A per-decision or whole-game countdown; onEnd fires once
  function countdown(secs, onEnd, lowAt, label) {
    clearInterval(run.timer);
    const r = run, end = Date.now() + secs * 1000;
    const tick = () => {
      if (run !== r) return;
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setHud(label ? label() : null, clock(left), left <= lowAt);
      if (left <= 0) { clearInterval(r.timer); onEnd(); }
    };
    r.timer = setInterval(tick, 150);
    tick();
  }

  // ================================================================
  //  REGISTRATION
  // ================================================================
  const signedPts = s => `${Number(s) > 0 ? '+' : Number(s) < 0 ? '−' : ''}${Math.abs(Number(s))} pts`;
  const reg = (id, def) => { GAMES[id] = { section: 'odds', ...def, open: () => openSetup(id) }; };
  reg('prob', {
    sym: 'PROB', short: 'Paper', name: 'Probability Paper', color: '#8C9BFF',
    blurb: 'The serious test: 90 s a question',
    filters: [
      { key: 'difficulty', options: [['easy', 'Easy'], ['hard', 'Hard'], ['assess', 'Assessment']] },
      { key: 'rounds', options: [[10, '10 Qs'], [20, '20 Qs']] },
    ],
    fmt: signedPts,
    board: () => ({ mode: 'prob', difficulty: opts.paperLevel, rounds: opts.paperCount }),
  });
  reg('take', {
    sym: 'TAKE', short: 'Take', name: 'Take or Pass', color: '#4CAF6E',
    blurb: 'Is the price right? 60 seconds of bets',
    filters: [{ key: 'difficulty', options: [['standard', '60 s']] }],
    fmt: s => usd(Number(s), true),
    board: () => ({ mode: 'take', difficulty: 'standard', rounds: 60 }),
  });
  reg('bank', {
    sym: 'BANK', short: 'Bank', name: 'Bank or Bust', color: '#E8A33D',
    blurb: 'Roll again or bank the pot?',
    filters: [{ key: 'difficulty', options: [['standard', '10 rounds']] }],
    fmt: s => `${s} / 100`,
    board: () => ({ mode: 'bank', difficulty: 'standard', rounds: 10 }),
  });
  reg('next', {
    sym: 'NEXT', short: 'Next', name: 'Next Card', color: '#E06C75',
    blurb: 'Higher or lower, and how much?',
    filters: [{ key: 'difficulty', options: [['standard', 'With tracker'], ['hard', 'No tracker']] }],
    fmt: signedPts,
    board: () => ({ mode: 'next', difficulty: opts.nextMode, rounds: 26 }),
  });
  reg('urn', {
    sym: 'URNS', short: 'Urn', name: 'Which Urn?', color: '#5DB2FF',
    blurb: 'Pay to draw, then call the urn',
    filters: [{ key: 'difficulty', options: [['standard', '10 rounds']] }],
    fmt: s => `${s} / 100`,
    board: () => ({ mode: 'urn', difficulty: 'standard', rounds: 10 }),
  });
  reg('likely', {
    sym: 'LIKE', short: 'Likelier', name: 'Likelier?', color: '#C58BFF',
    blurb: 'Pick the more likely event, 3 lives',
    filters: [{ key: 'difficulty', options: [['standard', 'Survival']] }],
    fmt: s => `${s} solved`,
    board: () => ({ mode: 'likely', difficulty: 'standard', rounds: 0 }),
  });

  // ================================================================
  //  SETUP SCREEN
  // ================================================================
  const SETUP = {
    prob: {
      intro: 'General probability and expected value, as set in online assessments. Pick the closest answer. No calculator.',
      options: [
        { key: 'paperLevel', label: 'Difficulty', cls: 'seg-3', list: [['easy', 'Easy'], ['hard', 'Hard'], ['assess', 'Assessment']] },
        { key: 'paperCount', label: 'Questions', cls: 'seg-2 od-center', num: true, list: [[10, '10'], [20, '20']] },
      ],
      rules: ['90 seconds per question. When time runs out it moves on and scores 0.', '<b>+1</b> right, <b>−1</b> wrong, 0 skipped. Once you answer or skip you can\'t go back.', 'Assessment mixes everything together.', 'Right and wrong are only shown at the end, with the working for every question.'],
    },
    take: {
      intro: 'A stream of bets for 60 seconds. Work out what each is really worth, and take it only if the price is good.',
      rules: ['Your score is the true expected profit of every bet you take, so luck plays no part.', 'Passing a bad bet costs nothing, but taking one costs you its negative edge.', 'A streak of right calls brings harder bets.', 'Tap, swipe, or use ← pass and → take.'],
    },
    bank: {
      intro: 'Each round has a die with bust faces. Every safe roll adds to the pot. Roll again, or bank it?',
      rules: ['The die, bust faces and penalty change every round.', 'You\'re scored on each decision against the mathematically best play, not on whether you bust. Good calls score even when the dice go against you.', '10 seconds per decision; if time runs out you bank.', '10 rounds, 10 points each.'],
    },
    next: {
      intro: 'Cards come off one shuffled deck. Bet on the next card being higher or lower, and choose how much of your bankroll to risk.',
      options: [{ key: 'nextMode', label: 'Mode', cls: 'seg-2', list: [['standard', 'With tracker', 'See which ranks are left'], ['hard', 'No tracker', 'Count them yourself']] }],
      rules: ['Aces are low. Matching ranks lose the bet.', 'Bet big when the odds are heavily in your favour and small when they\'re close. Backing the wrong side, or betting big on a coin flip, costs points.', 'Your score is the expected growth of your bankroll, so a lucky card doesn\'t change it.', '10 seconds per card; if time runs out you pass.'],
    },
    urn: {
      intro: 'One of two urns has been picked in secret. Each draw shows you a ball but costs money. Call the urn when you\'re sure enough.',
      rules: ['Right call +$100, wrong call −$100. Balls go back after each draw.', 'Urn make-ups, the starting odds and the cost per draw change every round.', 'You\'re scored against the best possible policy, not on whether the call came good.', '10 rounds in 4 minutes. Rounds you don\'t reach score 0.'],
    },
    likely: {
      intro: 'Two events side by side. Tap the one that\'s more likely.',
      rules: ['Three wrong answers and you\'re out.', 'The gap between the two shrinks as you go, and so does the clock (12 s down to 5 s).', 'Each answer shows the exact chances, so you learn as you play.'],
    },
  };

  function openSetup(id) {
    cur = id;
    renderSetup();
    showScreen('odSetup');
  }

  function renderSetup() {
    const g = GAMES[cur], s = SETUP[cur];
    $('odSetupTitle').textContent = `${g.sym} · ${g.name}`;
    $('odIntro').textContent = s.intro;
    $('odOptions').innerHTML = (s.options || []).map(o => `
      <div class="field">
        <div class="field-label">${o.label}</div>
        <div class="seg ${o.cls}" data-opt="${o.key}" data-num="${o.num ? 1 : ''}">
          ${o.list.map(([v, label, sub]) => `<button data-value="${v}" class="${String(opts[o.key]) === String(v) ? 'active' : ''}">${sub ? `<strong>${label}</strong><small>${sub}</small>` : label}</button>`).join('')}
        </div>
      </div>`).join('');
    $('odRules').innerHTML = s.rules.map(r => `<li>${r}</li>`).join('');
    const best = store.get(boardBestKey(g.board()), null);
    $('odBest').textContent = best === null ? 'No runs on this setting yet' : `Your best: ${g.fmt(best)}`;
  }

  // ================================================================
  //  PROBABILITY PAPER
  // ================================================================
  const PAPER_SECS = 90;
  const RECENT = 'pitboard-prob-recent';
  const levelOf = v => ({ easy: 1, hard: 2, assess: null }[v]);

  function startPaper() {
    const recent = store.get(RECENT, []);
    const avoid = new Set(recent);
    const level = levelOf(opts.paperLevel);
    const qs = Array.from({ length: opts.paperCount }, () => {
      const q = PaperBank.make(level, avoid);
      avoid.add(q.id);
      return { ...q, given: null, ms: 0 };
    });
    store.set(RECENT, [...recent, ...qs.map(q => q.id)].slice(-(level === 1 ? 25 : 55)));
    run = { id: 'prob', qs, i: 0, level: opts.paperLevel, n: opts.paperCount, shownAt: 0, timer: null };
    showScreen('odPlay');
    showPaper();
  }

  function showPaper() {
    const r = run, q = r.qs[r.i];
    r.shownAt = performance.now();
    window.scrollTo(0, 0);
    body().innerHTML = `
      <div class="sr-progress" style="grid-template-columns:repeat(${r.n},1fr)">${r.qs.map((x, i) => `<span class="${i === r.i ? 'cur' : i < r.i ? 'done' : ''}"></span>`).join('')}</div>
      <p class="od-paper-q">${esc(q.text)}</p>
      <p class="od-paper-sub">Select the answer that is closest.</p>
      <div class="od-paper-opts">
        ${q.list.map((o, i) => `<button class="od-paper-opt" data-a="${i}">${o}</button>`).join('')}
        <button class="od-paper-opt skip" data-a="skip">Skip</button>
      </div>`;
    countdown(PAPER_SECS, () => paperAnswer(null), 10, () => `PROB · Q${r.i + 1} of ${r.n}`);
  }

  function paperAnswer(a) {
    const r = run;
    if (!r || r.id !== 'prob') return;
    const q = r.qs[r.i];
    q.ms = performance.now() - r.shownAt;
    q.given = a;
    if (r.i + 1 >= r.n) finishPaper(); else { r.i += 1; showPaper(); }
  }

  function finishPaper() {
    const r = run;
    stopRun();
    const right = r.qs.filter(q => q.given === q.answerIndex).length;
    const wrong = r.qs.filter(q => q.given !== null && q.given !== q.answerIndex).length;
    const skipped = r.n - right - wrong;
    const answered = r.qs.filter(q => q.given !== null);
    const avg = answered.length ? sum(answered.map(q => q.ms)) / answered.length / 1000 : 0;
    const items = r.qs.map((q, i) => {
      const st = q.given === null ? 'skip' : q.given === q.answerIndex ? 'ok' : 'bad';
      return `
      <li class="sr-item ${st}">
        <div class="sr-item-head"><span>Q${i + 1} · ${q.level === 1 ? 'Easy' : 'Hard'} <span class="sr-mark">${{ ok: '✓', bad: '✗', skip: '—' }[st]}</span></span><span>${(q.ms / 1000).toFixed(0)}s <span class="sr-pts">${{ ok: '+1', bad: '−1', skip: '0' }[st]}</span></span></div>
        <div class="cv-review-q">${esc(q.text)}</div>
        <div class="sr-item-ans">
          <span>You: <b class="${st === 'bad' ? 'neg' : st === 'ok' ? 'pos' : ''}">${q.given === null ? 'skipped' : q.list[q.given]}</b></span>
          <span>Closest: <b>${q.list[q.answerIndex]}</b></span>
          <span>Exact: <b>${q.exact}</b></span>
        </div>
        <small>${esc(q.how)}</small>
      </li>`;
    }).join('');
    showSummary({
      board: { mode: 'prob', difficulty: r.level, rounds: r.n },
      score: right - wrong,
      title: 'Paper done',
      again: startPaper,
      bodyHtml: `${statGrid([['Right', right, 'pos'], ['Wrong', wrong, 'neg'], ['Skipped', skipped], ['Accuracy', answered.length ? `${Math.round((100 * right) / answered.length)}%` : '—'], ['Avg / answer', answered.length ? `${avg.toFixed(0)}s` : '—'], ['Questions', r.n]])}
        <p class="note">Scoring: +1 right, −1 wrong, 0 skipped or out of time.</p>
        <h4>Every question</h4><ul class="sr-list">${items}</ul>`,
    });
  }

  // ================================================================
  //  TAKE OR PASS
  // ================================================================
  const TAKE_SECS = 60;
  function startTake() {
    run = { id: 'take', pnl: 0, streak: 0, best: 0, right: 0, wrong: 0, n: 0, bet: null, last: '', log: [], timer: null };
    showScreen('odPlay');
    body().innerHTML = `
      <div class="sr-hud"><span class="sr-prompt">Edge earned</span><b id="tkPnl">$0.00</b></div>
      <div class="od-streak" id="tkStreak"></div>
      <div class="sr-bottom od-take-area" id="tkArea">
        <div class="od-bet" id="tkBet"></div>
        <div class="od-take-btns">
          <button class="od-pass" id="tkPass">← Pass</button>
          <button class="od-takebtn" id="tkTake">Take →</button>
        </div>
      </div>
      <p class="od-last" id="tkLast"></p>`;
    nextBet();
    countdown(TAKE_SECS, finishTake, 10, () => 'TAKE · Take or Pass');
  }
  function nextBet() {
    const r = run;
    r.bet = E.takeBet(r.streak);
    $('tkBet').innerHTML = `<div class="od-bet-price">${r.bet.text}</div><div class="od-bet-desc">${esc(r.bet.desc)}</div>`;
    $('tkStreak').textContent = r.streak >= 2 ? `Streak ${r.streak}${r.bet.level > 1 ? ` · level ${r.bet.level}` : ''}` : '';
  }
  function takeAnswer(take) {
    const r = run;
    if (!r || r.id !== 'take') return;
    const b = r.bet, good = b.edge > 0, correct = take === good;
    r.n++;
    if (correct) { r.right++; r.streak++; r.best = Math.max(r.best, r.streak); } else { r.wrong++; r.streak = 0; }
    if (take) r.pnl += b.edge;
    r.log.push({ b, take, correct });
    $('tkPnl').textContent = usd(r.pnl);
    $('tkPnl').className = r.pnl > 0 ? 'pos' : r.pnl < 0 ? 'neg' : '';
    $('tkLast').innerHTML = `Worth <b>${usd(b.fair)}</b> at <b>${usd(b.cost)}</b>: ${take ? `you took it, ${usd(b.edge, true)}` : good ? 'you passed on a good bet' : 'good pass'}`;
    flash($('tkArea'), correct);
    nextBet();
  }
  function finishTake() {
    const r = run;
    stopRun();
    const misses = r.log.filter(l => !l.correct).sort((a, b) => Math.abs(b.b.edge) - Math.abs(a.b.edge)).slice(0, 8);
    showSummary({
      board: { mode: 'take', difficulty: 'standard', rounds: 60 },
      score: Math.round(r.pnl * 100) / 100,
      title: 'Time',
      again: startTake,
      bodyHtml: `${statGrid([['Bets seen', r.n], ['Right calls', r.right, 'pos'], ['Wrong calls', r.wrong, 'neg'], ['Accuracy', r.n ? `${Math.round((100 * r.right) / r.n)}%` : '—'], ['Best streak', r.best], ['Per bet', r.n ? `${(60 / r.n).toFixed(1)}s` : '—']])}
        ${misses.length ? `<h4>Your biggest misses</h4><ul class="sr-list">${misses.map(l => `
          <li class="sr-item bad"><div class="cv-review-q">${esc(l.b.desc)}</div><div class="sr-item-ans"><span>Price <b>${usd(l.b.cost)}</b></span><span>Worth <b>${usd(l.b.fair)}</b></span><span>You <b>${l.take ? 'took it' : 'passed'}</b></span></div></li>`).join('')}</ul>` : ''}`,
    });
  }

  // ================================================================
  //  BANK OR BUST
  // ================================================================
  const BANK_ROUNDS = 10, BANK_DECISION = 10;
  function startBank() {
    run = { id: 'bank', i: 0, score: 0, cash: 0, rounds: [], timer: null, r: null, pot: 0, regret: 0, decisions: 0, lastRoll: null };
    showScreen('odPlay');
    bankNewRound();
  }
  function bankNewRound() {
    const s = run;
    s.r = E.bankRound(); s.pot = s.r.start; s.regret = 0; s.decisions = 0; s.lastRoll = null;
    bankRender();
  }
  const bankInfo = () => `BANK · Round ${run.i + 1} of ${BANK_ROUNDS}`;
  function bankRender(result) {
    const s = run, r = s.r;
    body().innerHTML = `
      <div class="sr-hud"><span class="sr-prompt">Decision score</span><b>${s.score.toFixed(1)} / ${BANK_ROUNDS * 10}</b></div>
      <div class="od-panel">
        <div class="od-rule"><b>${r.d}-sided die</b> · bust on ${r.bust.join(', ')} · bust loses ${r.loss === 1 ? 'the whole pot' : 'half the pot'}</div>
        <div class="od-faces">${Array.from({ length: r.d }, (_, i) => i + 1).map(f => `<span class="${r.bust.includes(f) ? 'bust' : ''}${f === s.lastRoll ? ' hit' : ''}">${f}</span>`).join('')}</div>
      </div>
      <div class="od-pot"><span class="field-label">Pot</span><div class="od-pot-val">$${s.pot % 1 ? s.pot.toFixed(1) : s.pot}</div></div>
      ${result ? `<div class="od-result">${result}</div><button class="btn btn-primary btn-start" id="bkNext">${s.i + 1 >= BANK_ROUNDS ? 'See results' : 'Next round'}</button>` : `
      <div class="sr-bottom" id="bkArea"><div class="od-take-btns">
        <button class="od-pass" id="bkBank">Bank</button>
        <button class="od-takebtn" id="bkRoll">Roll</button>
      </div></div>`}`;
    if (!result) countdown(BANK_DECISION, () => bankDecide(false), 3, bankInfo);
    else { clearInterval(s.timer); setHud(bankInfo(), null); }
  }
  function bankDecide(roll) {
    const s = run;
    if (!s || s.id !== 'bank') return;
    const r = s.r;
    s.regret += E.bankRegret(r, s.pot, roll);
    s.decisions++;
    if (!roll) { bankEnd(false); return; }
    const f = 1 + Math.floor(Math.random() * r.d);
    s.lastRoll = f;
    if (r.bust.includes(f)) { s.pot *= 1 - r.loss; bankEnd(true); return; }
    s.pot += f;
    bankRender();
  }
  function bankEnd(busted) {
    const s = run, r = s.r;
    const pts = E.bankRoundScore(r, s.regret);
    s.score += pts; s.cash += s.pot;
    s.rounds.push({ r, pts, regret: s.regret, busted, pot: s.pot, decisions: s.decisions });
    const rule = `Best play: roll while the pot is under $${r.threshold.toFixed(1)}.`;
    bankRender(`<b class="${pts >= 9 ? 'pos' : pts < 5 ? 'neg' : ''}">${pts.toFixed(1)} / 10</b> ${busted ? 'Bust.' : 'Banked.'} ${rule}`);
  }
  function bankContinue() {
    const s = run;
    s.i++;
    if (s.i >= BANK_ROUNDS) finishBank(); else bankNewRound();
  }
  function finishBank() {
    const s = run;
    stopRun();
    showSummary({
      board: { mode: 'bank', difficulty: 'standard', rounds: 10 },
      score: Math.round(s.score),
      title: 'All rounds done',
      again: startBank,
      bodyHtml: `${statGrid([['Cash banked', `$${s.cash.toFixed(0)}`], ['Busts', s.rounds.filter(x => x.busted).length], ['Perfect rounds', s.rounds.filter(x => x.pts >= 9.95).length, 'pos']])}
        <p class="note">Your score ignores the cash. It measures every roll-or-bank call against the best possible play.</p>
        <h4>Round by round</h4>
        <div class="table-wrap"><table class="book-table"><thead><tr><th>Die</th><th>Bust</th><th>Stop at</th><th>Score</th></tr></thead><tbody>${s.rounds.map(x => `<tr><td>d${x.r.d}</td><td>${x.r.bust.join(', ')}${x.r.loss < 1 ? ' (half)' : ''}</td><td>$${x.r.threshold.toFixed(1)}</td><td>${x.pts.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>
        <p class="note">Rule of thumb: keep rolling while the expected gain beats the expected loss. Stop at (sum of safe faces) ÷ (bust faces × share lost).</p>`,
    });
  }

  // ================================================================
  //  NEXT CARD
  // ================================================================
  const NEXT_CARDS = 26, NEXT_SECS = 10;
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♥', '♦', '♣', '♠'];
  const cardHtml = (c, cls = '') => `<div class="od-card ${E.suit(c) < 2 ? 'red' : ''} ${cls}"><span>${RANKS[E.rank(c)]}</span><span>${SUITS[E.suit(c)]}</span></div>`;

  function startNext() {
    run = { id: 'next', mode: opts.nextMode, deck: E.shuffledDeck(NEXT_CARDS), i: 0, pts: 0, best: 0, bank: 1000, log: [], last: '', timer: null };
    showScreen('odPlay');
    nextRender();
  }
  const nextInfo = () => `NEXT · Card ${run.i + 1} of ${NEXT_CARDS - 1}`;
  function nextRender() {
    const s = run;
    const seen = s.deck.slice(0, s.i + 1), left = Array(13).fill(4);
    seen.forEach(c => { left[E.rank(c)]--; });
    s.odds = E.nextOdds(seen, s.deck[s.i]);
    const sizeBtns = side => E.SIZES.map(f => `<button class="od-size" data-side="${side}" data-f="${f}">${Math.round(f * 100)}%</button>`).join('');
    body().innerHTML = `
      <div class="sr-hud"><span class="sr-prompt">Score <b>${sgn(s.pts, 0)}</b></span><span class="score-label">Bankroll <b>$${Math.round(s.bank).toLocaleString('en-US')}</b></span></div>
      <div class="od-card-row">${cardHtml(s.deck[s.i])}<div class="od-card-meta"><b>${s.odds.total}</b> cards left unseen<br><small>Aces low · ties lose</small></div></div>
      ${s.mode === 'standard' ? `<div class="od-tracker">${RANKS.map((r, i) => `<span class="${left[i] ? '' : 'none'}"><b>${r}</b>${left[i]}</span>`).join('')}</div>` : ''}
      <div class="sr-bottom" id="nxArea">
        <div class="od-bet-row"><span>Higher</span>${sizeBtns('higher')}</div>
        <div class="od-bet-row"><span>Lower</span>${sizeBtns('lower')}</div>
        <button class="btn btn-ghost" id="nxPass">Pass</button>
      </div>
      <p class="od-last">${s.last}</p>`;
    countdown(NEXT_SECS, () => nextChoose(null, 0), 3, nextInfo);
  }
  function nextChoose(side, f) {
    const s = run;
    if (!s || s.id !== 'next') return;
    const o = s.odds, b = E.nextBest(o), pts = side ? E.nextPoints(o, side, f) : 0;
    const card = s.deck[s.i + 1], cur1 = E.rank(s.deck[s.i]), nx = E.rank(card);
    const won = side && (side === 'higher' ? nx > cur1 : nx < cur1);
    if (side) s.bank *= won ? 1 + f : 1 - f;
    s.pts += pts; s.best += b.pts;
    s.log.push({ card: s.deck[s.i], next: card, side, f, pts, best: b, odds: o });
    s.last = `Next was <b>${RANKS[nx]}${SUITS[E.suit(card)]}</b>. ${side ? `${won ? 'Won' : 'Lost'}, with a ${pct(side === 'higher' ? o.higher : o.lower)} chance.` : `Passed. Higher ${pct(o.higher)}, lower ${pct(o.lower)}.`}`;
    s.i++;
    if (s.i >= NEXT_CARDS - 1) finishNext(); else nextRender();
  }
  function finishNext() {
    const s = run;
    stopRun();
    const lbl = l => (l.side ? `${l.side === 'higher' ? 'Higher' : 'Lower'} ${Math.round(l.f * 100)}%` : 'Pass');
    const worst = [...s.log].sort((a, b) => (b.best.pts - b.pts) - (a.best.pts - a.pts)).slice(0, 6);
    showSummary({
      board: { mode: 'next', difficulty: s.mode, rounds: 26 },
      score: Math.round(s.pts),
      title: 'Deck done',
      again: startNext,
      bodyHtml: `${statGrid([['Your score', sgn(s.pts, 0), s.pts >= 0 ? 'pos' : 'neg'], ['Best possible', sgn(s.best, 0)], ['Bankroll', `$${Math.round(s.bank).toLocaleString('en-US')}`]])}
        <p class="note">The bankroll depends on luck, the score doesn't: it's the expected growth from each bet.</p>
        <h4>Costliest calls</h4>
        <div class="table-wrap"><table class="book-table"><thead><tr><th>Card</th><th>You</th><th>Best</th><th>Odds H / L</th></tr></thead><tbody>${worst.map(l => `<tr><td>${RANKS[E.rank(l.card)]}${SUITS[E.suit(l.card)]}</td><td>${lbl(l)}</td><td>${l.best.side ? `${l.best.side === 'higher' ? 'Higher' : 'Lower'} ${Math.round(l.best.f * 100)}%` : 'Pass'}</td><td>${Math.round(l.odds.higher * 100)} / ${Math.round(l.odds.lower * 100)}</td></tr>`).join('')}</tbody></table></div>`,
    });
  }

  // ================================================================
  //  WHICH URN?
  // ================================================================
  const URN_ROUNDS = 10, URN_SECS = 240;
  function startUrn() {
    run = { id: 'urn', i: 0, score: 0, cash: 0, rounds: [], timer: null, r: null, n: 0, m: 0, regret: 0, seq: [] };
    showScreen('odPlay');
    urnNew();
    countdown(URN_SECS, finishUrn, 20, () => `URNS · Round ${Math.min(run.i + 1, URN_ROUNDS)} of ${URN_ROUNDS}`);
  }
  function urnNew() {
    const s = run;
    s.r = E.urnRound(); s.n = 0; s.m = 0; s.regret = 0; s.seq = [];
    urnRender();
  }
  const urnBox = (name, p) => {
    const reds = Math.round(p * E.URN_N);
    return `<div class="od-urn"><b>Urn ${name}</b><div class="od-balls">${Array.from({ length: E.URN_N }, (_, i) => `<i class="${i < reds ? 'r' : 'b'}">${i < reds ? 'R' : 'B'}</i>`).join('')}</div></div>`;
  };
  function urnRender(result) {
    const s = run, r = s.r, cap = s.n + s.m >= E.URN_MAX;
    body().innerHTML = `
      <div class="sr-hud"><span class="sr-prompt">Decision score</span><b>${s.score.toFixed(1)} / ${URN_ROUNDS * 10}</b></div>
      <div class="od-urns">${urnBox('A', r.pA)}${urnBox('B', r.pB)}</div>
      <div class="od-rule">Starting odds: <b>A ${Math.round(r.prior * 100)}%</b> · <b>B ${Math.round((1 - r.prior) * 100)}%</b> · each draw costs <b>$${r.cost}</b></div>
      <div class="od-drawn"><span class="field-label">Drawn</span><div class="od-balls">${s.seq.map(c => `<i class="${c}">${c.toUpperCase()}</i>`).join('') || '<small class="dim">Nothing yet</small>'}</div></div>
      ${result ? `<div class="od-result">${result}</div><button class="btn btn-primary btn-start" id="unNext">${s.i + 1 >= URN_ROUNDS ? 'See results' : 'Next round'}</button>` : `
      <div class="sr-bottom"><button class="btn btn-ghost" id="unDraw" ${cap ? 'disabled' : ''}>${cap ? 'No draws left' : `Draw a ball (−$${r.cost})`}</button>
      <div class="od-take-btns"><button class="od-pass" id="unA">It's A</button><button class="od-pass" id="unB">It's B</button></div></div>`}`;
  }
  function urnDraw() {
    const s = run;
    if (!s || s.id !== 'urn' || s.n + s.m >= E.URN_MAX) return;
    s.regret += E.urnRegret(s.r, s.n, s.m, 'draw');
    const red = Math.random() < (s.r.truthA ? s.r.pA : s.r.pB);
    if (red) s.n++; else s.m++;
    s.seq.push(red ? 'r' : 'b');
    s.cash -= s.r.cost;
    urnRender();
  }
  function urnCall(side) {
    const s = run;
    if (!s || s.id !== 'urn') return;
    const r = s.r, post = r.post(s.n, s.m);
    s.regret += E.urnRegret(r, s.n, s.m, side);
    const pts = E.urnRoundScore(s.regret);
    const right = (side === 'A') === r.truthA;
    s.cash += right ? E.URN_WIN : -E.URN_WIN;
    s.score += pts;
    s.rounds.push({ r, pts, right, draws: s.n + s.m, post, side });
    urnRender(`<b class="${pts >= 9 ? 'pos' : pts < 5 ? 'neg' : ''}">${pts.toFixed(1)} / 10</b> It was urn ${r.truthA ? 'A' : 'B'}. At the end, the true odds of A were ${pct(post)}.`);
  }
  function urnContinue() {
    const s = run;
    s.i++;
    if (s.i >= URN_ROUNDS) finishUrn(); else urnNew();
  }
  function finishUrn() {
    const s = run;
    if (!s) return;
    stopRun();
    showSummary({
      board: { mode: 'urn', difficulty: 'standard', rounds: 10 },
      score: Math.round(s.score),
      title: s.rounds.length < URN_ROUNDS ? 'Time called' : 'All rounds done',
      again: startUrn,
      bodyHtml: `${statGrid([['Cash', `${s.cash < 0 ? '−' : '+'}$${Math.abs(s.cash)}`, s.cash >= 0 ? 'pos' : 'neg'], ['Right calls', `${s.rounds.filter(x => x.right).length} / ${s.rounds.length}`], ['Avg draws', s.rounds.length ? (sum(s.rounds.map(x => x.draws)) / s.rounds.length).toFixed(1) : '—']])}
        <p class="note">Your score ignores the cash. It compares every draw and call with the best possible policy.</p>
        <h4>Round by round</h4>
        <div class="table-wrap"><table class="book-table"><thead><tr><th>Red A / B</th><th>Draws</th><th>Called</th><th>Odds of that</th><th>Score</th></tr></thead><tbody>${s.rounds.map(x => `<tr><td>${Math.round(x.r.pA * 10)} / ${Math.round(x.r.pB * 10)}</td><td>${x.draws}</td><td>${x.side}</td><td>${pct(x.side === 'A' ? x.post : 1 - x.post)}</td><td>${x.pts.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>
        <p class="note">Each red or blue ball multiplies the odds of A by how much likelier that colour is under A than under B.</p>`,
    });
  }

  // ================================================================
  //  LIKELIER?
  // ================================================================
  const LIVES = 3, LIKELY_PAUSE = 900;
  function startLikely() {
    run = { id: 'likely', solved: 0, lives: LIVES, pair: null, locked: false, misses: [], timer: null, pause: null };
    showScreen('odPlay');
    likelyNext();
  }
  function likelyNext() {
    const s = run;
    s.pair = E.likelyPair(s.solved);
    s.locked = false;
    body().innerHTML = `
      <div class="sr-hud"><span class="sr-prompt">Solved <b>${s.solved}</b></span><span class="od-lives">${'♥'.repeat(s.lives)}<span class="dim">${'♥'.repeat(LIVES - s.lives)}</span></span></div>
      <p class="od-paper-sub">Which is more likely?</p>
      <div class="sr-bottom od-like" id="lkArea">
        ${s.pair.map((e, i) => `<button class="od-like-opt" data-i="${i}"><span>${esc(e.text)}</span><small></small></button>`).join('')}
      </div>`;
    countdown(E.likelySeconds(s.solved), () => likelyPick(null), 2, () => 'LIKE · Likelier?');
  }
  function likelyPick(i) {
    const s = run;
    if (!s || s.id !== 'likely' || s.locked) return;
    s.locked = true;
    clearInterval(s.timer);
    const [a, b] = s.pair, bestI = a.p > b.p ? 0 : 1, ok = i === bestI;
    if (ok) s.solved++; else { s.lives--; s.misses.push({ a, b, pick: i }); }
    const btns = body().querySelectorAll('.od-like-opt');
    btns.forEach((el, x) => {
      el.classList.add(x === bestI ? 'best' : 'other');
      el.querySelector('small').textContent = pct(s.pair[x].p);
    });
    flash($('lkArea'), ok);
    s.pause = setTimeout(() => { if (run !== s) return; if (s.lives <= 0) finishLikely(); else likelyNext(); }, LIKELY_PAUSE);
  }
  function finishLikely() {
    const s = run;
    stopRun();
    showSummary({
      board: { mode: 'likely', difficulty: 'standard', rounds: 0 },
      score: s.solved,
      title: 'Out of lives',
      again: startLikely,
      bodyHtml: `${statGrid([['Solved', s.solved, 'pos'], ['Lives lost', LIVES], ['Level reached', E.likelyTier(s.solved) + 1]])}
        <h4>What caught you out</h4><ul class="sr-list">${s.misses.map(m => `
          <li class="sr-item bad"><div class="sr-item-ans"><span>${esc(m.a.text)}: <b>${pct(m.a.p)}</b></span></div><div class="sr-item-ans"><span>${esc(m.b.text)}: <b>${pct(m.b.p)}</b></span></div></li>`).join('')}</ul>`,
    });
  }

  // ================================================================
  //  EVENTS
  // ================================================================
  const STARTERS = { prob: startPaper, take: startTake, bank: startBank, next: startNext, urn: startUrn, likely: startLikely };

  $('odBack').addEventListener('click', goHome);
  $('odStart').addEventListener('click', () => { stopRun(); STARTERS[cur](); });
  $('odLeaders').addEventListener('click', () => openLeadersFor(GAMES[cur].board()));
  $('odOptions').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    const seg = b.closest('.seg');
    opts[seg.dataset.opt] = seg.dataset.num ? Number(b.dataset.value) : b.dataset.value;
    store.set(KEY, opts);
    renderSetup();
  });
  $('odQuit').addEventListener('click', () => {
    if (run && !confirm('Quit this run?')) return;
    stopRun();
    renderSetup();
    showScreen('odSetup');
  });
  $('oddsLeadersBtn').addEventListener('click', () => {
    const g = GAMES[settings.lastGame];
    openLeadersFor(currentBoard(g && g.section === 'odds' ? settings.lastGame : 'prob'));
  });

  body().addEventListener('click', e => {
    if (!run) return;
    const t = e.target.closest('button');
    if (!t) return;
    if (run.id === 'prob' && t.dataset.a !== undefined) paperAnswer(t.dataset.a === 'skip' ? null : Number(t.dataset.a));
    else if (t.id === 'tkPass') takeAnswer(false);
    else if (t.id === 'tkTake') takeAnswer(true);
    else if (t.id === 'bkBank') bankDecide(false);
    else if (t.id === 'bkRoll') bankDecide(true);
    else if (t.id === 'bkNext') bankContinue();
    else if (t.dataset.side) nextChoose(t.dataset.side, Number(t.dataset.f));
    else if (t.id === 'nxPass') nextChoose(null, 0);
    else if (t.id === 'unDraw') urnDraw();
    else if (t.id === 'unA') urnCall('A');
    else if (t.id === 'unB') urnCall('B');
    else if (t.id === 'unNext') urnContinue();
    else if (run.id === 'likely' && t.dataset.i !== undefined) likelyPick(Number(t.dataset.i));
  });

  // Swipe for Take or Pass
  let touchX = null;
  body().addEventListener('touchstart', e => { if (run && run.id === 'take') touchX = e.changedTouches[0].clientX; }, { passive: true });
  body().addEventListener('touchend', e => {
    if (!run || run.id !== 'take' || touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) takeAnswer(dx > 0);
  }, { passive: true });

  document.addEventListener('keydown', e => {
    if (!run || $('odPlay').hidden) return;
    let used = true;
    if (run.id === 'take' && e.key === 'ArrowLeft') takeAnswer(false);
    else if (run.id === 'take' && e.key === 'ArrowRight') takeAnswer(true);
    else if (run.id === 'prob' && /^[1-5]$/.test(e.key)) paperAnswer(Number(e.key) - 1);
    else if (run.id === 'likely' && (e.key === 'ArrowLeft' || e.key === '1')) likelyPick(0);
    else if (run.id === 'likely' && (e.key === 'ArrowRight' || e.key === '2')) likelyPick(1);
    else used = false;
    if (used) e.preventDefault();
  });

  renderLobby();

  return {};
})();
