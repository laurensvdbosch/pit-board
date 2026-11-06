/* ===========================================================
   PIT BOARD — poker puzzles
   ---------------------------------------------------------
   ODDS  Outs & odds: opponent's hand face up; count outs, pick
         your chance to win, then call or fold an all-in. Exact
         answers from the engine. 3-minute clock.
   SHOW  Read the showdown: 2–3 hands on a full board, who wins
         (or split)? Mostly close ones. 90-second sprint.
   SPOT  Best action: opening-chart and all-in spots (poker-spots.js).
   READ  Read the opponent: a bot's betting line, its most likely
         hand class (poker-spots.js). 10 per session.
   +1 right, −1 wrong. Correct answers earn chips for the poker
   bankroll; wrong answers never cost chips.
   =========================================================== */

'use strict';

const PokerPuzzles = (() => {
  const MODES = {
    pkodds: { title: 'Outs & odds', seconds: 180, chips: 15,
      intro: 'You see the opponent\'s cards, like poker on TV. For each hand: how many outs do you have, what\'s your chance to win, and is the all-in a call or a fold?',
      rules: ['Outs are the cards that put you ahead on the next card.', 'Rule of thumb: outs × 4 on the flop (two cards to come), outs × 2 on the turn.', 'Call when your chance to win is bigger than the share of the final pot you pay.'] },
    pkshow: { title: 'Read the showdown', seconds: 90, chips: 10,
      intro: 'Two or three hands on a finished board. Who wins — or is it a split? Most are close: same hand type, kickers, the board playing.',
      rules: ['Each player uses the best five of their seven cards.', 'Same hand type? Compare the next-highest cards (kickers).', 'If the board itself is the best hand, everyone still in splits.'] },
    pkspot: { title: 'Best action', count: 10, chips: 40, bank: () => SPOT_BANK,
      intro: 'Real decisions: opening a hand from your seat, or facing an all-in where the bot\'s style tells you its range. Fold, call or raise?',
      rules: ['First in? Raise or fold — your seat decides how wide.', 'Facing an all-in: compare your chance to win against that player\'s range with the pot odds.', 'Every spot shows the numbers behind the answer.'] },
    pkread: { title: 'Read the opponent', count: 10, chips: 40, bank: () => READ_BANK,
      intro: 'A bot bets its way through a hand. From its style and its line, what is it most likely holding?',
      rules: ['Answers come from replaying the app\'s own bots thousands of times with every possible hand.', 'Tight players bet big hands; aggressive ones bet a lot of air too.', 'After each answer you see the full breakdown — and what the bot really had.'] },
  };
  const NAMES = ['Dusty', 'Marge', 'Big Earl', 'Lucky Lou', 'Rosa', 'Slim', 'Duke', 'Ivy', 'The Prof', 'Nina', 'Tex', 'Pearl'];
  const LINE_WORDS = { raise: 'raised', limp: 'limped', bet: 'bet', check: 'checked', call: 'called' };

  let s = null;   // the current session
  let mode = 'pkodds';

  const board = m => ({ mode: m, difficulty: 'standard', rounds: MODES[m].seconds || MODES[m].count });
  const clock = t => `${Math.floor(t / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;
  const cards = list => list.map(c => PokerUI.card(typeof c === 'string' ? Poker.parseCard(c) : c)).join('');
  const pct = x => Math.round(x * 100);

  // -------------------- SCENE PIECES --------------------
  const boardRow = list => `<div class="pz-board">${cards(list)}${Array.from({ length: 5 - list.length }, () => PokerUI.card(null)).join('')}</div>`;
  const handRow = (who, list, note = '', cls = '') =>
    `<div class="pz-hand ${cls}"><span class="pz-who">${who}</span><span class="pz-cards">${cards(list)}</span>${note ? `<span class="pz-note">${note}</span>` : ''}</div>`;
  const describe = list => Poker.describe(Poker.evaluate(list));

  // -------------------- ODDS: generated live --------------------
  // Outs (cards that put you ahead next card) and exact equity to the river
  function analyzeOdds(hero, vil, brd, name) {
    const used = new Set([...hero, ...vil, ...brd]);
    const rest = [];
    for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
    const outs = rest.filter(c => Poker.evaluate([...hero, ...brd, c]) > Poker.evaluate([...vil, ...brd, c]));
    let won = 0, n = 0;
    const tally = run => { const h = Poker.evaluate([...hero, ...brd, ...run]), v = Poker.evaluate([...vil, ...brd, ...run]); won += h > v ? 1 : h === v ? 0.5 : 0; n++; };
    const turn = brd.length === 4;
    if (turn) rest.forEach(c => tally([c]));
    else for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) tally([rest[i], rest[j]]);
    return { hero, vil, brd, turn, outs, eq: won / n, name };
  }

  function oddsHand() {
    for (let tries = 0; tries < 400; tries++) {
      const d = Poker.shuffledDeck();
      const hero = d.slice(0, 2), vil = d.slice(2, 4);
      const brd = d.slice(4, Math.random() < 0.3 ? 8 : 7);
      if (Poker.evaluate([...hero, ...brd]) >= Poker.evaluate([...vil, ...brd])) continue;   // you must be behind
      const h = analyzeOdds(hero, vil, brd, pick(NAMES));
      if (h.outs.length < 3 || h.outs.length > 15) continue;
      return h;
    }
    return null;
  }

  function oddsQuestions(h = oddsHand()) {
    const o = h.outs.length;
    const scene = extra => `
      ${boardRow(h.brd)}
      ${handRow(h.name, h.vil, describe([...h.vil, ...h.brd]), 'vil')}
      ${handRow('You', h.hero, describe([...h.hero, ...h.brd]), 'me')}
      ${extra || ''}`;
    // Q1: outs
    const outOpts = shuffle([2, 3, 4, -2, -3].map(dx => o + dx).filter(v => v >= 1)).slice(0, 3).concat(o).sort((a, b) => a - b);
    const ruleMult = h.turn ? 2 : 4;
    const q1 = {
      scene: scene(), prompt: `You're behind. How many outs do you have — cards that put you ahead on the ${h.turn ? 'river' : 'turn'}?`,
      options: outOpts.map(String), answer: outOpts.indexOf(o),
      explain: `<b>${o} outs:</b><div class="pz-outs">${cards(h.outs)}</div>`,
    };
    // Q2: chance to win by the river
    const e = pct(h.eq);
    const spread = shuffle([-20, -10, 10, 20, 30, -30]).map(dx => e + dx).filter(v => v >= 1 && v <= 99);
    const eqOpts = [e, ...spread.slice(0, 3)].sort((a, b) => a - b);
    const q2 = {
      scene: scene(), prompt: `What's your chance to win by the river (${h.turn ? 'one card' : 'two cards'} to come)?`,
      options: eqOpts.map(v => `${v}%`), answer: eqOpts.indexOf(e),
      explain: `Rule of ${ruleMult}: ${o} outs × ${ruleMult} ≈ <b>${Math.min(99, o * ruleMult)}%</b>. Exact chance, counting every run-out and ${h.name} improving too: <b>${e}%</b>.`,
    };
    // Q3: call or fold an all-in priced near the equity, but not too close
    let needed;
    for (let k = 0; k < 20; k++) {
      needed = h.eq + (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.15);
      if (needed > 0.08 && needed < 0.45) break;
    }
    needed = Math.min(0.45, Math.max(0.08, needed));
    const pot = Math.round((60 + Math.random() * 240) / 10) * 10;
    const bet = Math.max(10, Math.round((needed * pot) / (1 - 2 * needed) / 5) * 5);
    const real = bet / (pot + 2 * bet);
    const call = h.eq > real;
    const q3 = {
      scene: scene(`<div class="pz-pot">Pot ${pot} · ${h.name} all-in ${bet}</div>`),
      prompt: `${h.name} moves all-in for ${bet} into a pot of ${pot}. Call or fold?`,
      options: ['Fold', `Call ${bet}`], answer: call ? 1 : 0,
      explain: `You pay ${bet} to win ${pot + bet}: you need <b>${pct(real)}%</b>. You win <b>${e}%</b> of the time → ${call ? '<b>call</b>, it pays over time' : '<b>fold</b>, the price is too high'}.`,
    };
    if (Math.abs(h.eq - real) < 0.04) return [q1, q2];   // rounding pushed it too close: skip the call question
    return [q1, q2, q3];
  }

  // -------------------- SHOW: generated live --------------------
  function showFrom(names, hands, brd) {
    const n = names.length;
    const scores = hands.map(h => Poker.evaluate([...h, ...brd]));
    const best = Math.max(...scores);
    const winners = scores.map((sc, i) => (sc === best ? i : -1)).filter(i => i >= 0);
    return {
      scene: `${boardRow(brd)}${names.map((nm, i) => handRow(nm, hands[i])).join('')}`,
      prompt: 'Who wins this pot?',
      options: [...names, 'Split pot'], answer: winners.length > 1 ? n : winners[0],
      explain: names.map((nm, i) => `<div class="${winners.includes(i) ? 'pz-win' : ''}">${nm}: ${Poker.describe(scores[i])}${winners.includes(i) ? (winners.length > 1 ? ' — split' : ' — wins') : ''}</div>`).join(''),
    };
  }

  function showQuestion() {
    for (let tries = 0; tries < 400; tries++) {
      const n = Math.random() < 0.55 ? 2 : 3;
      const d = Poker.shuffledDeck();
      const names = shuffle(NAMES).slice(0, n);
      const hands = names.map((_, i) => d.slice(i * 2, i * 2 + 2));
      const brd = d.slice(n * 2, n * 2 + 5);
      const scores = hands.map(h => Poker.evaluate([...h, ...brd]));
      const best = Math.max(...scores);
      const winners = scores.map((sc, i) => (sc === best ? i : -1)).filter(i => i >= 0);
      const sorted = [...scores].sort((a, b) => b - a);
      const close = Poker.categoryOf(sorted[0]) === Poker.categoryOf(sorted[1]);
      if (!close && Math.random() < 0.75) continue;
      return showFrom(names, hands, brd);
    }
    return null;
  }

  // -------------------- GUIDED EXAMPLES --------------------
  const P = list => list.map(Poker.parseCard);
  function examples(m) {
    if (m === 'pkodds') {
      const qs = oddsQuestions(analyzeOdds(P(['9h', '8h']), P(['As', 'Ad']), P(['7h', '6c', '2h']), 'Dusty'));
      const coachTexts = [
        'Outs are the cards that put you ahead on the very next card. Here: any of the 9 hearts left gives you a flush, and any 5 or 10 gives you a straight. The 5♥ and 10♥ are already counted with the hearts, so add 3 + 3: <b>9 + 6 = 15 outs</b>.',
        'Rule of 4 on the flop: 15 × 4 = 60%. That\'s a quick estimate — pick the option closest to it. (Very big draws come out a bit lower than the rule says.)',
        'The price of calling is <b>their bet ÷ (pot + their bet + your call)</b>. Compare it with your chance to win: if your chance is bigger, call.',
      ];
      return qs.map((q, i) => ({ ...q, coach: coachTexts[i] }));
    }
    if (m === 'pkshow') {
      const q = showFrom(['Dusty', 'Rosa'], [P(['Ac', '7d']), P(['Qd', 'Jc'])], P(['Ks', 'Kh', '9d', '5c', '2s']));
      return [{ ...q, coach: 'Both players have a <b>pair of kings</b> — from the board. When the hand type is the same, compare the next-highest cards, the <b>kickers</b>: Dusty\'s ace beats Rosa\'s queen. Only if all five cards tie is it a split.' }];
    }
    if (m === 'pkspot') {
      const open = SPOT_BANK.find(sp => sp.kind === 'open' && sp.answer !== 'Fold');
      const allin = SPOT_BANK.find(sp => sp.kind === 'allin' && sp.answer !== 'Fold');
      return [
        { ...spotQuestion(open), coach: 'Nobody has bet yet. Ask: <b>where am I sitting</b> (more players behind you = play fewer hands) and <b>is my hand good enough for that seat</b>? First in, the choice is raise or fold — just calling is rarely right.' },
        { ...spotQuestion(allin), coach: 'Facing an all-in, work in three steps: <b>1.</b> the price: bet ÷ (pot + bet + your call). <b>2.</b> the bot\'s style tells you which hands it shoves. <b>3.</b> estimate your chance against those hands and compare with the price.' },
      ];
    }
    const rd = READ_BANK.find(r => Math.max(...r.probs) >= 60) || READ_BANK[0];
    return [{ ...readQuestion(rd), coach: 'Start with the <b>style</b> on the badge, then read the line: every bet from a tight bot means strength; aggressive and loose bots bet plenty of weak hands too. Checking usually means weak or medium.' }];
  }
  const exampleSeen = m => store.get(`pitboard-example-${m}`, false);

  // -------------------- SPOT & READ: from the bank --------------------
  function spotQuestion(sp) {
    if (sp.kind === 'open') {
      return {
        scene: `<div class="pz-seatline"><span class="badge" style="--c:#E8A33D">${sp.pos}</span> 6-max · 100 big blinds · folded to you</div>${handRow('You', sp.hole, Poker.describeHole(sp.hole.map(Poker.parseCard)), 'me')}`,
        prompt: sp.q, options: sp.options, answer: sp.options.indexOf(sp.answer), explain: sp.explain,
      };
    }
    return {
      scene: `${boardRow(sp.board)}<div class="pz-pot">Pot ${sp.pot} · ${sp.villain} (${sp.style}) all-in ${sp.bet}</div>${handRow('You', sp.hole, describe([...sp.hole, ...sp.board].map(Poker.parseCard)), 'me')}`,
      prompt: sp.q, options: sp.options, answer: sp.options.indexOf(sp.answer), explain: sp.explain,
    };
  }

  function readQuestion(rd) {
    const line = rd.line.map(([street, t]) => `<li><span>${street[0].toUpperCase() + street.slice(1)}</span>${rd.villain} ${LINE_WORDS[t] || t}</li>`).join('');
    const bars = rd.options.map((o, i) => `<div class="pz-bar${o === rd.answer ? ' top' : ''}"><span>${o}</span><i style="width:${rd.probs[i]}%"></i><b>${rd.probs[i]}%</b></div>`).join('');
    return {
      scene: `${boardRow(rd.board)}<div class="pz-seatline"><span class="badge" style="--c:#C58BFF">${rd.style}</span> ${rd.villain} on the button · you check and call</div><ul class="pz-line">${line}</ul>${handRow('You', rd.hole, '', 'me')}`,
      prompt: `What is ${rd.villain} most likely holding?`,
      options: rd.options, answer: rd.options.indexOf(rd.answer),
      explain: `When this bot plays exactly like this, it holds:${bars}<div class="pz-actual">This time ${rd.villain} had ${cards(rd.actualHole)} — ${rd.actual.toLowerCase()}.</div>`,
    };
  }

  // Draw a session from a bank, preferring entries this device hasn't seen recently
  function drawFromBank(m) {
    const key = `pitboard-${m}-recent`;
    const bank = MODES[m].bank();
    const recent = new Set(store.get(key, []));
    const ids = shuffle(bank.map((_, i) => i));
    const set = [...ids.filter(i => !recent.has(i)), ...ids.filter(i => recent.has(i))].slice(0, MODES[m].count);
    store.set(key, [...recent, ...set].slice(-Math.floor(bank.length * 0.7)));
    return set.map(i => (m === 'pkspot' ? spotQuestion(bank[i]) : readQuestion(bank[i])));
  }

  // -------------------- SETUP --------------------
  function openSetup(m) {
    mode = m;
    const cfg = MODES[m], g = GAMES[m];
    $('pzTitle').textContent = `${g.sym} · ${cfg.title}`;
    $('pzIntro').textContent = cfg.intro;
    $('pzRules').innerHTML = cfg.rules.map(r => `<li>${r}</li>`).join('')
      + `<li>${cfg.seconds ? `${cfg.seconds >= 120 ? `${cfg.seconds / 60} minutes` : `${cfg.seconds} seconds`} on the clock` : `${cfg.count} questions`}. +1 right, −1 wrong — guessing doesn't pay.</li>`
      + `<li>Every correct answer earns <b>${cfg.chips} chips</b> for your poker bankroll. Wrong answers never cost chips.</li>`;
    const best = store.get(boardBestKey(board(m)), null);
    $('pzBest').textContent = best === null ? 'No sessions yet' : `Your best: ${fmtScore(m, best)}`;
    $('pzStart').textContent = exampleSeen(m) ? 'Start' : 'Start (with a quick example first)';
    settings.lastGame = m;
    saveSettings();
    showScreen('pzSetup');
  }

  // -------------------- RUN --------------------
  function stop() {
    if (!s) return;
    clearInterval(s.clock);
    clearTimeout(s.auto);
    s = null;
  }

  function start() {
    if (!exampleSeen(mode)) { startExample(); return; }   // first time: walk through an example
    stop();
    const cfg = MODES[mode];
    s = { mode, cfg, queue: [], done: 0, right: 0, wrong: 0, timeLeft: cfg.seconds || 0, paused: false, clock: null, auto: null, busy: false, log: [] };
    if (!cfg.seconds) s.queue = drawFromBank(mode);
    showScreen('pzPlay');
    if (cfg.seconds) s.clock = setInterval(tick, 1000);
    next();
  }

  // A guided, unscored walkthrough with coach notes
  function startExample() {
    stop();
    const qs = examples(mode);
    s = { mode, cfg: { ...MODES[mode], seconds: 0, count: qs.length }, example: true, queue: qs, done: 0, right: 0, wrong: 0, timeLeft: 0, paused: false, clock: null, auto: null, busy: false, log: [] };
    showScreen('pzPlay');
    next();
  }

  function tick() {
    if (s.paused) return;
    s.timeLeft -= 1;
    hud();
    if (s.timeLeft <= 0) finish();
  }

  function refill() {
    if (s.queue.length) return;
    if (mode === 'pkodds') s.queue.push(...oddsQuestions());
    else if (mode === 'pkshow') s.queue.push(showQuestion());
  }

  function hud() {
    const cfg = s.cfg;
    $('pzInfo').textContent = s.example ? `${GAMES[mode].sym} · Example` : `${GAMES[mode].sym} · ${cfg.title}`;
    $('pzClock').textContent = cfg.seconds ? clock(s.timeLeft) : `${Math.min(s.done + 1, cfg.count)}/${cfg.count}`;
    $('pzClock').classList.toggle('low', !!cfg.seconds && s.timeLeft <= 10);
    const score = s.right - s.wrong;
    $('pzScore').textContent = `${score > 0 ? '+' : ''}${score}`;
    $('pzScore').className = pnlClass(score);
  }

  function next() {
    if (!s) return;
    if (!s.cfg.seconds && s.done >= s.cfg.count) { finish(); return; }
    refill();
    s.cur = s.queue.shift();
    s.busy = false;
    s.paused = false;
    $('pzScene').innerHTML = s.cur.scene;
    $('pzCoach').hidden = !s.cur.coach;
    $('pzCoach').innerHTML = s.cur.coach ? `<b>🎓 How to think about it</b><br>${s.cur.coach}` : '';
    $('pzPrompt').textContent = s.cur.prompt;
    $('pzOptions').innerHTML = s.cur.options.map((o, i) => `<button class="pz-opt" data-i="${i}">${o}</button>`).join('');
    $('pzOptions').classList.toggle('two', s.cur.options.length <= 3);
    $('pzExplain').hidden = true;
    hud();
  }

  function choose(i) {
    if (!s || s.busy) return;
    s.busy = true;
    const ok = i === s.cur.answer;
    if (ok) s.right++; else s.wrong++;
    s.done++;
    s.log.push({ prompt: s.cur.prompt, ok, given: s.cur.options[i], answer: s.cur.options[s.cur.answer] });
    const opts = $('pzOptions').children;
    opts[s.cur.answer].classList.add('ok');
    if (!ok) opts[i].classList.add('bad');
    const bottom = $('pzBottom');
    bottom.classList.remove('flash-ok', 'flash-bad');
    void bottom.offsetWidth;
    bottom.classList.add(ok ? 'flash-ok' : 'flash-bad');
    hud();
    // Timed modes keep moving after a right answer; anything else stops to explain (clock paused)
    if (ok && s.cfg.seconds && !s.example) {
      s.auto = setTimeout(next, 650);
      return;
    }
    s.paused = true;
    $('pzExplainBody').innerHTML = `<div class="pz-verdict ${ok ? 'pos' : 'neg'}">${ok ? '✓ Right' : `✗ ${s.cur.options[s.cur.answer]}`}</div>${s.cur.explain}`;
    $('pzExplain').hidden = false;
    $('pzNext').textContent = !s.cfg.seconds && s.done >= s.cfg.count ? (s.example ? 'Done — now play for real' : 'See results') : 'Next';
  }

  function finish() {
    if (!s) return;
    const run = s;
    stop();
    if (run.example) {   // examples are practice only: no score, no chips
      store.set(`pitboard-example-${run.mode}`, true);
      openSetup(run.mode);
      return;
    }
    const score = run.right - run.wrong;
    const earned = run.right * run.cfg.chips;
    if (earned) PokerUI.addChips(earned);
    const answered = run.right + run.wrong;
    const items = run.log.map((l, i) => `
      <li class="sr-item ${l.ok ? 'ok' : 'bad'}">
        <div class="sr-item-head"><span>${i + 1}. ${l.ok ? '✓' : '✗'}</span><span class="sr-pts">${l.ok ? '+1' : '−1'}</span></div>
        <small>${l.prompt}</small>
        <div class="sr-item-ans"><span>You: <b>${l.given}</b></span>${l.ok ? '' : `<span>Answer: <b>${l.answer}</b></span>`}</div>
      </li>`).join('');
    showSummary({
      board: board(run.mode),
      score,
      title: score >= answered * 0.8 && answered >= 5 ? 'Card shark' : 'Session done',
      again: start,
      bodyHtml: `
        <div class="pz-earned">🪙 +${earned.toLocaleString('en-US')} chips added to your bankroll</div>
        <div class="stat-grid">
          <div><span class="stat-lbl">Right</span><span class="stat-val pos">${run.right}</span></div>
          <div><span class="stat-lbl">Wrong</span><span class="stat-val neg">${run.wrong}</span></div>
          <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${answered ? Math.round((100 * run.right) / answered) + '%' : '—'}</span></div>
        </div>
        <h4>Every answer</h4>
        <ul class="sr-list">${items}</ul>`,
    });
  }

  function quit() {
    if (s && !s.example && !confirm('Quit this session? Chips are only paid at the end.')) return;
    if (s && s.example) store.set(`pitboard-example-${s.mode}`, true);
    stop();
    openSetup(mode);
  }

  // -------------------- INIT --------------------
  $('pzOptions').addEventListener('click', e => {
    const b = e.target.closest('.pz-opt');
    if (b) choose(Number(b.dataset.i));
  });
  $('pzNext').addEventListener('click', next);
  $('pzStart').addEventListener('click', start);
  $('pzExample').addEventListener('click', startExample);
  $('pzQuit').addEventListener('click', quit);
  $('pzLeaders').addEventListener('click', () => openLeadersFor(board(mode)));
  $('pzBack').addEventListener('click', () => goHome());
  document.addEventListener('keydown', e => {
    if (!s || $('pzPlay').hidden) return;
    if (!$('pzExplain').hidden && (e.key === 'Enter' || e.key === ' ')) { next(); e.preventDefault(); return; }
    if (/^[1-5]$/.test(e.key) && Number(e.key) <= s.cur.options.length) { choose(Number(e.key) - 1); e.preventDefault(); }
  });

  return { openSetup, MODES, oddsQuestions, showQuestion, examples };
})();
