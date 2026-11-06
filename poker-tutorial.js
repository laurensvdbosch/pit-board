/* ===========================================================
   PIT BOARD — poker tutorial, basics reference, first-time prompt
   ---------------------------------------------------------
   Lessons (poker-lessons.js) run at the real table through
   PokerUI.startScripted(): this controller shows the coach,
   lets only the right buttons work, and plays the bots' scripted
   moves. Finishing a lesson the first time pays 200 chips.
   =========================================================== */

'use strict';

const PokerTutorial = (() => {
  const LESSONS = PokerLessons.LESSONS;
  const KEY = 'pitboard-tutorial';
  const WELCOME_KEY = 'pitboard-poker-welcome';
  const REWARD = 200;
  const BOT_DELAY = 700;

  let run = null;   // { lesson, i, pending, timer }

  const done = () => store.get(KEY, { done: [] }).done;
  function markDone(id) {
    const d = done();
    if (d.includes(id)) return false;
    d.push(id);
    store.set(KEY, { done: d });
    PokerUI.addChips(REWARD);
    return true;
  }

  // -------------------- LESSON LIST --------------------
  function openList() {
    const d = done();
    $('tutLessons').innerHTML = LESSONS.map((l, k) => `
      <button class="book-row" data-lesson="${l.id}">
        <span class="badge" style="--c:${d.includes(l.id) ? '#4CAF6E' : '#5DB2FF'}">${d.includes(l.id) ? '✓' : `L${k + 1}`}</span>
        <span class="book-name"><b>${l.title}</b><small>${l.blurb}</small></span>
        <span class="book-best ${d.includes(l.id) ? 'dim' : ''}">${d.includes(l.id) ? 'Done' : `+${REWARD}`}<small>${d.includes(l.id) ? 'replay' : 'chips'}</small></span>
      </button>`).join('');
    $('tutProgressLine').textContent = `${d.length} of ${LESSONS.length} lessons done`;
    showScreen('tutList');
  }

  // Exact chance seat 0 beats seat 1 from the flop (used in lesson texts as {EQ})
  function flopEquity(lesson) {
    const p = s => s.map(Poker.parseCard);
    const h = p(lesson.holes[0]), v = p(lesson.holes[1]), b = p(lesson.board.slice(0, 3));
    const used = new Set([...h, ...v, ...b]);
    const rest = [];
    for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
    let w = 0, n = 0;
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
      const f = [...b, rest[i], rest[j]];
      const a = Poker.evaluate([...h, ...f]), c = Poker.evaluate([...v, ...f]);
      w += a > c ? 1 : a === c ? 0.5 : 0;
      n++;
    }
    return Math.round((100 * w) / n);
  }

  function start(id) {
    const base = LESSONS.find(l => l.id === id);
    const needsEq = base.steps.some(s => s.coach && s.coach.includes('{EQ}'));
    const eq = needsEq ? flopEquity(base) : 0;
    const lesson = { ...base, steps: base.steps.map(s => (s.coach ? { ...s, coach: s.coach.replace('{EQ}', eq) } : s)) };
    run = { lesson, i: 0, pending: null, timer: null };
    PokerUI.startScripted({ lesson, script: controller });
  }

  // -------------------- COACH --------------------
  function coach(html, button, onClick) {
    $('pkCoach').hidden = false;
    $('pkCoachText').innerHTML = html;
    const b = $('pkCoachNext');
    b.hidden = !button;
    b.textContent = button || '';
    b.onclick = onClick || null;
  }

  const step = () => run && run.lesson.steps[run.i];

  const controller = {
    // Called by the table after every change
    tick() {
      if (!run) return;
      clearTimeout(run.timer);
      // A bot just acted: show what it did, wait for Next
      if (run.pending) {
        coach(run.pending, 'Next', () => { run.pending = null; controller.tick(); });
        PokerUI.refreshActions();
        return;
      }
      const st = step();
      if (!st) return;
      if (st.end) {
        coach(st.coach, 'Finish lesson', finishLesson);
      } else if (st.bot) {
        coach('<span class="dim">…</span>');
        run.timer = setTimeout(() => {
          run.i++;
          run.pending = st.coach || null;
          PokerUI.scriptAct(st.bot);
        }, BOT_DELAY);
      } else if (st.you) {
        coach(st.coach);
      } else {
        coach(st.coach, 'Next', () => { run.i++; controller.tick(); });
      }
      PokerUI.refreshActions();
    },
    // May the human take this action now?
    allow(type) {
      const st = step();
      if (!st || !st.you || run.pending) return false;
      if (!st.you.includes(type)) {
        coach(`${st.coach}<div class="pk-coach-wrong">${st.wrong || 'Not this time.'}</div>`);
        return false;
      }
      run.i++;
      return true;
    },
    raiseTo() {
      const st = step();
      return st && st.you && st.you.includes('raise') ? st.to : null;
    },
    // Only the button(s) the lesson asks for are active
    decorate(container) {
      const st = step();
      container.querySelectorAll('button[data-a]').forEach(b => {
        const type = b.dataset.a === 'open-raise' ? 'raise' : b.dataset.a;
        const ok = !!(st && st.you && !run.pending && st.you.includes(type));
        b.disabled = !ok;
        b.classList.toggle('pulse', ok);
      });
    },
    quit() {
      if (run) clearTimeout(run.timer);
      run = null;
      $('pkCoach').hidden = true;
      openList();
    },
  };

  function finishLesson() {
    const lesson = run.lesson;
    const first = markDone(lesson.id);
    const k = LESSONS.findIndex(l => l.id === lesson.id);
    const nextLesson = LESSONS[k + 1];
    coach(`🎉 <b>Lesson complete!</b>${first ? ` +${REWARD} chips added to your bankroll.` : ''}`,
      nextLesson ? `Next: ${nextLesson.title}` : 'Back to lessons',
      () => {
        PokerUI.endScripted();
        $('pkCoach').hidden = true;
        run = null;
        if (nextLesson) start(nextLesson.id); else openList();
      });
  }

  // -------------------- POKER BASICS --------------------
  const cards = list => list.map(s => PokerUI.card(Poker.parseCard(s))).join('');
  const RANKINGS = [
    ['Royal flush', ['As', 'Ks', 'Qs', 'Js', 'Ts'], 'A-K-Q-J-10, all the same suit. The best hand there is.', '0.003%'],
    ['Straight flush', ['9h', '8h', '7h', '6h', '5h'], 'Five in a row, all the same suit.', '0.03%'],
    ['Four of a kind', ['Qc', 'Qd', 'Qh', 'Qs', '7d'], 'Four cards of one rank.', '0.17%'],
    ['Full house', ['Jc', 'Jd', 'Js', '4h', '4c'], 'Three of one rank plus a pair. Higher three wins first.', '2.6%'],
    ['Flush', ['Ad', 'Td', '8d', '5d', '3d'], 'Any five of the same suit. Highest card decides between flushes.', '3.0%'],
    ['Straight', ['Tc', '9d', '8s', '7h', '6c'], 'Five in a row, any suits. A can be high (10-J-Q-K-A) or low (A-2-3-4-5).', '4.6%'],
    ['Three of a kind', ['7s', '7h', '7d', 'Kc', '2h'], 'Three cards of one rank.', '4.8%'],
    ['Two pair', ['Ks', 'Kd', '9c', '9h', '5s'], 'Two different pairs. Highest pair first, then the second, then the kicker.', '23.5%'],
    ['Pair', ['Ah', 'Ac', 'Js', '8d', '3c'], 'Two cards of one rank. Ties go to the higher kickers.', '43.8%'],
    ['High card', ['Ks', 'Jh', '9d', '6c', '2s'], 'Nothing else: your highest card plays.', '17.4%'],
  ];

  function openBasics() {
    $('basicsBody').innerHTML = `
      <details open class="howto">
        <summary>Hand rankings — best to worst</summary>
        <div class="bx-rank">
          ${RANKINGS.map(([name, hand, text, freq], k) => `
            <div class="bx-row">
              <div class="bx-head"><b>${k + 1}. ${name}</b><span class="dim">${freq} of hands</span></div>
              <div class="bx-cards">${cards(hand)}</div>
              <small>${text}</small>
            </div>`).join('')}
          <p class="note">You always use the best five of seven cards: your two plus the five on the board. Suits never rank — a tie in everything splits the pot. "% of hands" is how often a 7-card hand ends up exactly this good.</p>
        </div>
      </details>
      <details class="howto">
        <summary>How a hand plays out</summary>
        <ol class="bx-list">
          <li><b>Blinds:</b> the two players left of the dealer button post forced bets: small blind and big blind.</li>
          <li><b>Pre-flop:</b> everyone gets two private cards. Betting starts left of the big blind.</li>
          <li><b>Flop:</b> three community cards. Betting starts left of the button.</li>
          <li><b>Turn:</b> a fourth card, another betting round.</li>
          <li><b>River:</b> the fifth card, last betting round.</li>
          <li><b>Showdown:</b> players still in show their cards; the best five-card hand wins. If everyone else folds earlier, the last player wins without showing.</li>
        </ol>
      </details>
      <details class="howto">
        <summary>Your options when it's your turn</summary>
        <ul class="bx-list">
          <li><b>Fold</b> — give up your cards and anything you've put in.</li>
          <li><b>Check</b> — pass without betting (only when nobody has bet).</li>
          <li><b>Call</b> — match the current bet.</li>
          <li><b>Bet</b> — put chips in when nobody has yet. <b>Raise</b> — bet more than someone else. A raise must be at least as big as the last bet or raise.</li>
          <li><b>All-in</b> — bet everything you have. If you can't cover a bet you can still call all-in; extra chips go to a <b>side pot</b> you can't win.</li>
        </ul>
      </details>
      <details class="howto">
        <summary>Positions at a 6-player table</summary>
        <ul class="bx-list">
          <li><b>SB / BB</b> — small and big blind, left of the button. They act last pre-flop but first after the flop.</li>
          <li><b>UTG</b> ("under the gun") — first to act pre-flop. Play only strong hands.</li>
          <li><b>HJ</b> (hijack) and <b>CO</b> (cutoff) — middle and late seats; you can open more hands.</li>
          <li><b>BTN</b> (button) — acts last after the flop on every street: the best seat. Open the widest here.</li>
        </ul>
      </details>
      <details class="howto">
        <summary>Starting hands guide</summary>
        <ul class="bx-list">
          <li><b>Premium:</b> AA, KK, QQ, AK — raise from anywhere.</li>
          <li><b>Strong:</b> JJ, TT, AQ, AJ suited, KQ suited — raise from most seats.</li>
          <li><b>Playable:</b> 99–22, suited aces (A9s–A2s), KJs, QJs, JTs, T9s, 98s, KQo, AJo — fine from middle and late seats.</li>
          <li><b>Late seats only:</b> suited connectors (87s, 76s, 65s), K9s, Q9s, ATo, KJo, QJo.</li>
          <li>Almost everything else: <b>fold</b>. From early seats you play roughly 1 hand in 6; from the button about 2 in 5.</li>
        </ul>
      </details>
      <details class="howto">
        <summary>Outs & pot odds cheat sheet</summary>
        <div class="table-wrap">
          <table class="book-table">
            <thead><tr><th>Draw</th><th>Outs</th><th>Next card</th><th>By river</th></tr></thead>
            <tbody>
              <tr><td>Flush draw</td><td>9</td><td>19%</td><td>35%</td></tr>
              <tr><td>Open-ended straight</td><td>8</td><td>17%</td><td>31%</td></tr>
              <tr><td>Gutshot straight</td><td>4</td><td>9%</td><td>17%</td></tr>
              <tr><td>Two overcards</td><td>6</td><td>13%</td><td>24%</td></tr>
              <tr><td>Flush + straight draw</td><td>15</td><td>33%</td><td>54%</td></tr>
              <tr><td>Set → full house or quads</td><td>7</td><td>15%</td><td>33%</td></tr>
            </tbody>
          </table>
        </div>
        <ul class="bx-list">
          <li><b>Rule of 2 and 4:</b> outs × 4 ≈ % by the river (from the flop), outs × 2 ≈ % on the next card.</li>
          <li><b>Pot odds:</b> call ÷ (pot after your call). Facing 50 into 100: 50 ÷ 200 = 25%. Call if you win more often than that.</li>
          <li>The table shows this price for you whenever you face a bet.</li>
        </ul>
      </details>
      <details class="howto">
        <summary>Glossary</summary>
        <ul class="bx-list">
          <li><b>Board</b> — the community cards. <b>Hole cards</b> — your two private cards.</li>
          <li><b>Kicker</b> — the side card that breaks ties, e.g. A-K vs K-J on a K-high board.</li>
          <li><b>Nuts</b> — the best possible hand on this board.</li>
          <li><b>Draw</b> — a hand that needs another card to become strong (flush draw, straight draw).</li>
          <li><b>Outs</b> — the cards that complete your draw.</li>
          <li><b>Value bet</b> — betting a strong hand so worse hands pay you. <b>Bluff</b> — betting a weak hand so better hands fold.</li>
          <li><b>Equity</b> — your share of the pot if all cards were dealt out, i.e. your chance to win.</li>
        </ul>
      </details>`;
    showScreen('pkBasics');
  }

  // -------------------- HUB BITS & FIRST-TIME PROMPT --------------------
  function renderHubBits() {
    const d = done().length;
    $('tutHubNote').textContent = d >= LESSONS.length ? 'All lessons done — replay any time' : `${LESSONS.length} guided hands · ${d}/${LESSONS.length} done · +${REWARD} chips each`;
  }

  function maybeWelcome() {
    renderHubBits();
    if (store.get(WELCOME_KEY, false)) return;
    $('pkWelcome').hidden = false;
  }

  function closeWelcome(then) {
    store.set(WELCOME_KEY, true);
    $('pkWelcome').hidden = true;
    if (then) then();
  }

  // -------------------- INIT --------------------
  $('tutLessons').addEventListener('click', e => {
    const row = e.target.closest('[data-lesson]');
    if (row) start(row.dataset.lesson);
  });
  $('tutBack').addEventListener('click', () => goHome());
  $('basicsBack').addEventListener('click', () => goHome());
  $('tutBasicsLink').addEventListener('click', openBasics);
  $('pkWelcomeTutorial').addEventListener('click', () => closeWelcome(openList));
  $('pkWelcomeBasics').addEventListener('click', () => closeWelcome(openBasics));
  $('pkWelcomeSkip').addEventListener('click', () => closeWelcome());

  return { openList, openBasics, maybeWelcome, renderHubBits };
})();
